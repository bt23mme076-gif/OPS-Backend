import { IsOptional, IsString, Matches } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{6,14}$/, {
    message: 'Invalid WhatsApp number. Use international format, e.g. +919876543210',
  })
  whatsappNumber?: string;

  @IsOptional()
  @IsString()
  @Matches(
    /^https?:\/\/(www\.)?linkedin\.com\/(in|pub|company)\/[a-zA-Z0-9_%-]+(\/)?$/,
    { message: 'Must be a valid LinkedIn profile URL, e.g. https://linkedin.com/in/yourname' },
  )
  linkedinUrl?: string;

  @IsOptional()
  @IsString()
  repoLink?: string;
}
