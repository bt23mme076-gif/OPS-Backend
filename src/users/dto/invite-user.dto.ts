import { IsEmail, IsEnum } from 'class-validator';

export class InviteUserDto {
  @IsEmail()
  email: string;

  @IsEnum(['SUPER_ADMIN', 'MANAGER', 'INTERN'])
  role: 'SUPER_ADMIN' | 'MANAGER' | 'INTERN';
}
