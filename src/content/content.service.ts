import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DB } from '../database/database.module';
import { users, notifications, uploadedPosts } from '../../drizzle/schema';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { eq, sql } from 'drizzle-orm';

type ContentStatus = 'Idea' | 'Draft' | 'In Review' | 'Approved' | 'Published';

type ContentItem = {
  id: number;
  title: string;
  type: string;
  platform: string;
  status: ContentStatus;
  assignedTo: string;
  dueDate: string;
  priority: string;
};

type UploadedPost = {
  id: string;
  platform: 'Instagram' | 'LinkedIn';
  postUrl: string;
  uploadedBy: string;
  createdAt: string;
};

@Injectable()
export class ContentService {
  constructor(
    @Inject(DB) private readonly db: any,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  private contentItems: ContentItem[] = [
    {
      id: 1,
      title: 'Placement roadmap carousel',
      type: 'Instagram Carousel',
      platform: 'Instagram',
      status: 'In Review',
      assignedTo: 'Content Intern',
      dueDate: '2026-05-30',
      priority: 'High',
    },
    {
      id: 2,
      title: 'Senior mentor success story',
      type: 'LinkedIn Post',
      platform: 'LinkedIn',
      status: 'Draft',
      assignedTo: 'Content Intern',
      dueDate: '2026-05-29',
      priority: 'Medium',
    },
  ];



  findAll() {
    return this.contentItems;
  }

  create(body: Partial<ContentItem>) {
    const newContent: ContentItem = {
      id: Date.now(),
      title: body.title || '',
      type: body.type || 'Instagram Carousel',
      platform: body.platform || 'Instagram',
      status: body.status || 'Idea',
      assignedTo: body.assignedTo || 'Not assigned',
      dueDate: body.dueDate || 'Not set',
      priority: body.priority || 'Medium',
    };

    this.contentItems.unshift(newContent);
    return newContent;
  }

  update(id: number, body: Partial<ContentItem>) {
    const contentIndex = this.contentItems.findIndex((item) => item.id === id);

    if (contentIndex === -1) {
      throw new NotFoundException('Content item not found');
    }

    this.contentItems[contentIndex] = {
      ...this.contentItems[contentIndex],
      ...body,
    };

    return this.contentItems[contentIndex];
  }

  remove(id: number) {
    const contentItem = this.contentItems.find((item) => item.id === id);

    if (!contentItem) {
      throw new NotFoundException('Content item not found');
    }

    this.contentItems = this.contentItems.filter((item) => item.id !== id);

    return {
      message: 'Content item deleted successfully',
      deletedContent: contentItem,
    };
  }

  // ─── UPLOADED POSTS ─────────────────────────────────────────────────────────

  async getUploadedPosts() {
    return await this.db.select().from(uploadedPosts);
  }

  async createUploadedPost(body: { platform: 'Instagram' | 'LinkedIn'; postUrl: string }, user: any) {
    const [newPost] = await this.db.insert(uploadedPosts).values({
      platform: body.platform,
      postUrl: body.postUrl,
      uploadedBy: user?.name || 'Content Team',
    }).returning();

    try {
      // Query all users
      const allUsers = await this.db.select({ id: users.id }).from(users);
      console.log("ALL USERS FOUND:", allUsers);

      if (allUsers.length > 0) {
        const now = new Date().toISOString();
        const notificationRows = allUsers.map((u: any) => ({
          userId: u.id,
          type: 'card_assigned', // Must be an existing notificationTypeEnum value
          title: `New ${body.platform} post added`,
          message: `Check out the new post: ${body.postUrl}`,
          metadata: {
            uploadedPostId: newPost.id,
            postUrl: body.postUrl,
            platform: body.platform,
            uploadedBy: user?.name || 'Content Team',
          },
          isRead: false,
          createdAt: now,
        }));

        console.log("NOTIFICATION ROWS:", notificationRows);
        await this.db.insert(notifications).values(notificationRows);
      }

      // Broadcast real-time event to all connected sockets
      this.notificationsGateway.sendToAll('notification', {
        title: `New ${body.platform} post added`,
        message: `Check out the new post: ${body.postUrl}`,
        platform: body.platform,
        postUrl: body.postUrl,
        uploadedBy: user?.name || 'Content Team',
      });
    } catch (err) {
      console.error("NOTIFICATION ERROR:", err);
      console.error("ERROR MESSAGE:", err?.message);
    }

    return newPost;
  }

  async deleteUploadedPost(id: string) {
    const result = await this.db.delete(uploadedPosts).where(eq(uploadedPosts.id, id)).returning();
    if (result.length === 0) {
      throw new NotFoundException('Uploaded post not found');
    }

    try {
      // Delete all notifications linked to this uploaded post id (handles both normal and legacy double-stringified formats)
      await this.db.delete(notifications).where(
        sql`${notifications.metadata}->>'uploadedPostId' = ${id} OR (${notifications.metadata}::text LIKE ${`%"uploadedPostId"%${id}%`})`
      );
    } catch (err) {
      // Log errors but don't block post deletion success
      console.error("FAILED TO CLEAN UP NOTIFICATIONS:", err);
    }

    return {
      message: 'Uploaded post and associated notifications deleted successfully',
      deletedPost: result[0],
    };
  }
}