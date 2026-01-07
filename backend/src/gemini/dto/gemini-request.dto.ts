import { IsString, IsOptional, IsArray } from 'class-validator';

export class GeminiRequestDto {
  @IsString()
  prompt: string;

  @IsOptional()
  @IsString()
  systemInstruction?: string;

  @IsOptional()
  @IsArray()
  tools?: any[];
}

