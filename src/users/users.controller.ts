import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, CurrentUser } from '../common/decorators/roles.decorator';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdatePermissionsDto } from './dto/update-permissions.dto';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  getAllUsers(@CurrentUser() user: any) {
    return this.usersService.getUsersForRole(user);
  }

  @Get('invites')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  getPendingInvites() {
    return this.usersService.getPendingInvites();
  }

  @Get(':id')
  async getUserById(@Param('id') id: string, @CurrentUser() user: any) {
    // Basic protection: interns can only see themselves unless special permission
    if (user.role === 'INTERN' && user.id !== id) {
       throw new ForbiddenException('You can only view your own profile');
    }
    return this.usersService.getUserById(id);
  }

  @Post('invite')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  async inviteUser(@Body() dto: InviteUserDto, @CurrentUser() user: any) {
    return this.usersService.inviteUser(dto, user.id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'MANAGER')
  updateUser(@Param('id') id: string, @Body() dto: any, @CurrentUser() user: any) {
    // Managers can only update users in their squad (e.g. status)
    // But Super Admin can update everything
    return this.usersService.updateUser(id, dto, user);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  deleteUser(@Param('id') id: string) {
    return this.usersService.deleteUser(id);
  }

}
