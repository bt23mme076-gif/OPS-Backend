import { IsString, IsOptional } from 'class-validator';

export class UpdateTaskDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() priority?: string;
  @IsOptional() @IsString() assignedToId?: string;
  @IsOptional() @IsString() dueDate?: string;
  @IsOptional() @IsString() proofLink?: string;
  @IsOptional() @IsString() feedback?: string;
  @IsOptional() @IsString() squad?: string;

  @IsOptional() @IsString() submissionPrLink?: string;
  @IsOptional() @IsString() submissionDocLink?: string;
  @IsOptional() @IsString() submissionSummary?: string;
  @IsOptional() @IsString() submissionBlockers?: string;
  @IsOptional() @IsString() submittedAt?: string;
  @IsOptional() @IsString() reviewStatus?: string;
  @IsOptional() @IsString() reviewFeedback?: string;
  @IsOptional() @IsString() reviewedAt?: string;
}