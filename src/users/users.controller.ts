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

  // GET /users — any authenticated user can list team members
  // (needed for assign-to dropdowns in frontend)
  @Get()
  getAllUsers() {
    return this.usersService.getAllUsers();
  }

  @Get('invites')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'admin')
  getPendingInvites() {
    return this.usersService.getPendingInvites();
  }

  @Get(':id')
  getUserById(@Param('id') id: string) {
    return this.usersService.getUserById(id);
  }

  @Post('invite')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'admin')
  async inviteUser(@Body() dto: InviteUserDto, @CurrentUser() user: any) {
    console.log('🟢 POST /users/invite called by:', user?.email || user?.id);
    console.log('🟢 Request body:', dto);
    try {
      const result = await this.usersService.inviteUser(dto, user.id);
      console.log('🟢 Response:', result);
      return result;
    } catch (error) {
      console.log('🔴 Error in inviteUser:', error.message);
      throw error;
    }
  }

  @Patch(':id/deactivate')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'admin')
  deactivateUser(@Param('id') id: string, @CurrentUser() user: any) {
    return this.usersService.deactivateUser(id, user.id);
  }

  @Patch(':id/reactivate')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'admin')
  reactivateUser(@Param('id') id: string) {
    return this.usersService.reactivateUser(id);
  }

  @Patch(':id/permissions')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'admin')
  updatePermissions(@Param('id') id: string, @Body() dto: UpdatePermissionsDto) {
    return this.usersService.updatePermissions(id, dto);
  }

  @Delete('invites/:id')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'admin')
  revokeInvite(@Param('id') id: string) {
    return this.usersService.revokeInvite(id);
  }

  // Test endpoint to verify email sending
  @Post('test-email')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'admin')
  testEmail(@Body() body: { email: string }) {
    return this.usersService.testEmail(body.email);
  }
}
