import {
  Injectable, Inject, NotFoundException,
} from '@nestjs/common';
import { eq, desc, ilike, and, or } from 'drizzle-orm';
import { DB } from '../database/database.module';
import { mentors, pipelineActivities, users } from '../../drizzle/schema';
import { CreateMentorDto } from './dto/create-mentor.dto';
import { UpdateMentorDto } from './dto/update-mentor.dto';

// Maps DB row (fullName, currentCompany etc.) → frontend shape (name, company etc.)
function toFrontend(m: any) {
  if (!m) return m;
  return {
    id:         m.id,
    name:       m.fullName,
    email:      m.email,
    phone:      m.phone,
    linkedin:   m.linkedinUrl,
    company:    m.currentCompany,
    domain:     m.domain,
    source:     m.source,
    stage:      m.stage,
    status:     m.status,
    notes:      m.notes,
    assignedTo: m.assignedTo,
    createdAt:  m.createdAt,
    updatedAt:  m.updatedAt,
  };
}

@Injectable()
export class MentorsService {
  constructor(@Inject(DB) private db: any) {}

  async findAll(query?: { stage?: string; domain?: string; search?: string; assignedTo?: string }) {
    const conditions = [];
    if (query?.stage)      conditions.push(eq(mentors.stage, query.stage as any));
    if (query?.domain)     conditions.push(eq(mentors.domain, query.domain as any));
    if (query?.assignedTo) conditions.push(eq(mentors.assignedTo, query.assignedTo));
    if (query?.search) {
      conditions.push(or(
        ilike(mentors.fullName, `%${query.search}%`),
        ilike(mentors.currentCompany, `%${query.search}%`),
        ilike(mentors.collegeName, `%${query.search}%`),
      ));
    }

    const rows = await this.db.select().from(mentors)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(mentors.lastActivityAt));

    return rows.map(toFrontend);
  }

  async findOne(id: string) {
    const [mentor] = await this.db.select().from(mentors)
      .where(eq(mentors.id, id)).limit(1);
    if (!mentor) throw new NotFoundException('Mentor not found');
    return toFrontend(mentor);
  }

  async create(dto: CreateMentorDto, createdBy: string) {
    const [mentor] = await this.db.insert(mentors).values({
      fullName:       dto.name,
      email:          dto.email,
      phone:          dto.phone,
      linkedinUrl:    dto.linkedin,
      currentCompany: dto.company,
      domain:         dto.domain as any,
      source:         dto.source as any,
      notes:          dto.notes,
      createdBy,
    }).returning();

    await this.db.insert(pipelineActivities).values({
      entityType:   'mentor',
      entityId:     mentor.id,
      activityType: 'created',
      performedBy:  createdBy,
      metadata:     { name: dto.name },
    });

    return toFrontend(mentor);
  }

  async update(id: string, dto: UpdateMentorDto, updatedBy: string) {
    const updateData: any = { updatedAt: new Date().toISOString() };
    if (dto.name !== undefined)    updateData.fullName       = dto.name;
    if (dto.email !== undefined)   updateData.email          = dto.email;
    if (dto.phone !== undefined)   updateData.phone          = dto.phone;
    if (dto.linkedin !== undefined) updateData.linkedinUrl   = dto.linkedin;
    if (dto.company !== undefined) updateData.currentCompany = dto.company;
    if (dto.domain !== undefined)  updateData.domain         = dto.domain;
    if (dto.source !== undefined)  updateData.source         = dto.source;
    if (dto.notes !== undefined)   updateData.notes          = dto.notes;
    if (dto.stage !== undefined)   updateData.stage          = dto.stage;

    const [updated] = await this.db.update(mentors)
      .set(updateData).where(eq(mentors.id, id)).returning();
    if (!updated) throw new NotFoundException('Mentor not found');

    await this.db.insert(pipelineActivities).values({
      entityType: 'mentor', entityId: id,
      activityType: 'field_updated', performedBy: updatedBy,
    });

    return toFrontend(updated);
  }

  async updateStage(id: string, stage: string, updatedBy: string) {
    const [updated] = await this.db.update(mentors)
      .set({ stage: stage as any, lastActivityAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      .where(eq(mentors.id, id)).returning();
    if (!updated) throw new NotFoundException('Mentor not found');

    await this.db.insert(pipelineActivities).values({
      entityType: 'mentor', entityId: id,
      activityType: 'stage_changed', performedBy: updatedBy,
      metadata: { newStage: stage },
    });

    return toFrontend(updated);
  }

  async assign(id: string, assignToId: string, updatedBy: string) {
    const [updated] = await this.db.update(mentors)
      .set({ assignedTo: assignToId, updatedAt: new Date().toISOString() })
      .where(eq(mentors.id, id)).returning();
    if (!updated) throw new NotFoundException('Mentor not found');

    await this.db.insert(pipelineActivities).values({
      entityType: 'mentor', entityId: id,
      activityType: 'assigned', performedBy: updatedBy,
      metadata: { assignedTo: assignToId },
    });

    return toFrontend(updated);
  }

  async addNote(id: string, note: string, updatedBy: string) {
    const [existing] = await this.db.select().from(mentors).where(eq(mentors.id, id)).limit(1);
    if (!existing) throw new NotFoundException('Mentor not found');

    const newNotes = existing.notes ? `${existing.notes}\n\n${note}` : note;
    const [updated] = await this.db.update(mentors)
      .set({ notes: newNotes, lastActivityAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      .where(eq(mentors.id, id)).returning();

    await this.db.insert(pipelineActivities).values({
      entityType: 'mentor', entityId: id,
      activityType: 'note_added', performedBy: updatedBy,
    });

    return toFrontend(updated);
  }
}
