import { IsString, IsOptional, IsEmail } from 'class-validator';

export class CreateMentorDto {
  // Frontend sends 'name' — map to fullName
  @IsString()
  name: string;

  @IsOptional() @IsEmail()
  email?: string;

  @IsOptional() @IsString()
  phone?: string;

  @IsOptional() @IsString()
  linkedin?: string;

  // Frontend sends 'company' — map to currentCompany
  @IsOptional() @IsString()
  company?: string;

  @IsOptional() @IsString()
  domain?: string;

  @IsOptional() @IsString()
  source?: string;

  @IsOptional() @IsString()
  notes?: string;
}
