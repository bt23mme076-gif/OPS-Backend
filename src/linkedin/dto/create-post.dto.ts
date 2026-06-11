import { IsString, IsOptional, IsIn, IsInt, Min } from 'class-validator';

const FORMATS = ['text', 'image', 'carousel', 'video', 'poll', 'document', 'repost'];
const STATUSES = ['idea', 'draft', 'scheduled', 'published', 'archived'];

export class CreatePostDto {
  @IsString()
  title: string;

  @IsOptional() @IsString()
  topic?: string;

  @IsOptional() @IsString()
  hook?: string;

  @IsOptional() @IsString()
  body?: string;

  @IsOptional() @IsIn(FORMATS)
  format?: string;

  @IsOptional() @IsIn(STATUSES)
  status?: string;

  @IsOptional() @IsString()
  authorId?: string;

  @IsOptional() @IsString()
  assignedToId?: string;

  @IsOptional() @IsString()
  postUrl?: string;

  @IsOptional() @IsString()
  scheduledFor?: string;

  @IsOptional() @IsString()
  publishedAt?: string;

  @IsOptional() @IsString()
  notes?: string;

  // Metrics — optional on create, usually patched later
  @IsOptional() @IsInt() @Min(0) impressions?: number;
  @IsOptional() @IsInt() @Min(0) reactions?: number;
  @IsOptional() @IsInt() @Min(0) comments?: number;
  @IsOptional() @IsInt() @Min(0) reposts?: number;
  @IsOptional() @IsInt() @Min(0) profileViews?: number;
  @IsOptional() @IsInt() @Min(0) followersGained?: number;
}
