import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { OutreachService } from './outreach.service';

@Controller('outreach')
export class OutreachController {
  constructor(private readonly outreachService: OutreachService) {}

  @Get()
  findAll() {
    return this.outreachService.findAll();
  }

  @Post()
  create(@Body() body: any) {
    return this.outreachService.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.outreachService.update(Number(id), body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.outreachService.remove(Number(id));
  }
}