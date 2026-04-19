import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, desc, ilike, and, or } from 'drizzle-orm';
import { DB } from '../database/database.module';
import { students, pipelineActivities } from '../../drizzle/schema';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';

function toFrontend(s: any) {
  if (!s) return s;
  return {
    id:              s.id,
    name:            s.fullName,
    email:           s.email,
    phone:           s.phone,
    parentName:      s.notes?.match(/^Parent: (.+)$/m)?.[1] ?? null,
    grade:           s.branch ?? null,
    source:          s.source,
    stage:           s.stage,
    placementStatus: s.placementStatus,
    assignedTo:      s.assignedTo,
    notes:           s.notes,
    createdAt:       s.createdAt,
    updatedAt:       s.updatedAt,
  };
}

@Injectable()
export class StudentsService {
  constructor(@Inject(DB) private db: any) {}

  async findAll(query?: { stage?: string; domain?: string; search?: string; assignedTo?: string; placementStatus?: string }) {
    const conditions = [];
    if (query?.stage)           conditions.push(eq(students.stage, query.stage as any));
    if (query?.domain)          conditions.push(eq(students.targetDomain, query.domain as any));
    if (query?.assignedTo)      conditions.push(eq(students.assignedTo, query.assignedTo));
    if (query?.placementStatus) conditions.push(eq(students.placementStatus, query.placementStatus as any));
    if (query?.search) {
      conditions.push(or(
        ilike(students.fullName, `%${query.search}%`),
        ilike(students.collegeName, `%${query.search}%`),
        ilike(students.targetRole, `%${query.search}%`),
      ));
    }

    const rows = await this.db.select().from(students)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(students.lastActivityAt));

    return rows.map(toFrontend);
  }

  async findOne(id: string) {
    const [student] = await this.db.select().from(students)
      .where(eq(students.id, id)).limit(1);
    if (!student) throw new NotFoundException('Student not found');
    return toFrontend(student);
  }

  async create(dto: CreateStudentDto, createdBy: string) {
    // Store parentName in notes with a prefix since there's no parentName column
    let notes = dto.notes ?? '';
    if (dto.parentName) notes = `Parent: ${dto.parentName}\n${notes}`.trim();

    const [student] = await this.db.insert(students).values({
      fullName:  dto.name,
      email:     dto.email,
      phone:     dto.phone,
      branch:    dto.grade,     // reuse branch for grade (closest match)
      source:    dto.source as any,
      notes,
      createdBy,
    }).returning();

    await this.db.insert(pipelineActivities).values({
      entityType: 'student', entityId: student.id,
      activityType: 'created', performedBy: createdBy,
      metadata: { name: dto.name },
      createdAt: new Date().toISOString(),
    });

    return toFrontend(student);
  }

  async update(id: string, dto: UpdateStudentDto, updatedBy: string) {
    const updateData: any = { updatedAt: new Date().toISOString() };
    if (dto.name !== undefined)   updateData.fullName = dto.name;
    if (dto.email !== undefined)  updateData.email    = dto.email;
    if (dto.phone !== undefined)  updateData.phone    = dto.phone;
    if (dto.grade !== undefined)  updateData.branch   = dto.grade;
    if (dto.source !== undefined) updateData.source   = dto.source;
    if (dto.notes !== undefined)  updateData.notes    = dto.notes;
    if (dto.stage !== undefined)  updateData.stage    = dto.stage;

    const [updated] = await this.db.update(students)
      .set(updateData).where(eq(students.id, id)).returning();
    if (!updated) throw new NotFoundException('Student not found');

    await this.db.insert(pipelineActivities).values({
      entityType: 'student', entityId: id,
      activityType: 'field_updated', performedBy: updatedBy,
      createdAt: new Date().toISOString(),
    });

    return toFrontend(updated);
  }

  async updateStage(id: string, stage: string, updatedBy: string) {
    const [updated] = await this.db.update(students)
      .set({ stage: stage as any, lastActivityAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      .where(eq(students.id, id)).returning();
    if (!updated) throw new NotFoundException('Student not found');

    await this.db.insert(pipelineActivities).values({
      entityType: 'student', entityId: id,
      activityType: 'stage_changed', performedBy: updatedBy,
      metadata: { newStage: stage },
      createdAt: new Date().toISOString(),
    });

    return toFrontend(updated);
  }

  async assign(id: string, assignToId: string, updatedBy: string) {
    const [updated] = await this.db.update(students)
      .set({ assignedTo: assignToId, updatedAt: new Date().toISOString() })
      .where(eq(students.id, id)).returning();
    if (!updated) throw new NotFoundException('Student not found');
    return toFrontend(updated);
  }

  async addNote(id: string, note: string, updatedBy: string) {
    const [existing] = await this.db.select().from(students).where(eq(students.id, id)).limit(1);
    if (!existing) throw new NotFoundException('Student not found');

    const newNotes = existing.notes ? `${existing.notes}\n\n${note}` : note;
    const [updated] = await this.db.update(students)
      .set({ notes: newNotes, lastActivityAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      .where(eq(students.id, id)).returning();

    await this.db.insert(pipelineActivities).values({
      entityType: 'student', entityId: id,
      activityType: 'note_added', performedBy: updatedBy,
      createdAt: new Date().toISOString(),
    });

    return toFrontend(updated);
  }
}
