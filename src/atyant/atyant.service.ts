import { Injectable, Inject } from '@nestjs/common';
import { Connection } from 'mongoose';
import { MONGO_DB } from '../database/mongo.module';

@Injectable()
export class AtyantService {
  private UserModel: any;

  constructor(@Inject(MONGO_DB) private mongo: Connection) {
    this.UserModel = this.mongo.collection('users');
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