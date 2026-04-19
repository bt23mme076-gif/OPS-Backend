import { IsArray, ValidateNested, IsString, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

class PermissionItemDto {
  @IsString()
  module: string;

  @IsBoolean()
  canRead: boolean;

  @IsBoolean()
  canWrite: boolean;
}

export class UpdatePermissionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionItemDto)
  permissions: PermissionItemDto[];
}
