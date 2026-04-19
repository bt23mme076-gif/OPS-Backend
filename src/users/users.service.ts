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

  async getAllUsers() {
    return this.db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        status: users.status,
        avatarUrl: users.avatarUrl,
        joinedAt: users.joinedAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(users.createdAt);
  }

  async getUserById(id: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user) throw new NotFoundException('User not found');

    const permissions = await this.db
      .select()
      .from(userPermissions)
      .where(eq(userPermissions.userId, id));

    const { passwordHash, ...safeUser } = user;
    return { ...safeUser, permissions };
  }

  async inviteUser(dto: InviteUserDto, invitedBy: string) {
    // Check existing user
    const [existing] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, dto.email.toLowerCase()))
      .limit(1);

    if (existing) throw new ConflictException('User with this email already exists');

    // Check existing pending invite
    const [existingInvite] = await this.db
      .select()
      .from(invites)
      .where(and(eq(invites.email, dto.email.toLowerCase()), eq(invites.status, 'pending')))
      .limit(1);

    if (existingInvite) {
      // Resend — update token and expiry
      const token = uuidv4();
      const expiresAt = addDays(new Date(), 7);
      await this.db
        .update(invites)
        .set({ token, expiresAt })
        .where(eq(invites.id, existingInvite.id));

      await this.mailService.sendInvite(dto.email, token);
      return { message: 'Invite resent successfully' };
    }

    const token = uuidv4();
    const expiresAt = addDays(new Date(), 7);

    await this.db.insert(invites).values({
      email: dto.email.toLowerCase(),
      role: dto.role,
      token,
      expiresAt,
      invitedBy,
    });

    await this.mailService.sendInvite(dto.email, token);
    return { message: 'Invite sent successfully' };
  }

  async deactivateUser(targetId: string, requesterId: string) {
    if (targetId === requesterId)
      throw new ForbiddenException('You cannot deactivate your own account');

    const [target] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, targetId))
      .limit(1);

    if (!target) throw new NotFoundException('User not found');
    if (target.role === 'super_admin')
      throw new ForbiddenException('Super admin accounts cannot be deactivated');

    await this.db
      .update(users)
      .set({ status: 'deactivated', updatedAt: new Date().toISOString() })
      .where(eq(users.id, targetId));

    // Send critical email notification
    await this.mailService.sendAccountDeactivated(target.email, target.name);

    // In-app notification
    await this.db.insert(notifications).values({
      userId: targetId,
      type: 'account_deactivated',
      title: 'Account Deactivated',
      message: 'Your account has been deactivated. Contact your admin for access.',
      metadata: { deactivatedBy: requesterId },
    });

    return { message: 'User deactivated successfully' };
  }

  async reactivateUser(targetId: string) {
    await this.db
      .update(users)
      .set({ status: 'active', updatedAt: new Date().toISOString() })
      .where(eq(users.id, targetId));

    return { message: 'User reactivated successfully' };
  }

  async updatePermissions(userId: string, dto: UpdatePermissionsDto) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) throw new NotFoundException('User not found');

    // Delete existing permissions and re-insert
    await this.db
      .delete(userPermissions)
      .where(eq(userPermissions.userId, userId));

    if (dto.permissions.length > 0) {
      await this.db.insert(userPermissions).values(
        dto.permissions.map((p) => ({
          userId,
          module: p.module,
          canRead: p.canRead,
          canWrite: p.canWrite,
        })),
      );
    }

    return { message: 'Permissions updated successfully' };
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
