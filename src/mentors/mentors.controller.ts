import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { MentorsService } from './mentors.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/roles.decorator';
import { CreateMentorDto } from './dto/create-mentor.dto';
import { UpdateMentorDto } from './dto/update-mentor.dto';

@ApiTags('Mentors')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('mentors')
export class MentorsController {
  constructor(private mentorsService: MentorsService) {}

  @Get()
  findAll(
    @Query('stage') stage?: string,
    @Query('domain') domain?: string,
    @Query('search') search?: string,
    @Query('assignedTo') assignedTo?: string,
  ) {
    return this.mentorsService.findAll({ stage, domain, search, assignedTo });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.mentorsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateMentorDto, @CurrentUser() user: any) {
    return this.mentorsService.create(dto, user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateMentorDto,
    @CurrentUser() user: any,
  ) {
    return this.mentorsService.update(id, dto, user.id);
  }

  @Patch(':id/stage')
  updateStage(
    @Param('id') id: string,
    @Body('stage') stage: string,
    @CurrentUser() user: any,
  ) {
    return this.mentorsService.updateStage(id, stage, user.id);
  }

  @Patch(':id/assign')
  assign(
    @Param('id') id: string,
    @Body('assignToId') assignToId: string,
    @CurrentUser() user: any,
  ) {
    return this.mentorsService.assign(id, assignToId, user.id);
  }

  @Post(':id/notes')
  addNote(
    @Param('id') id: string,
    @Body('note') note: string,
    @CurrentUser() user: any,
  ) {
    return this.mentorsService.addNote(id, note, user.id);
  }
}
