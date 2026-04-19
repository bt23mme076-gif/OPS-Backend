import { IsString, IsOptional, IsEmail } from 'class-validator';

export class CreateStudentDto {
  @IsString() name: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() parentName?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() grade?: string;
  @IsOptional() @IsString() source?: string;
  @IsOptional() @IsString() notes?: string;
}
