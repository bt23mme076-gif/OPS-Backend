import { IsEmail, IsEnum } from 'class-validator';

export class InviteUserDto {
  @IsEmail()
  email: string;

  @IsEnum(['admin', 'sales', 'content', 'outreach', 'viewer'])
  role: string;
}
