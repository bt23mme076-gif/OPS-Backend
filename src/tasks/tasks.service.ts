import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DB } from '../database/database.module';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

// Maps DB snake_case columns → frontend camelCase shape
function toFrontend(t: any) {
  if (!t) return t;
  return {
    id:          t.id,
    title:       t.title,
    description: t.description,
    status:      t.status,
    priority:    t.priority,
    dueAt:       t.due_date,          // due_date → dueAt
    completedAt: t.completed_at,
    assignedToId: t.assigned_to,
    assignedTo:  t.assigned_to_name ? {
      id:        t.assigned_to,
      name:      t.assigned_to_name,
      avatarUrl: t.assigned_to_avatar,
    } : null,
    createdById: t.created_by,
    createdAt:   t.created_at,
    updatedAt:   t.updated_at,
  };
}

@Injectable()
export class TasksService {
  constructor(@Inject(DB) private db: any) {}

  async findAll(query?: { status?: string; assignedTo?: string }) {
    let where = 'WHERE 1=1';
    if (query?.status)     where += ` AND t.status = '${query.status}'`;
    if (query?.assignedTo) where += ` AND t.assigned_to = '${query.assignedTo}'`;

    const result = await this.db.execute(sql`
      SELECT t.*,
        u.name as assigned_to_name,
        u.avatar_url as assigned_to_avatar
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      ORDER BY
        CASE t.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
        t.created_at DESC
    `);

    const rows = result.rows ?? result;
    const filtered = rows.filter((r: any) => {
      if (query?.status && r.status !== query.status) return false;
      if (query?.assignedTo && r.assigned_to !== query.assignedTo) return false;
      return true;
    });

    return filtered.map(toFrontend);
  }

  async getMyTasks(userId: string) {
    const result = await this.db.execute(sql`
      SELECT t.*,
        u.name as assigned_to_name,
        u.avatar_url as assigned_to_avatar
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      WHERE t.assigned_to = ${userId}
      ORDER BY t.created_at DESC
    `);
    const rows = result.rows ?? result;
    return rows.map(toFrontend);
  }

  async findOne(id: string) {
    const result = await this.db.execute(sql`
      SELECT t.*, u.name as assigned_to_name, u.avatar_url as assigned_to_avatar
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      WHERE t.id = ${id}
      LIMIT 1
    `);
    const rows = result.rows ?? result;
    if (!rows.length) throw new NotFoundException('Task not found');
    return toFrontend(rows[0]);
  }

  async create(dto: CreateTaskDto, createdBy: string) {
    const result = await this.db.execute(sql`
      INSERT INTO tasks (title, description, status, priority, assigned_to, created_by, due_date)
      VALUES (
        ${dto.title},
        ${dto.description ?? null},
        ${dto.status ?? 'todo'},
        ${dto.priority ?? 'medium'},
        ${dto.assignedToId ?? null},
        ${createdBy},
        ${dto.dueAt ? new Date(dto.dueAt) : null}
      )
      RETURNING *
    `);
    const rows = result.rows ?? result;
    return toFrontend(rows[0]);
  }

  async update(id: string, dto: UpdateTaskDto, updatedBy: string) {
    const sets: string[] = ['updated_at = now()'];
    if (dto.title !== undefined)       sets.push(`title = '${dto.title}'`);
    if (dto.description !== undefined) sets.push(`description = ${dto.description ? `'${dto.description}'` : 'NULL'}`);
    if (dto.status !== undefined)      sets.push(`status = '${dto.status}'`);
    if (dto.priority !== undefined)    sets.push(`priority = '${dto.priority}'`);
    if (dto.assignedToId !== undefined) sets.push(`assigned_to = ${dto.assignedToId ? `'${dto.assignedToId}'` : 'NULL'}`);
    if (dto.dueAt !== undefined)       sets.push(`due_date = ${dto.dueAt ? `'${dto.dueAt}'` : 'NULL'}`);
    if (dto.status === 'done')         sets.push(`completed_at = now()`);

    const result = await this.db.execute(sql`
      UPDATE tasks SET ${sql.raw(sets.join(', '))}
      WHERE id = ${id}
      RETURNING *
    `);
    const rows = result.rows ?? result;
    if (!rows.length) throw new NotFoundException('Task not found');
    return toFrontend(rows[0]);
  }

  async delete(id: string) {
    await this.db.execute(sql`DELETE FROM tasks WHERE id = ${id}`);
    return { success: true };
  }
}
