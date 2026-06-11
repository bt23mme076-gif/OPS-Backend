import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { LinkedinService } from './linkedin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/roles.decorator';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';

@ApiTags('LinkedIn')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('linkedin')
export class LinkedinController {
  constructor(private readonly service: LinkedinService) {}

  // ─── DASHBOARD ────────────────────────────────────────────────────────────
  @Get('stats')
  getStats() {
    return this.service.getStats();
  }

  // ─── POSTS ────────────────────────────────────────────────────────────────
  @Get('posts')
  findAllPosts(
    @Query('status') status?: string,
    @Query('format') format?: string,
    @Query('authorId') authorId?: string,
    @Query('search') search?: string,
  ) {
    return this.service.findAllPosts({ status, format, authorId, search });
  }

  @Get('posts/:id')
  findOnePost(@Param('id') id: string) {
    return this.service.findOnePost(id);
  }

  @Post('posts')
  createPost(@Body() dto: CreatePostDto, @CurrentUser() user: any) {
    return this.service.createPost(dto, user.id);
  }

  @Patch('posts/:id')
  updatePost(@Param('id') id: string, @Body() dto: UpdatePostDto) {
    return this.service.updatePost(id, dto);
  }

  @Delete('posts/:id')
  removePost(@Param('id') id: string) {
    return this.service.removePost(id);
  }

  // ─── LEADS ────────────────────────────────────────────────────────────────
  @Get('leads')
  findAllLeads(
    @Query('stage') stage?: string,
    @Query('leadType') leadType?: string,
    @Query('sourcePostId') sourcePostId?: string,
    @Query('assignedToId') assignedToId?: string,
    @Query('search') search?: string,
  ) {
    return this.service.findAllLeads({ stage, leadType, sourcePostId, assignedToId, search });
  }

  @Get('leads/:id')
  findOneLead(@Param('id') id: string) {
    return this.service.findOneLead(id);
  }

  @Post('leads')
  createLead(@Body() dto: CreateLeadDto, @CurrentUser() user: any) {
    return this.service.createLead(dto, user.id);
  }

  @Patch('leads/:id')
  updateLead(@Param('id') id: string, @Body() dto: UpdateLeadDto) {
    return this.service.updateLead(id, dto);
  }

  @Patch('leads/:id/stage')
  updateLeadStage(@Param('id') id: string, @Body('stage') stage: string) {
    return this.service.updateLeadStage(id, stage);
  }

  @Post('leads/:id/convert')
  convertLead(
    @Param('id') id: string,
    @Body('target') target: 'mentor' | 'student',
    @CurrentUser() user: any,
  ) {
    return this.service.convertLead(id, target, user.id);
  }

  @Delete('leads/:id')
  removeLead(@Param('id') id: string) {
    return this.service.removeLead(id);
  }
}
