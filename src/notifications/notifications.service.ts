import { Injectable, Inject } from '@nestjs/common';
import { eq, desc, and } from 'drizzle-orm';
import { DB } from '../database/database.module';
import { notifications } from '../../drizzle/schema';

@Injectable()
export class NotificationsService {
  constructor(@Inject(DB) private db: any) {}

  async getForUser(userId: string, opts?: { isRead?: boolean; limit?: number }) {
    const conditions = [eq(notifications.userId, userId)];
    if (opts?.isRead !== undefined) {
      conditions.push(eq(notifications.isRead, opts.isRead));
    }

    const rows = await this.db.select().from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(opts?.limit ?? 50);

    // Map message → body for frontend compatibility
    return rows.map((n: any) => ({
      id:        n.id,
      title:     n.title,
      body:      n.message,   // schema has 'message', frontend expects 'body'
      type:      n.type,
      isRead:    n.isRead,
      createdAt: n.createdAt,
    }));
  }

  async markRead(notificationId: string, userId: string) {
    await this.db.update(notifications)
      .set({ isRead: true })
      .where(and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId),
      ));
    return { success: true };
  }

  async markAllRead(userId: string) {
    await this.db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));
    return { success: true };
  }

  async getUnreadCount(userId: string) {
    const result = await this.db.select().from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return { count: result.length };
  }
}
