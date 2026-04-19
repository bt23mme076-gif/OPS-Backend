import { IsString, IsOptional, IsNumber } from 'class-validator';

export class UpdateSessionDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() meetLink?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsNumber() studentRating?: number;
  @IsOptional() @IsNumber() outcomeRating90Day?: number;
}
