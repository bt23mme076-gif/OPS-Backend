import { Injectable, Inject } from '@nestjs/common';
import { eq, gte, count, sql, desc } from 'drizzle-orm';
import { subDays, startOfMonth } from 'date-fns';
import { DB } from '../database/database.module';
import {
  students, mentors, sessions, rolesPosted,
  applications, pipelineActivities, users,
} from '../../drizzle/schema';

@Injectable()
export class DashboardService {
  constructor(@Inject(DB) private db: any) { }

  // GET /dashboard — shape expected by frontend
  async getDashboard() {
    const now = new Date();
    const weekAgo = subDays(now, 7);

    const [[totalMentors], [activeMentors], [totalStudents], [activeStudents], [sessionsThisWeek], [pendingTasks]] =
      await Promise.all([
        this.db.select({ count: count() }).from(mentors),
        this.db.select({ count: count() }).from(mentors).where(eq(mentors.status, 'active')),
        this.db.select({ count: count() }).from(students),
        this.db.select({ count: count() }).from(students).where(
          sql`${students.stage} NOT IN ('dropped_off')`,
        ),
        this.db.select({ count: count() }).from(sessions).where(
          gte(sessions.scheduledAt, weekAgo),
        ),
        // Tasks — try/catch in case table doesn't exist yet
        this.db.execute(sql`SELECT COUNT(*) as count FROM tasks WHERE status != 'done'`).then(
          (r: any) => [{ count: Number((r.rows ?? r)[0]?.count ?? 0) }]
        ).catch(() => [{ count: 0 }]),
      ]);

    // Recent activity from pipeline_activities
    const recentActivity = await this.db
      .select({
        id: pipelineActivities.id,
        type: pipelineActivities.activityType,
        description: pipelineActivities.activityType,
        createdAt: pipelineActivities.createdAt,
      })
      .from(pipelineActivities)
      .orderBy(desc(pipelineActivities.createdAt))
      .limit(10);

    // Conversion rate: placed / total students
    const [placedResult] = await this.db
      .select({ count: count() })
      .from(students)
      .where(eq(students.stage, 'placed'));

    const total = Number(totalStudents?.count ?? 0);
    const placed = Number(placedResult?.count ?? 0);
    const conversionRate = total > 0 ? Math.round((placed / total) * 100) : 0;

    return {
      totalMentors: Number(totalMentors?.count ?? 0),
      activeMentors: Number(activeMentors?.count ?? 0),
      totalStudents: total,
      activeStudents: Number(activeStudents?.count ?? 0),
      sessionsThisWeek: Number(sessionsThisWeek?.count ?? 0),
      pendingTasks: Number(pendingTasks?.count ?? 0),
      conversionRate,
      recentActivity,
    };
  }

  // GET /dashboard/omtm — detailed OMTM metrics (legacy)
  async getOmtm() {
    const now = new Date();
    const thirtyDaysAgo = subDays(now, 30);
    const thisMonthStart = startOfMonth(now);

    const [activeStudentsResult] = await this.db
      .select({ count: count() })
      .from(students)
      .where(sql`${students.stage} NOT IN ('dropped_off') AND ${students.createdAt} >= ${thirtyDaysAgo}`);
    const activeStudents = Number(activeStudentsResult?.count || 0);

    const [inviteResult] = await this.db
      .select({ total: sql<number>`SUM(${students.interviewInvitesReceived})` })
      .from(students)
      .where(gte(students.updatedAt, thirtyDaysAgo));
    const totalInvites = Number(inviteResult?.total || 0);

    const inviteRatePer30Days = activeStudents > 0
      ? parseFloat((totalInvites / activeStudents).toFixed(2)) : 0;

    const [rolesResult] = await this.db
      .select({ count: count() })
      .from(rolesPosted)
      .where(sql`${rolesPosted.status} IN ('live', 'filled') AND ${rolesPosted.createdAt} >= ${thisMonthStart}`);
    const rolesPostedThisMonth = Number(rolesResult?.count || 0);

    return {
      activeStudentsLast30Days: activeStudents,
      inviteRatePer30Days,
      rolesPostedThisMonth,
    };
  }
}
