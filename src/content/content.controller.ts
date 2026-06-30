import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ContentService } from './content.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/roles.decorator';
import { CreateUploadedPostDto } from './dto/create-uploaded-post.dto';

@UseGuards(JwtAuthGuard)
@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get()
  findAll() {
    return this.contentService.findAll();
  }

  @Get('uploaded-posts')
  getUploadedPosts() {
    return this.contentService.getUploadedPosts();
  }

  @Post('uploaded-posts')
  createUploadedPost(@Body() body: CreateUploadedPostDto, @CurrentUser() user: any) {
    return this.contentService.createUploadedPost(body, user);
  }

  @Post()
  create(@Body() body: any) {
    return this.contentService.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.contentService.update(Number(id), body);
  }

  @Delete('uploaded-posts/:id')
  deleteUploadedPost(@Param('id') id: string) {
    return this.contentService.deleteUploadedPost(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.contentService.remove(Number(id));
  }
}