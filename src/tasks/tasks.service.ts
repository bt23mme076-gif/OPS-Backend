import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { eq, and, or, sql, desc } from 'drizzle-orm';
import { DB } from '../database/database.module';
import { tasks, users } from '../../drizzle/schema';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(@Inject(DB) private db: any) {}

  async getTasksForRole(user: any) {
    let query = this.db
      .select({
        id:          tasks.id,
        title:       tasks.title,
        description: tasks.description,
        status:      tasks.status,
        priority:    tasks.priority,
        squad:       tasks.squad,
        dueDate:     tasks.dueDate,
        proofLink:   tasks.proofLink,
        feedback:    tasks.feedback,
        createdAt:   tasks.createdAt,
        assignedTo: {
          id:   users.id,
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

    return query.orderBy(desc(tasks.createdAt));
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

    return updated;
  }

  async delete(id: string) {
    await this.db.delete(tasks).where(eq(tasks.id, id));
    return { success: true };
  }
}

}
