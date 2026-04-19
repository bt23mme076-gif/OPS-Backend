import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  // GET /dashboard — used by frontend useGetDashboardQuery
  @Get()
  getDashboard() {
    return this.dashboardService.getDashboard();
  }

  // GET /dashboard/omtm — legacy endpoint kept for compatibility
  @Get('omtm')
  getOmtm() {
    return this.dashboardService.getOmtm();
  }
}
