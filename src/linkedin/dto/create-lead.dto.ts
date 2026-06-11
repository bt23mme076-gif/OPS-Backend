import { IsString, IsOptional, IsIn, IsEmail } from 'class-validator';

const LEAD_TYPES = ['student', 'mentor', 'college_tpo', 'partner', 'investor', 'other'];
const STAGES = ['new', 'engaged', 'in_conversation', 'qualified', 'converted', 'lost'];
const ENGAGEMENT = ['comment', 'reaction', 'dm', 'connection_request', 'profile_view', 'inbound'];

export class CreateLeadDto {
  @IsString()
  name: string;

  @IsOptional() @IsString()
  headline?: string;

  @IsOptional() @IsString()
  linkedinUrl?: string;

  @IsOptional() @IsEmail()
  email?: string;

  @IsOptional() @IsString()
  phone?: string;

  @IsOptional() @IsIn(LEAD_TYPES)
  leadType?: string;

  @IsOptional() @IsIn(STAGES)
  stage?: string;

  @IsOptional() @IsString()
  sourcePostId?: string;

  @IsOptional() @IsIn(ENGAGEMENT)
  engagementType?: string;

  @IsOptional() @IsString()
  assignedToId?: string;

  @IsOptional() @IsString()
  notes?: string;
}
