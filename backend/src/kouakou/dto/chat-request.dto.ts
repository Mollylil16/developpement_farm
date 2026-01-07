import { IsString, IsOptional, IsObject } from 'class-validator';

export class ChatRequestDto {
  @IsString()
  message: string;

  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsOptional()
  @IsObject()
  context?: any;
}

