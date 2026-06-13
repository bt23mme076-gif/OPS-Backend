import { Injectable, Inject } from '@nestjs/common';
import { Connection } from 'mongoose';
import { MONGO_DB } from '../database/mongo.module';

@Injectable()
export class AtyantService {
  private UserModel: any;
  private SessionModel: any;

  constructor(@Inject(MONGO_DB) private mongo: Connection) {
    this.UserModel = this.mongo.collection('users');
    this.SessionModel = this.mongo.collection('sessions');
  }

  // Saare mentors
  async getMentors(limit = 50, skip = 0) {
    return this.UserModel.find(
      { role: 'mentor' },
      {
        projection: {
          password: 0,
          accessToken: 0,
          refreshToken: 0,
          verificationToken: 0,
          passwordResetToken: 0,
        },
      }
    ).skip(skip).limit(limit).toArray();
  }

  // Active mentors (last 7 days)
  async getActiveMentors() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return this.UserModel.find(
      { role: 'mentor', lastActive: { $gte: sevenDaysAgo } },
      { projection: { password: 0, accessToken: 0, refreshToken: 0 } }
    ).toArray();
  }

  // Saare users (students)
  async getUsers(limit = 50, skip = 0) {
    return this.UserModel.find(
      { role: 'user' },
      { projection: { password: 0, accessToken: 0, refreshToken: 0 } }
    ).skip(skip).limit(limit).toArray();
  }

  // Stats for dashboard
  async getStats() {
    const [totalMentors, activeMentors, totalUsers, onlineMentors] = await Promise.all([
      this.UserModel.countDocuments({ role: 'mentor' }),
      this.UserModel.countDocuments({
        role: 'mentor',
        lastActive: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      }),
      this.UserModel.countDocuments({ role: 'user' }),
      this.UserModel.countDocuments({ role: 'mentor', isOnline: true }),
    ]);

    return { totalMentors, activeMentors, totalUsers, onlineMentors };
  }

  // ── Sessions ──────────────────────────────────────────────────────────────
  // Returns sessions enriched with the student's name/email (looked up from
  // the `users` collection by userId). `status` optionally filters; the special
  // value 'upcoming' returns future, non-cancelled/completed sessions.
  async getSessions(status?: string, limit = 200, skip = 0) {
    const match: any = {};
    if (status && status !== 'all') {
      if (status === 'upcoming') {
        match.scheduledAt = { $gte: new Date() };
        match.status = { $nin: ['cancelled', 'completed'] };
      } else if (status === 'pending') {
        match.status = { $in: ['pending', null] };
      } else {
        match.status = status;
      }
    }

    return this.SessionModel.aggregate([
      { $match: match },
      { $sort: { scheduledAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $addFields: {
          _uid: { $convert: { input: '$userId', to: 'objectId', onError: null, onNull: null } },
        },
      },
      { $lookup: { from: 'users', localField: '_uid', foreignField: '_id', as: '_student' } },
      {
        $addFields: {
          studentName: {
            $let: {
              vars: { u: { $arrayElemAt: ['$_student', 0] } },
              in: { $ifNull: ['$$u.name', { $ifNull: ['$$u.username', '$$u.email'] }] },
            },
          },
          studentEmail: { $arrayElemAt: ['$_student.email', 0] },
        },
      },
      { $project: { _student: 0, _uid: 0 } },
    ]).toArray();
  }

  async getSessionStats() {
    const now = new Date();
    const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const [total, upcoming, thisWeek, completed, cancelled, pending, revenueAgg] =
      await Promise.all([
        this.SessionModel.countDocuments({}),
        this.SessionModel.countDocuments({
          scheduledAt: { $gte: now },
          status: { $nin: ['cancelled', 'completed'] },
        }),
        this.SessionModel.countDocuments({
          scheduledAt: { $gte: now, $lte: weekFromNow },
          status: { $nin: ['cancelled', 'completed'] },
        }),
        this.SessionModel.countDocuments({ status: 'completed' }),
        this.SessionModel.countDocuments({ status: 'cancelled' }),
        this.SessionModel.countDocuments({ status: { $in: ['pending', null] } }),
        this.SessionModel.aggregate([
          { $match: { paymentStatus: 'paid' } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]).toArray(),
      ]);

    return {
      total,
      upcoming,
      thisWeek,
      completed,
      cancelled,
      pending,
      paidRevenue: revenueAgg[0]?.total ?? 0,
    };
  }

  // Search mentors
  async searchMentors(query: string) {
    return this.UserModel.find(
      {
        role: 'mentor',
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } },
          { expertise: { $regex: query, $options: 'i' } },
          { 'education.institutionName': { $regex: query, $options: 'i' } },
        ],
      },
      { projection: { password: 0, accessToken: 0, refreshToken: 0 } }
    ).limit(20).toArray();
  }
}