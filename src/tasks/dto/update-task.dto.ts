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
}
