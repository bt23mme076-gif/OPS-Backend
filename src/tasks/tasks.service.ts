import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { eq, and, or, sql, desc } from 'drizzle-orm';
import { DB } from '../database/database.module';
import { tasks, users, taskActivities } from '../../drizzle/schema';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(@Inject(DB) private db: any) {}

  async getTasksForRole(user: any) {
    let query = this.db
      .select({
        task: tasks,
        user: {
          id: users.id,
          name: users.name,
        }
      })
      .from(tasks)
      .leftJoin(users, eq(tasks.assignedToId, users.id));

    if (user.viewMode === 'mine' || user.role === 'INTERN') {
      query = query.where(eq(tasks.assignedToId, user.id));
    } else if (user.role === 'MANAGER') {
      query = query.where(eq(tasks.squad, user.squad));
    }
    // SUPER_ADMIN sees all

    const rows = await query.orderBy(desc(tasks.createdAt));
    
    return rows.map(r => ({
      ...r.task,
      assignedTo: r.user ? { id: r.user.id, name: r.user.name } : null
    }));
  }

  async findOne(id: string) {
    const [task] = await this.db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async create(dto: any, user: any) {
    if (user.role === 'MANAGER') {
       dto.squad = user.squad;
    }

    const [task] = await this.db.insert(tasks).values({
      ...dto,
      assignedById: user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).returning();

    await this.db.insert(taskActivities).values({
      taskId: task.id,
      performedBy: user.id,
      action: 'CREATED',
      metadata: { dto },
      createdAt: new Date().toISOString()
    });

    return task;
  }

  async update(id: string, dto: any, user: any) {
    const [task] = await this.db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    if (!task) throw new NotFoundException('Task not found');

    if (user.role === 'MANAGER' && task.squad !== user.squad) {
       throw new ForbiddenException('You can only update tasks in your squad');
    }

    if (user.role === 'INTERN' && task.assignedToId !== user.id) {
       throw new ForbiddenException('You can only update your own tasks');
    }

    const [updated] = await this.db
      .update(tasks)
      .set({ ...dto, updatedAt: new Date().toISOString() })
      .where(eq(tasks.id, id))
      .returning();

    await this.db.insert(taskActivities).values({
      taskId: updated.id,
      performedBy: user.id,
      action: dto.status && task.status !== dto.status ? 'STATUS_CHANGED' : 'UPDATED',
      metadata: { changes: dto, previousStatus: task.status },
      createdAt: new Date().toISOString()
    });

    return updated;
  }

  async approve(id: string, user: any) {
    if (user.role === 'INTERN') throw new ForbiddenException();

    const [task] = await this.db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    if (!task) throw new NotFoundException();

    if (user.role === 'MANAGER' && task.squad !== user.squad) throw new ForbiddenException();

    const [updated] = await this.db
      .update(tasks)
      .set({ status: 'DONE', completedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      .where(eq(tasks.id, id))
      .returning();

    await this.db.insert(taskActivities).values({
      taskId: updated.id,
      performedBy: user.id,
      action: 'APPROVED',
      metadata: {},
      createdAt: new Date().toISOString()
    });

    return updated;
  }

  async addFeedback(id: string, feedback: string, user: any) {
    if (user.role === 'INTERN') throw new ForbiddenException();

    const [task] = await this.db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    if (!task) throw new NotFoundException();

    if (user.role === 'MANAGER' && task.squad !== user.squad) throw new ForbiddenException();

    const [updated] = await this.db
      .update(tasks)
      .set({ feedback, updatedAt: new Date().toISOString() })
      .where(eq(tasks.id, id))
      .returning();

    await this.db.insert(taskActivities).values({
      taskId: updated.id,
      performedBy: user.id,
      action: 'FEEDBACK_ADDED',
      metadata: { feedback },
      createdAt: new Date().toISOString()
    });

    return updated;
  }

  async delete(id: string, user?: any) {
    await this.db.delete(tasks).where(eq(tasks.id, id));
    // taskActivities cascade on delete, so no need to explicitly delete them.
    return { success: true };
  }
}
