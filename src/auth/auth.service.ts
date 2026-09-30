import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { eq, and, gt, sql } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { DB } from '../database/database.module';
import {
  users,
  invites,
  userPermissions,
} from '../../drizzle/schema';
import { LoginDto } from './dto/login.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    @Inject(DB) private db: any,
    private jwtService: JwtService,
    private config: ConfigService,
    private mail: MailService,
  ) {}

  async login(dto: LoginDto) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, dto.email.toLowerCase()))
      .limit(1);

    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (user.status === 'deactivated')
      throw new UnauthorizedException('Account deactivated. Contact your admin.');

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    const permissions = await this.db
      .select()
      .from(userPermissions)
      .where(eq(userPermissions.userId, user.id));

    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      squad: user.squad,
    });

    const { passwordHash, ...safeUser } = user;
    return { token, user: safeUser };
  }

  async acceptInvite(dto: AcceptInviteDto) {
    const [invite] = await this.db
      .select()
      .from(invites)
      .where(
        and(
          eq(invites.token, dto.token),
          eq(invites.status, 'pending'),
          gt(invites.expiresAt, sql`now()`),
        ),
      )
      .limit(1);

    if (!invite) throw new BadRequestException('Invalid or expired invite link');

    const existing = await this.db
      .select()
      .from(users)
      .where(eq(users.email, invite.email))
      .limit(1);

    if (existing.length > 0)
      throw new BadRequestException('Account already exists');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const [newUser] = await this.db
      .insert(users)
      .values({
        name: dto.name,
        email: invite.email,
        passwordHash,
        role: invite.role,
        squad: (invite as any).squad ?? 'TECH', // Default squad if not in invite
        status: 'ACTIVE',
        invitedBy: invite.invitedBy,
        joinedAt: new Date().toISOString(),
      })
      .returning();

    await this.db
      .update(invites)
      .set({ status: 'accepted', acceptedAt: new Date().toISOString() })
      .where(eq(invites.id, invite.id));

    const token = this.jwtService.sign({
      sub: newUser.id,
      email: newUser.email,
      role: newUser.role,
      squad: newUser.squad,
    });

    const { passwordHash: _, ...safeUser } = newUser;
    return { token, user: safeUser };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const [user] = await this.db
      .select({ id: users.id, email: users.email, status: users.status })
      .from(users)
      .where(eq(users.email, dto.email.toLowerCase()))
      .limit(1);

    // Always return success to avoid email enumeration
    if (!user || user.status === 'deactivated') {
      return { message: 'If that email exists, a reset link has been sent.' };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    await this.db
      .update(users)
      .set({ passwordResetToken: token, passwordResetExpiry: expiry, updatedAt: new Date().toISOString() })
      .where(eq(users.id, user.id));

    await this.mail.sendPasswordReset(user.email, token);

    return { message: 'If that email exists, a reset link has been sent.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const [user] = await this.db
      .select({ id: users.id, passwordResetToken: users.passwordResetToken, passwordResetExpiry: users.passwordResetExpiry })
      .from(users)
      .where(eq(users.passwordResetToken, dto.token))
      .limit(1);

    if (!user || !user.passwordResetExpiry) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (new Date(user.passwordResetExpiry) < new Date()) {
      throw new BadRequestException('Reset token has expired');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    await this.db
      .update(users)
      .set({ passwordHash, passwordResetToken: null, passwordResetExpiry: null, updatedAt: new Date().toISOString() })
      .where(eq(users.id, user.id));

    return { message: 'Password updated successfully' };
  }

  async validateUser(userId: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user || user.status === 'INACTIVE') return null;
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

}