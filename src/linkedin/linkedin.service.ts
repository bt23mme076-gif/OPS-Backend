import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, desc, and, or, ilike, sql } from 'drizzle-orm';
import { DB } from '../database/database.module';
import { linkedinPosts, linkedinLeads, mentors, students } from '../../drizzle/schema';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';

// Computes engagement rate (%) from raw metrics — impressions-weighted.
function withDerived(post: any) {
  if (!post) return post;
  const interactions =
    (post.reactions || 0) + (post.comments || 0) + (post.reposts || 0);
  const engagementRate = post.impressions
    ? Math.round((interactions / post.impressions) * 1000) / 10
    : 0;
  return { ...post, engagementRate };
}

@Injectable()
export class LinkedinService {
  constructor(@Inject(DB) private db: any) {}

  // ─── POSTS ──────────────────────────────────────────────────────────────────

  async findAllPosts(query?: {
    status?: string;
    format?: string;
    authorId?: string;
    search?: string;
  }) {
    const conditions = [];
    if (query?.status) conditions.push(eq(linkedinPosts.status, query.status as any));
    if (query?.format) conditions.push(eq(linkedinPosts.format, query.format as any));
    if (query?.authorId) conditions.push(eq(linkedinPosts.authorId, query.authorId));
    if (query?.search) {
      conditions.push(
        or(
          ilike(linkedinPosts.title, `%${query.search}%`),
          ilike(linkedinPosts.topic, `%${query.search}%`),
          ilike(linkedinPosts.hook, `%${query.search}%`),
        ),
      );
    }

    const rows = await this.db
      .select()
      .from(linkedinPosts)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(linkedinPosts.updatedAt));

    return rows.map(withDerived);
  }

  async findOnePost(id: string) {
    const [post] = await this.db
      .select()
      .from(linkedinPosts)
      .where(eq(linkedinPosts.id, id))
      .limit(1);
    if (!post) throw new NotFoundException('Post not found');
    return withDerived(post);
  }

  async createPost(dto: CreatePostDto, createdBy: string) {
    const [post] = await this.db
      .insert(linkedinPosts)
      .values({
        title: dto.title,
        topic: dto.topic,
        hook: dto.hook,
        body: dto.body,
        format: (dto.format as any) || 'text',
        status: (dto.status as any) || 'idea',
        authorId: dto.authorId || null,
        assignedToId: dto.assignedToId || null,
        postUrl: dto.postUrl,
        scheduledFor: dto.scheduledFor || null,
        publishedAt: dto.publishedAt || null,
        impressions: dto.impressions ?? 0,
        reactions: dto.reactions ?? 0,
        comments: dto.comments ?? 0,
        reposts: dto.reposts ?? 0,
        profileViews: dto.profileViews ?? 0,
        followersGained: dto.followersGained ?? 0,
        notes: dto.notes,
        createdBy,
      })
      .returning();
    return withDerived(post);
  }

  async updatePost(id: string, dto: UpdatePostDto) {
    const updateData: any = { updatedAt: new Date().toISOString() };
    const fields = [
      'title', 'topic', 'hook', 'body', 'format', 'status', 'authorId',
      'assignedToId', 'postUrl', 'scheduledFor', 'publishedAt', 'notes',
      'impressions', 'reactions', 'comments', 'reposts', 'profileViews',
      'followersGained',
    ];
    for (const f of fields) {
      if ((dto as any)[f] !== undefined) updateData[f] = (dto as any)[f];
    }

    // Stamp publishedAt automatically when moving to published without an explicit date
    if (dto.status === 'published' && dto.publishedAt === undefined) {
      const [existing] = await this.db
        .select({ publishedAt: linkedinPosts.publishedAt })
        .from(linkedinPosts)
        .where(eq(linkedinPosts.id, id))
        .limit(1);
      if (existing && !existing.publishedAt) {
        updateData.publishedAt = new Date().toISOString();
      }
    }

    const [updated] = await this.db
      .update(linkedinPosts)
      .set(updateData)
      .where(eq(linkedinPosts.id, id))
      .returning();
    if (!updated) throw new NotFoundException('Post not found');
    return withDerived(updated);
  }

  async removePost(id: string) {
    // Detach leads first so attribution rows survive the post deletion
    await this.db
      .update(linkedinLeads)
      .set({ sourcePostId: null })
      .where(eq(linkedinLeads.sourcePostId, id));
    const [deleted] = await this.db
      .delete(linkedinPosts)
      .where(eq(linkedinPosts.id, id))
      .returning();
    if (!deleted) throw new NotFoundException('Post not found');
    return { message: 'Post deleted', id };
  }

  // ─── LEADS ──────────────────────────────────────────────────────────────────

  async findAllLeads(query?: {
    stage?: string;
    leadType?: string;
    sourcePostId?: string;
    assignedToId?: string;
    search?: string;
  }) {
    const conditions = [];
    if (query?.stage) conditions.push(eq(linkedinLeads.stage, query.stage as any));
    if (query?.leadType) conditions.push(eq(linkedinLeads.leadType, query.leadType as any));
    if (query?.sourcePostId) conditions.push(eq(linkedinLeads.sourcePostId, query.sourcePostId));
    if (query?.assignedToId) conditions.push(eq(linkedinLeads.assignedToId, query.assignedToId));
    if (query?.search) {
      conditions.push(
        or(
          ilike(linkedinLeads.name, `%${query.search}%`),
          ilike(linkedinLeads.headline, `%${query.search}%`),
        ),
      );
    }

    return this.db
      .select()
      .from(linkedinLeads)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(linkedinLeads.lastActivityAt));
  }

  async findOneLead(id: string) {
    const [lead] = await this.db
      .select()
      .from(linkedinLeads)
      .where(eq(linkedinLeads.id, id))
      .limit(1);
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async createLead(dto: CreateLeadDto, createdBy: string) {
    const [lead] = await this.db
      .insert(linkedinLeads)
      .values({
        name: dto.name,
        headline: dto.headline,
        linkedinUrl: dto.linkedinUrl,
        email: dto.email,
        phone: dto.phone,
        leadType: (dto.leadType as any) || 'student',
        stage: (dto.stage as any) || 'new',
        sourcePostId: dto.sourcePostId || null,
        engagementType: (dto.engagementType as any) || null,
        assignedToId: dto.assignedToId || null,
        notes: dto.notes,
        createdBy,
      })
      .returning();

    if (lead.sourcePostId) await this.recountPostLeads(lead.sourcePostId);
    return lead;
  }

  async updateLead(id: string, dto: UpdateLeadDto) {
    const [existing] = await this.db
      .select()
      .from(linkedinLeads)
      .where(eq(linkedinLeads.id, id))
      .limit(1);
    if (!existing) throw new NotFoundException('Lead not found');

    const updateData: any = {
      updatedAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
    };
    const fields = [
      'name', 'headline', 'linkedinUrl', 'email', 'phone', 'leadType',
      'stage', 'sourcePostId', 'engagementType', 'assignedToId', 'notes',
    ];
    for (const f of fields) {
      if ((dto as any)[f] !== undefined) updateData[f] = (dto as any)[f];
    }

    const [updated] = await this.db
      .update(linkedinLeads)
      .set(updateData)
      .where(eq(linkedinLeads.id, id))
      .returning();

    // Keep attribution counters honest if the source post changed
    if (dto.sourcePostId !== undefined && dto.sourcePostId !== existing.sourcePostId) {
      if (existing.sourcePostId) await this.recountPostLeads(existing.sourcePostId);
      if (updated.sourcePostId) await this.recountPostLeads(updated.sourcePostId);
    }
    return updated;
  }

  async updateLeadStage(id: string, stage: string) {
    const [updated] = await this.db
      .update(linkedinLeads)
      .set({
        stage: stage as any,
        lastActivityAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(linkedinLeads.id, id))
      .returning();
    if (!updated) throw new NotFoundException('Lead not found');
    return updated;
  }

  // Converts a LinkedIn lead into a real mentor or student pipeline record.
  async convertLead(id: string, target: 'mentor' | 'student', userId: string) {
    if (target !== 'mentor' && target !== 'student') {
      throw new BadRequestException('target must be "mentor" or "student"');
    }
    const [lead] = await this.db
      .select()
      .from(linkedinLeads)
      .where(eq(linkedinLeads.id, id))
      .limit(1);
    if (!lead) throw new NotFoundException('Lead not found');
    if (lead.convertedToId) {
      throw new BadRequestException('Lead already converted');
    }

    let createdId: string;
    if (target === 'mentor') {
      const [m] = await this.db
        .insert(mentors)
        .values({
          fullName: lead.name,
          email: lead.email,
          phone: lead.phone,
          linkedinUrl: lead.linkedinUrl,
          source: 'linkedin',
          notes: lead.notes,
          assignedTo: lead.assignedToId || null,
          createdBy: userId,
        })
        .returning({ id: mentors.id });
      createdId = m.id;
    } else {
      const [s] = await this.db
        .insert(students)
        .values({
          fullName: lead.name,
          email: lead.email,
          phone: lead.phone,
          source: 'linkedin',
          notes: lead.notes,
          assignedTo: lead.assignedToId || null,
          createdBy: userId,
        })
        .returning({ id: students.id });
      createdId = s.id;
    }

    const [updated] = await this.db
      .update(linkedinLeads)
      .set({
        stage: 'converted',
        convertedToType: target,
        convertedToId: createdId,
        convertedAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(linkedinLeads.id, id))
      .returning();

    return { lead: updated, convertedToType: target, convertedToId: createdId };
  }

  async removeLead(id: string) {
    const [deleted] = await this.db
      .delete(linkedinLeads)
      .where(eq(linkedinLeads.id, id))
      .returning();
    if (!deleted) throw new NotFoundException('Lead not found');
    if (deleted.sourcePostId) await this.recountPostLeads(deleted.sourcePostId);
    return { message: 'Lead deleted', id };
  }

  // ─── DASHBOARD ────────────────────────────────────────────────────────────────

  async getStats() {
    const posts = await this.db.select().from(linkedinPosts);
    const leads = await this.db.select().from(linkedinLeads);

    const published = posts.filter((p: any) => p.status === 'published');

    // Cadence: published posts in the last 7 days vs the 3/week target
    const weekAgo = new Date(Date.now() - 7 * 864e5);
    const postedThisWeek = published.filter(
      (p: any) => p.publishedAt && new Date(p.publishedAt) >= weekAgo,
    ).length;

    const sum = (arr: any[], k: string) => arr.reduce((a, p) => a + (p[k] || 0), 0);
    const totalImpressions = sum(published, 'impressions');
    const totalInteractions =
      sum(published, 'reactions') + sum(published, 'comments') + sum(published, 'reposts');

    const converted = leads.filter((l: any) => l.stage === 'converted').length;

    // Format performance — avg engagement rate per format
    const byFormat: Record<string, { posts: number; impressions: number; interactions: number }> = {};
    for (const p of published) {
      const f = p.format || 'text';
      byFormat[f] ||= { posts: 0, impressions: 0, interactions: 0 };
      byFormat[f].posts += 1;
      byFormat[f].impressions += p.impressions || 0;
      byFormat[f].interactions += (p.reactions || 0) + (p.comments || 0) + (p.reposts || 0);
    }
    const formatPerformance = Object.entries(byFormat).map(([format, v]) => ({
      format,
      posts: v.posts,
      engagementRate: v.impressions
        ? Math.round((v.interactions / v.impressions) * 1000) / 10
        : 0,
    })).sort((a, b) => b.engagementRate - a.engagementRate);

    return {
      cadence: { postedThisWeek, weeklyTarget: 3, onTrack: postedThisWeek >= 3 },
      totals: {
        posts: posts.length,
        published: published.length,
        drafts: posts.filter((p: any) => p.status === 'draft' || p.status === 'idea').length,
        scheduled: posts.filter((p: any) => p.status === 'scheduled').length,
        impressions: totalImpressions,
        interactions: totalInteractions,
        followersGained: sum(published, 'followersGained'),
        leads: leads.length,
        converted,
      },
      engagementRate: totalImpressions
        ? Math.round((totalInteractions / totalImpressions) * 1000) / 10
        : 0,
      leadsPerPost: published.length
        ? Math.round((leads.length / published.length) * 10) / 10
        : 0,
      conversionRate: leads.length
        ? Math.round((converted / leads.length) * 1000) / 10
        : 0,
      formatPerformance,
    };
  }

  // Recompute the denormalised lead counter on a post.
  private async recountPostLeads(postId: string) {
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(linkedinLeads)
      .where(eq(linkedinLeads.sourcePostId, postId));
    await this.db
      .update(linkedinPosts)
      .set({ leadsGenerated: count })
      .where(eq(linkedinPosts.id, postId));
  }
}
