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

  private parseFeedback(feedback?: string | null) {
    if (!feedback) return {};

    try {
      const parsed = JSON.parse(feedback);
      if (parsed && typeof parsed === 'object') return parsed;
      return {};
    } catch {
      return {};
    }
  }

  private stringifyFeedback(data: any) {
    return JSON.stringify(data ?? {});
  }

  private enrichTask(task: any) {
    const feedbackData = this.parseFeedback(task?.feedback);

    return {
      ...task,
      submissionPrLink: feedbackData.submissionPrLink ?? task?.proofLink ?? null,
      submissionDocLink: feedbackData.submissionDocLink ?? null,
      submissionSummary: feedbackData.submissionSummary ?? null,
      submissionBlockers: feedbackData.submissionBlockers ?? null,
      submittedAt: feedbackData.submittedAt ?? null,
      reviewStatus: feedbackData.reviewStatus ?? null,
      reviewFeedback: feedbackData.reviewFeedback ?? null,
      reviewedAt: feedbackData.reviewedAt ?? null,
    };
  }

  private buildSafeUpdatePayload(dto: any, existingTask: any) {
    const allowed: any = {};
    const currentFeedback = this.parseFeedback(existingTask?.feedback);

    if (dto.title !== undefined) allowed.title = dto.title;
    if (dto.description !== undefined) allowed.description = dto.description;
    if (dto.status !== undefined) allowed.status = dto.status;
    if (dto.priority !== undefined) allowed.priority = dto.priority;
    if (dto.assignedToId !== undefined) allowed.assignedToId = dto.assignedToId;
    if (dto.dueDate !== undefined) allowed.dueDate = dto.dueDate;
    if (dto.squad !== undefined) allowed.squad = dto.squad;
    if (dto.proofLink !== undefined) allowed.proofLink = dto.proofLink;

    const hasSubmissionData =
      dto.submissionPrLink !== undefined ||
      dto.submissionDocLink !== undefined ||
      dto.submissionSummary !== undefined ||
      dto.submissionBlockers !== undefined ||
      dto.submittedAt !== undefined ||
      dto.reviewStatus !== undefined ||
      dto.reviewFeedback !== undefined ||
      dto.reviewedAt !== undefined;

    if (hasSubmissionData) {
      const nextFeedback = {
        ...currentFeedback,
        submissionPrLink: dto.submissionPrLink ?? currentFeedback.submissionPrLink ?? allowed.proofLink ?? existingTask?.proofLink ?? '',
        submissionDocLink: dto.submissionDocLink ?? currentFeedback.submissionDocLink ?? '',
        submissionSummary: dto.submissionSummary ?? currentFeedback.submissionSummary ?? '',
        submissionBlockers: dto.submissionBlockers ?? currentFeedback.submissionBlockers ?? '',
        submittedAt: dto.submittedAt ?? currentFeedback.submittedAt ?? '',
        reviewStatus: dto.reviewStatus ?? currentFeedback.reviewStatus ?? '',
        reviewFeedback: dto.reviewFeedback ?? currentFeedback.reviewFeedback ?? '',
        reviewedAt: dto.reviewedAt ?? currentFeedback.reviewedAt ?? '',
      };

      allowed.feedback = this.stringifyFeedback(nextFeedback);

      if (dto.submissionPrLink !== undefined) {
        allowed.proofLink = dto.submissionPrLink;
      }
    } else if (dto.feedback !== undefined) {
      const nextFeedback = {
        ...currentFeedback,
        reviewFeedback: dto.feedback,
      };

      allowed.feedback = this.stringifyFeedback(nextFeedback);
    }

    allowed.updatedAt = new Date().toISOString();
    return allowed;
  }

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
      ...this.enrichTask(r.task),
      assignedTo: r.user ? { id: r.user.id, name: r.user.name } : null,
    }));
  }

  async findOne(id: string) {
    const [task] = await this.db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    if (!task) throw new NotFoundException('Task not found');
    return this.enrichTask(task);
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

    return this.enrichTask(task);
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

  private async getSuperAdmins() {
    return this.db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        squad: users.squad,
      })
      .from(users)
      .where(eq(users.role, 'SUPER_ADMIN'));
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

  private async createSubmissionNotifications(task: any, previousTask: any, user: any, dto: any) {
    const assignee = await this.getUserById(previousTask.assignedToId);
    const assigner = await this.getUserById(previousTask.assignedById);
    const superAdmins = await this.getSuperAdmins();
    const now = new Date().toISOString();

    const submittedByName = assignee?.name ?? user?.name ?? 'Intern';
    const prLink = dto.submissionPrLink ?? dto.proofLink ?? previousTask.proofLink ?? '';

    const receivers = new Map<string, any>();

    if (assigner?.id && assigner.id !== user.id) {
      receivers.set(assigner.id, assigner);
    }

    for (const admin of superAdmins) {
      if (admin?.id && admin.id !== user.id) {
        receivers.set(admin.id, admin);
      }
    }

    if (receivers.size === 0) return;

    await this.db.insert(notifications).values(
      Array.from(receivers.values()).map((receiver) => ({
        userId: receiver.id,
        type: 'card_assigned',
        title: `Task submitted for review: ${previousTask.title}`,
        message: `${submittedByName} submitted work for "${previousTask.title}". Please review the PR link in OPS.`,
        metadata: {
          taskId: previousTask.id,
          taskTitle: previousTask.title,
          submittedById: user.id,
          submittedByName,
          assignedById: previousTask.assignedById,
          assignedToId: previousTask.assignedToId,
          prLink,
          notificationFor: 'task_submission_review',
        },
        isRead: false,
        createdAt: now,
      }))
    );
  }

  private async createReviewDecisionNotification(task: any, previousTask: any, user: any, dto: any) {
    if (!previousTask.assignedToId || previousTask.assignedToId === user.id) return;

    const reviewer = await this.getUserById(user.id);
    const reviewerName = reviewer?.name ?? user?.name ?? 'Manager';
    const status = dto.reviewStatus ?? '';
    const now = new Date().toISOString();

    let title = '';
    let message = '';

    if (status === 'APPROVED' || dto.status === 'DONE') {
      title = `Task completed: ${previousTask.title}`;
      message = `${reviewerName} reviewed and marked your task as completed.`;
    } else if (status === 'CHANGES_REQUESTED') {
      title = `Changes requested: ${previousTask.title}`;
      message = `${reviewerName} requested changes for your submitted task. Please check the feedback in OPS.`;
    } else {
      return;
    }

    await this.db.insert(notifications).values({
      userId: previousTask.assignedToId,
      type: 'card_assigned',
      title,
      message,
      metadata: {
        taskId: previousTask.id,
        taskTitle: previousTask.title,
        reviewedById: user.id,
        reviewedByName: reviewerName,
        reviewStatus: status,
        notificationFor: 'task_review_decision',
      },
      isRead: false,
      createdAt: now,
    });
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

    if (user.role === 'INTERN') {
      const allowedInternKeys = [
        'status',
        'proofLink',
        'submissionPrLink',
        'submissionDocLink',
        'submissionSummary',
        'submissionBlockers',
        'submittedAt',
        'reviewStatus',
      ];

      const hasOnlyAllowedKeys = Object.keys(dto).every((key) => allowedInternKeys.includes(key));

      if (!hasOnlyAllowedKeys) {
        throw new ForbiddenException('Interns can only submit work updates');
      }
    }

    const safePayload = this.buildSafeUpdatePayload(dto, task);

    const [updated] = await this.db
      .update(tasks)
      .set(safePayload)
      .where(eq(tasks.id, id))
      .returning();

    const isSubmission =
      user.role === 'INTERN' &&
      (dto.submissionPrLink || dto.proofLink || dto.reviewStatus === 'SUBMITTED_FOR_REVIEW');

    const isReviewDecision =
      user.role !== 'INTERN' &&
      (dto.reviewStatus === 'APPROVED' || dto.reviewStatus === 'CHANGES_REQUESTED' || dto.status === 'DONE');

    try {
      await this.db.insert(taskActivities).values({
        taskId: updated.id,
        performedBy: user.id,
        action: isSubmission
          ? 'SUBMITTED_FOR_REVIEW'
          : isReviewDecision
            ? 'REVIEW_DECISION'
            : dto.status && task.status !== dto.status
              ? 'STATUS_CHANGED'
              : 'UPDATED',
        metadata: { changes: dto, previousStatus: task.status },
        createdAt: new Date().toISOString(),
      });
    } catch (e) {
      this.logger.warn(`Activity log skipped (update): ${e?.message}`);
    }

    if (isSubmission) {
      this.createSubmissionNotifications(updated, task, user, dto).catch((err) =>
        this.logger.warn(`Submission notification failed: ${err?.message}`)
      );
    }

    if (isReviewDecision) {
      this.createReviewDecisionNotification(updated, task, user, dto).catch((err) =>
        this.logger.warn(`Review decision notification failed: ${err?.message}`)
      );
    }

    return this.enrichTask(updated);
  }

  async approve(id: string, user: any) {
    if (user.role === 'INTERN') throw new ForbiddenException();

    const [task] = await this.db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    if (!task) throw new NotFoundException();

    if (user.role === 'MANAGER' && task.squad !== user.squad) throw new ForbiddenException();

    const feedbackData = {
      ...this.parseFeedback(task.feedback),
      reviewStatus: 'APPROVED',
      reviewedAt: new Date().toISOString(),
    };

    const [updated] = await this.db
      .update(tasks)
      .set({
        status: 'DONE',
        feedback: this.stringifyFeedback(feedbackData),
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

    this.createReviewDecisionNotification(updated, task, user, { reviewStatus: 'APPROVED', status: 'DONE' }).catch((err) =>
      this.logger.warn(`Approve notification failed: ${err?.message}`)
    );

    return this.enrichTask(updated);
  }

  async addFeedback(id: string, feedback: string, user: any) {
    if (user.role === 'INTERN') throw new ForbiddenException();

    const [task] = await this.db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    if (!task) throw new NotFoundException();

    if (user.role === 'MANAGER' && task.squad !== user.squad) throw new ForbiddenException();

    const feedbackData = {
      ...this.parseFeedback(task.feedback),
      reviewFeedback: feedback,
      reviewedAt: new Date().toISOString(),
    };

    const [updated] = await this.db
      .update(tasks)
      .set({ feedback: this.stringifyFeedback(feedbackData), updatedAt: new Date().toISOString() })
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

    return this.enrichTask(updated);
  }

  async sendFollowUp(id: string, message: string | undefined, user: any) {
    if (user.role === 'INTERN') {
      throw new ForbiddenException('Interns cannot send follow-up messages');
    }

    const [task] = await this.db.select().from(tasks).where(eq(tasks.id, id)).limit(1);

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (user.role === 'MANAGER' && task.squad !== user.squad) {
      throw new ForbiddenException('You can only send follow-up messages for tasks in your squad');
    }

    if (task.status === 'DONE') {
      throw new ForbiddenException('This task is already completed');
    }

    if (!task.assignedToId) {
      throw new NotFoundException('This task is not assigned to any intern');
    }

    const assignee = await this.getUserById(task.assignedToId);
    const sender = await this.getUserById(user.id);

    if (!assignee) {
      throw new NotFoundException('Assigned intern not found');
    }

    const senderName = sender?.name ?? user?.name ?? 'Manager';
    const followUpMessage =
      message?.trim() ||
      `Reminder: Please complete the task "${task.title}" as soon as possible.`;

    const now = new Date().toISOString();

    await this.db.insert(notifications).values({
      userId: task.assignedToId,
      type: 'card_assigned',
      title: `Task follow-up reminder: ${task.title}`,
      message: followUpMessage,
      metadata: {
        taskId: task.id,
        taskTitle: task.title,
        assignedToId: task.assignedToId,
        assignedToName: assignee.name,
        sentById: user.id,
        sentByName: senderName,
        priority: task.priority,
        squad: task.squad,
        dueDate: task.dueDate,
        notificationFor: 'follow_up',
      },
      isRead: false,
      createdAt: now,
    });

    try {
      await this.db.insert(taskActivities).values({
        taskId: task.id,
        performedBy: user.id,
        action: 'FOLLOW_UP_SENT',
        metadata: {
          message: followUpMessage,
          sentTo: task.assignedToId,
          sentToName: assignee.name,
        },
        createdAt: now,
      });
    } catch (e) {
      this.logger.warn(`Activity log skipped (follow-up): ${e?.message}`);
    }

    return {
      success: true,
      message: 'Follow-up sent successfully',
    };
  }

  async delete(id: string, user?: any) {
    const [task] = await this.db.select().from(tasks).where(eq(tasks.id, id)).limit(1);

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (user?.role === 'INTERN') {
      throw new ForbiddenException('Interns cannot delete tasks');
    }

    if (user?.role === 'MANAGER' && task.squad !== user.squad) {
      throw new ForbiddenException('You can only delete tasks in your squad');
    }

    try {
      await this.db.delete(taskActivities).where(eq(taskActivities.taskId, id));
    } catch (e) {
      this.logger.warn(`Task activity cleanup skipped (delete): ${e?.message}`);
    }

    await this.db.delete(tasks).where(eq(tasks.id, id));

    return {
      success: true,
      deletedId: id,
    };
  }
}