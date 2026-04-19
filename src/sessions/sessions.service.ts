import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, desc, and } from 'drizzle-orm';
import { DB } from '../database/database.module';
import { sessions, mentors, students } from '../../drizzle/schema';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';

function toFrontend(s: any) {
  if (!s) return s;
  return {
    id:          s.id,
    studentId:   s.studentId,
    mentorId:    s.mentorId,
    type:        s.sessionType,   // map sessionType → type
    format:      s.format,
    status:      s.status,
    scheduledAt: s.scheduledAt,
    meetLink:    s.meetLink,
    notes:       s.notes,
    studentRating:        s.studentRating,
    outcomeRating90Day:   s.outcomeRating90Day,
    student: s.student ? {
      id:       s.student.id,
      name:     s.student.fullName,
      grade:    s.student.branch,
    } : null,
    mentor: s.mentor ? {
      id:      s.mentor.id,
      name:    s.mentor.fullName,
      company: s.mentor.currentCompany,
    } : null,
    createdAt: s.createdAt,
  };
}

@Injectable()
export class SessionsService {
  constructor(@Inject(DB) private db: any) {}

  async findAll(query?: { status?: string; mentorId?: string; studentId?: string }) {
    const conditions = [];
    if (query?.status)    conditions.push(eq(sessions.status, query.status as any));
    if (query?.mentorId)  conditions.push(eq(sessions.mentorId, query.mentorId));
    if (query?.studentId) conditions.push(eq(sessions.studentId, query.studentId));

    const rows = await this.db
      .select({
        id: sessions.id,
        studentId: sessions.studentId,
        mentorId: sessions.mentorId,
        sessionType: sessions.sessionType,
        format: sessions.format,
        scheduledAt: sessions.scheduledAt,
        status: sessions.status,
        meetLink: sessions.meetLink,
        notes: sessions.notes,
        studentRating: sessions.studentRating,
        outcomeRating90Day: sessions.outcomeRating90Day,
        createdAt: sessions.createdAt,
        student: {
          id: students.id,
          fullName: students.fullName,
          branch: students.branch,
        },
        mentor: {
          id: mentors.id,
          fullName: mentors.fullName,
          currentCompany: mentors.currentCompany,
        },
      })
      .from(sessions)
      .leftJoin(mentors, eq(sessions.mentorId, mentors.id))
      .leftJoin(students, eq(sessions.studentId, students.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(sessions.scheduledAt));

    return rows.map(toFrontend);
  }

  async findOne(id: string) {
    const [session] = await this.db.select().from(sessions)
      .where(eq(sessions.id, id)).limit(1);
    if (!session) throw new NotFoundException('Session not found');
    return toFrontend(session);
  }

  async create(dto: CreateSessionDto, createdBy: string) {
    const [session] = await this.db.insert(sessions).values({
      studentId:   dto.studentId,
      mentorId:    dto.mentorId,
      sessionType: dto.type as any,   // map type → sessionType
      format:      dto.format as any,
      scheduledAt: new Date(dto.scheduledAt),
      meetLink:    dto.meetLink,
      notes:       dto.notes,
      createdBy,
    }).returning();

    return toFrontend(session);
  }

  async update(id: string, dto: UpdateSessionDto) {
    const updateData: any = { updatedAt: new Date().toISOString() };
    if (dto.status !== undefined)             updateData.status = dto.status;
    if (dto.meetLink !== undefined)           updateData.meetLink = dto.meetLink;
    if (dto.notes !== undefined)              updateData.notes = dto.notes;
    if (dto.studentRating !== undefined)      updateData.studentRating = dto.studentRating;
    if (dto.outcomeRating90Day !== undefined) updateData.outcomeRating90Day = dto.outcomeRating90Day;

    const [updated] = await this.db.update(sessions)
      .set(updateData).where(eq(sessions.id, id)).returning();
    if (!updated) throw new NotFoundException('Session not found');
    return toFrontend(updated);
  }
}
