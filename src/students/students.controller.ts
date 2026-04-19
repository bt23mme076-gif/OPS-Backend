import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { StudentsService } from './students.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/roles.decorator';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';

@ApiTags('Students')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('students')
export class StudentsController {
  constructor(private studentsService: StudentsService) {}

  @Get()
  findAll(
    @Query('stage') stage?: string,
    @Query('domain') domain?: string,
    @Query('search') search?: string,
    @Query('assignedTo') assignedTo?: string,
    @Query('placementStatus') placementStatus?: string,
  ) {
    return this.studentsService.findAll({ stage, domain, search, assignedTo, placementStatus });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.studentsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateStudentDto, @CurrentUser() user: any) {
    return this.studentsService.create(dto, user.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateStudentDto, @CurrentUser() user: any) {
    return this.studentsService.update(id, dto, user.id);
  }

  @Patch(':id/stage')
  updateStage(@Param('id') id: string, @Body('stage') stage: string, @CurrentUser() user: any) {
    return this.studentsService.updateStage(id, stage, user.id);
  }

  @Patch(':id/assign')
  assign(@Param('id') id: string, @Body('assignToId') assignToId: string, @CurrentUser() user: any) {
    return this.studentsService.assign(id, assignToId, user.id);
  }

  @Post(':id/notes')
  addNote(@Param('id') id: string, @Body('note') note: string, @CurrentUser() user: any) {
    return this.studentsService.addNote(id, note, user.id);
  }
}
