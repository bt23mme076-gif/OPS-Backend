import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AtyantService } from './atyant.service';

@ApiTags('atyant')
@Controller('atyant')
@UseGuards(JwtAuthGuard)
export class AtyantController {
  constructor(private svc: AtyantService) {}

  @Get('mentors')
  getMentors(
    @Query('limit') limit = '50',
    @Query('skip') skip = '0',
  ) {
    return this.svc.getMentors(+limit, +skip);
  }

  @Get('mentors/active')
  getActiveMentors() {
    return this.svc.getActiveMentors();
  }

  @Get('mentors/search')
  searchMentors(@Query('q') q: string) {
    return this.svc.searchMentors(q);
  }

  @Get('users')
  getUsers(
    @Query('limit') limit = '50',
    @Query('skip') skip = '0',
  ) {
    return this.svc.getUsers(+limit, +skip);
  }

  @Get('stats')
  getStats() {
    return this.svc.getStats();
  }
}