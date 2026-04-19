// create-role.dto.ts
import { IsString, IsEnum, IsUUID, IsOptional, IsInt, Min } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  title: string;

  @IsString()
  company: string;

  @IsUUID()
  postedBy: string;

  @IsEnum(['internship', 'full_time', 'contract'])
  roleType: string;

  @IsEnum(['swe', 'product', 'data', 'design', 'finance', 'core_engineering', 'marketing', 'operations', 'other'])
  @IsOptional()
  domain?: string;

  @IsInt()
  @Min(0)
  minSkillScore: number;

  @IsString()
  @IsOptional()
  hiringPlaybook?: string;
}
