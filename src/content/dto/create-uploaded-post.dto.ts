import { IsString, IsIn, IsNotEmpty } from 'class-validator';

export class CreateUploadedPostDto {
  @IsIn(['Instagram', 'LinkedIn'])
  platform: 'Instagram' | 'LinkedIn';

  @IsString()
  @IsNotEmpty()
  postUrl: string;
}
