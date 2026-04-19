import { IsString, IsOptional, IsEmail } from 'class-validator';

export class UpdateMentorDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() linkedin?: string;
  @IsOptional() @IsString() company?: string;
  @IsOptional() @IsString() domain?: string;
  @IsOptional() @IsString() source?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() stage?: string;
}
