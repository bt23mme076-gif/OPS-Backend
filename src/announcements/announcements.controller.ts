import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AnnouncementsService } from './announcements.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/roles.decorator';

@ApiTags('Announcements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Get()
  findAll() {
    return this.announcementsService.findAll();
  }

  @Get('latest')
  findLatest() {
    return this.announcementsService.findLatest();
  }

  @Post()
  create(@Body() body: any, @CurrentUser() user: any) {
    if (user?.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only Super Admin can create announcements');
    }

    return this.announcementsService.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    if (user?.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only Super Admin can update announcements');
    }

    return this.announcementsService.update(Number(id), body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    if (user?.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only Super Admin can delete announcements');
    }

    return this.announcementsService.remove(Number(id));
  }
}