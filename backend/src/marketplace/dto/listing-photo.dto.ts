import { IsString, IsNumber, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ListingPhotoDto {
  @ApiProperty({ description: 'URL de la photo', example: '/uploads/marketplace/photo123.jpg' })
  @IsString()
  url: string;

  @ApiPropertyOptional({ 
    description: 'URL de la miniature', 
    example: '/uploads/marketplace/thumb_photo123.jpg' 
  })
  @IsString()
  @IsOptional()
  thumbnailUrl?: string;

  @ApiPropertyOptional({ description: 'Ordre d\'affichage', example: 1 })
  @IsNumber()
  @IsOptional()
  order?: number;

  @ApiPropertyOptional({ description: 'Légende de la photo', example: 'Vue de face' })
  @IsString()
  @IsOptional()
  caption?: string;

  @ApiPropertyOptional({ description: 'Date d\'upload', example: '2026-01-10T12:00:00Z' })
  @IsString()
  @IsOptional()
  uploadedAt?: string;
}

export class UploadPhotoDto {
  @ApiPropertyOptional({ description: 'Légende de la photo' })
  @IsString()
  @IsOptional()
  caption?: string;
}
