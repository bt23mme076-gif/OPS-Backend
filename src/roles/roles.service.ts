import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, desc } from 'drizzle-orm';
import { DB } from '../database/database.module';
import { rolesPosted, mentors } from '../../drizzle/schema';
import { CreateRoleDto } from './dto/create-role.dto';

@Injectable()
export class RolesService {
  constructor(@Inject(DB) private db: any) {}

  async findAll(query?: { status?: string; domain?: string }) {
    return this.db
      .select({
        id: rolesPosted.id,
        title: rolesPosted.title,
        company: rolesPosted.company,
        roleType: rolesPosted.roleType,
        domain: rolesPosted.domain,
        minSkillScore: rolesPosted.minSkillScore,
        applicationsCount: rolesPosted.applicationsCount,
        shortlistedCount: rolesPosted.shortlistedCount,
        placedCount: rolesPosted.placedCount,
        status: rolesPosted.status,
        createdAt: rolesPosted.createdAt,
        mentor: {
          id: mentors.id,
          fullName: mentors.fullName,
          currentCompany: mentors.currentCompany,
        },
      })
      .from(rolesPosted)
      .leftJoin(mentors, eq(rolesPosted.postedBy, mentors.id))
      .orderBy(desc(rolesPosted.createdAt));
  }

  async findOne(id: string) {
    const [role] = await this.db
      .select()
      .from(rolesPosted)
      .where(eq(rolesPosted.id, id))
      .limit(1);

    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async create(dto: CreateRoleDto, createdBy: string) {
    const [role] = await this.db
      .insert(rolesPosted)
      .values({ ...dto, createdBy })
      .returning();

    await this.db.execute(
      `UPDATE mentors SET roles_posted_count = roles_posted_count + 1 WHERE id = '${dto.postedBy}'`,
    );

    return role;
  }

  async updateStatus(id: string, status: string) {
    const [updated] = await this.db
      .update(rolesPosted)
      .set({ status: status as any, updatedAt: new Date().toISOString() })
      .where(eq(rolesPosted.id, id))
      .returning();
    return updated;
  }
}
