import { IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateSessionDto {
  @IsString() studentId: string;
  @IsString() mentorId: string;
  // frontend sends 'type', schema has 'sessionType'
  @IsString() type: string;
  @IsString() format: string;
  @IsDateString() scheduledAt: string;
  @IsOptional() @IsString() meetLink?: string;
  @IsOptional() @IsString() notes?: string;
}
