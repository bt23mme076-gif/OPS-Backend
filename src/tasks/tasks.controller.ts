import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/roles.decorator';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@ApiTags('Tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.tasksService.getTasksForRole(user);
  }

  @Get('my')
  getMyTasks(@CurrentUser() user: any) {
    return this.tasksService.getTasksForRole({ ...user, viewMode: 'mine' });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tasksService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateTaskDto, @CurrentUser() user: any) {
    return this.tasksService.create(dto, user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto, @CurrentUser() user: any) {
    return this.tasksService.update(id, dto, user);
  }

  @Patch(':id/approve')
  approve(@Param('id') id: string, @CurrentUser() user: any) {
    return this.tasksService.approve(id, user);
  }

  @Patch(':id/feedback')
  addFeedback(@Param('id') id: string, @Body() body: { feedback: string }, @CurrentUser() user: any) {
    return this.tasksService.addFeedback(id, body.feedback, user);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.tasksService.delete(id);
  }

}
