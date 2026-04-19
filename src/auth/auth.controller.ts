import { Controller, Post, Body, Get, UseGuards, Req, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

const isProd = process.env.NODE_ENV === 'production';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? ('none' as const) : ('lax' as const),
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
};

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: any) {
    const result = await this.authService.login(dto);
    res.cookie('atyant_token', result.token, COOKIE_OPTIONS);
    return result;
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: any) {
    res.clearCookie('atyant_token', { path: '/' });
    return { message: 'Logged out' };
  }

  @Post('accept-invite')
  async acceptInvite(@Body() dto: AcceptInviteDto, @Res({ passthrough: true }) res: any) {
    const result = await this.authService.acceptInvite(dto);
    res.cookie('atyant_token', result.token, COOKIE_OPTIONS);
    return result;
  }

  // GET /auth/me — rehydrates session from cookie
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  me(@Req() req: any) {
    // Return in shape frontend AuthUser expects: id, name, email, role, status
    return req.user;
  }
}
