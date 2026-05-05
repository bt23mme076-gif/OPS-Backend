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
import { DB } from '../database/database.module';
import {
  users,
  invites,
  userPermissions,
} from '../../drizzle/schema';
import { LoginDto } from './dto/login.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';

@Injectable()
export class AuthService {
  constructor(
    @Inject(DB) private db: any,
    private jwtService: JwtService,
    private config: ConfigService,
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