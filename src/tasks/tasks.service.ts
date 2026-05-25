import { Injectable, Inject, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { eq, desc } from 'drizzle-orm';
import { DB } from '../database/database.module';
import { tasks, users, taskActivities, notifications } from '../../drizzle/schema';
import { MailService } from '../mail/mail.service';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @Inject(DB) private db: any,
    private mailService: MailService,
  ) {}

  async getTasksForRole(user: any) {
    let query = this.db
      .select({
        task: tasks,
        user: {
          id: users.id,
          name: users.name,
        },
      })
      .from(tasks)
      .leftJoin(users, eq(tasks.assignedToId, users.id));

    if (user.viewMode === 'mine' || user.role === 'INTERN') {
      query = query.where(eq(tasks.assignedToId, user.id));
    } else if (user.role === 'MANAGER') {
      query = query.where(eq(tasks.squad, user.squad));
    }

    const rows = await query.orderBy(desc(tasks.createdAt));

    return rows.map((r) => ({
      ...r.task,
      assignedTo: r.user ? { id: r.user.id, name: r.user.name } : null,
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

    try {
      await this.db.insert(taskActivities).values({
        taskId: task.id,
        performedBy: user.id,
        action: 'CREATED',
        metadata: { dto },
        createdAt: new Date().toISOString(),
      });
    } catch (e) {
      this.logger.warn(`Activity log skipped (create): ${e?.message}`);
    }

    if (dto.assignedToId) {
      this.createTaskAssignmentNotifications(task, dto.assignedToId, user).catch((err) =>
        this.logger.warn(`Task assignment notification failed: ${err?.message}`)
      );

      this.sendTaskAssignmentEmail(task, dto.assignedToId).catch((err) =>
        this.logger.warn(`Task assignment email failed: ${err?.message}`)
      );
    }

    return task;
  }

  private formatDate(value?: string) {
    if (!value) return 'Not set';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private async getUserById(userId: string) {
    const [user] = await this.db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        squad: users.squad,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return user;
  }

  private async createTaskAssignmentNotifications(task: any, assignedToId: string, assigner: any) {
    const assignee = await this.getUserById(assignedToId);
    const assignedBy = await this.getUserById(assigner.id);

    if (!assignee) {
      this.logger.warn(`Task assignment notification skipped: no assignee found for id=${assignedToId}`);
      return;
    }

    const assignedByName = assignedBy?.name ?? assigner?.name ?? 'Manager';
    const assignedToName = assignee.name ?? 'Intern';
    const dueDate = this.formatDate(task.dueDate);
    const priority = task.priority ?? 'MEDIUM';
    const squad = task.squad ?? assignee.squad ?? 'N/A';

    const now = new Date().toISOString();

    const notificationRows = [
      {
        userId: assignedToId,
        type: 'card_assigned',
        title: `New task assigned: ${task.title}`,
        message: `Assigned by ${assignedByName}. Priority: ${priority}. Squad: ${squad}. Due: ${dueDate}.`,
        metadata: {
          taskId: task.id,
          taskTitle: task.title,
          assignedById: assigner.id,
          assignedByName,
          assignedToId,
          assignedToName,
          priority,
          squad,
          dueDate: task.dueDate,
          notificationFor: 'assignee',
        },
        isRead: false,
        createdAt: now,
      },
      {
        userId: assigner.id,
        type: 'card_assigned',
        title: `Task assigned to ${assignedToName}`,
        message: `You assigned "${task.title}" to ${assignedToName}. Priority: ${priority}. Squad: ${squad}. Due: ${dueDate}.`,
        metadata: {
          taskId: task.id,
          taskTitle: task.title,
          assignedById: assigner.id,
          assignedByName,
          assignedToId,
          assignedToName,
          priority,
          squad,
          dueDate: task.dueDate,
          notificationFor: 'assigner',
        },
        isRead: false,
        createdAt: now,
      },
    ];

    await this.db.insert(notifications).values(notificationRows);
  }

  private async sendTaskAssignmentEmail(task: any, assignedToId: string) {
    const [assignee] = await this.db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, assignedToId))
      .limit(1);

    if (!assignee?.email) {
      this.logger.warn(`Task assignment email skipped: no user found for id=${assignedToId}`);
      return;
    }

    await this.mailService.sendTaskAssigned(
      assignee.email,
      assignee.name,
      task.title,
      task.priority,
      task.squad,
      task.dueDate,
    );
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

    try {
      await this.db.insert(taskActivities).values({
        taskId: updated.id,
        performedBy: user.id,
        action: dto.status && task.status !== dto.status ? 'STATUS_CHANGED' : 'UPDATED',
        metadata: { changes: dto, previousStatus: task.status },
        createdAt: new Date().toISOString(),
      });
    } catch (e) {
      this.logger.warn(`Activity log skipped (update): ${e?.message}`);
    }

    return updated;
  }

  async approve(id: string, user: any) {
    if (user.role === 'INTERN') throw new ForbiddenException();

    const [task] = await this.db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    if (!task) throw new NotFoundException();

    if (user.role === 'MANAGER' && task.squad !== user.squad) throw new ForbiddenException();

    const [updated] = await this.db
      .update(tasks)
      .set({
        status: 'DONE',
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(tasks.id, id))
      .returning();

    try {
      await this.db.insert(taskActivities).values({
        taskId: updated.id,
        performedBy: user.id,
        action: 'APPROVED',
        metadata: {},
        createdAt: new Date().toISOString(),
      });
    } catch (e) {
      this.logger.warn(`Activity log skipped (approve): ${e?.message}`);
    }

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

    try {
      await this.db.insert(taskActivities).values({
        taskId: updated.id,
        performedBy: user.id,
        action: 'FEEDBACK_ADDED',
        metadata: { feedback },
        createdAt: new Date().toISOString(),
      });
    } catch (e) {
      this.logger.warn(`Activity log skipped (feedback): ${e?.message}`);
    }

    return updated;
  }

  async delete(id: string, user?: any) {
    await this.db.delete(tasks).where(eq(tasks.id, id));
    return { success: true };
  }
}