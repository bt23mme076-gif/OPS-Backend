import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { eq, ne, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { addDays } from 'date-fns';
import { DB } from '../database/database.module';
import { users, invites, userPermissions, notifications } from '../../drizzle/schema';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdatePermissionsDto } from './dto/update-permissions.dto';
import { MailService } from '../mail/mail.service';

@Injectable()
export class UsersService {
  constructor(
    @Inject(DB) private db: any,
    private mailService: MailService,
  ) {}

  async getUsersForRole(user: any) {
    let query = this.db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        squad: users.squad,
        status: users.status,
        avatarUrl: users.avatarUrl,
        joinedAt: users.joinedAt,
        createdAt: users.createdAt,
      })
      .from(users);

    if (user.role === 'MANAGER') {
      // Managers only see their own squad interns
      query = query.where(and(eq(users.squad, user.squad), eq(users.role, 'INTERN')));
    } else if (user.role === 'INTERN') {
      // Interns only see themselves
      query = query.where(eq(users.id, user.id));
    }
    // SUPER_ADMIN sees all

    return query.orderBy(users.createdAt);
  }

  async getUserById(id: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user) throw new NotFoundException('User not found');

    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  async inviteUser(dto: InviteUserDto, invitedBy: string) {
    const [existing] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, dto.email.toLowerCase()))
      .limit(1);

    if (existing) throw new ConflictException('User already exists');

    const [existingInvite] = await this.db
      .select()
      .from(invites)
      .where(and(eq(invites.email, dto.email.toLowerCase()), eq(invites.status, 'pending')))
      .limit(1);

    const token = uuidv4();
    const expiresAt = addDays(new Date(), 7).toISOString();

    if (existingInvite) {
      await this.db
        .update(invites)
        .set({ token, expiresAt, role: dto.role })
        .where(eq(invites.id, existingInvite.id));
    } else {
      await this.db.insert(invites).values({
        email: dto.email.toLowerCase(),
        role: dto.role,
        token,
        expiresAt,
        invitedBy,
      });
    }

    await this.mailService.sendInvite(dto.email, token);
    return { success: true, message: 'Invite sent' };
  }

  async updateUser(id: string, dto: any, requester: any) {
    const [target] = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!target) throw new NotFoundException('User not found');

    if (requester.role === 'MANAGER') {
      if (target.squad !== requester.squad) {
        throw new ForbiddenException('You can only update users in your own squad');
      }
      // Managers can only update status or managerId for interns
      delete dto.role;
      delete dto.squad;
    }

    await this.db
      .update(users)
      .set({ ...dto, updatedAt: new Date().toISOString() })
      .where(eq(users.id, id));

    return { success: true, message: 'User updated' };
  }

  async deleteUser(id: string) {
    await this.db.delete(users).where(eq(users.id, id));
    return { success: true, message: 'User deleted' };
  }

  async getPendingInvites() {
    return this.db
      .select()
      .from(invites)
      .where(eq(invites.status, 'pending'))
      .orderBy(invites.createdAt);
  }

  async revokeInvite(inviteId: string) {
    await this.db
      .update(invites)
      .set({ status: 'expired' })
      .where(eq(invites.id, inviteId));

    return { message: 'Invite revoked' };
  }
}

}
