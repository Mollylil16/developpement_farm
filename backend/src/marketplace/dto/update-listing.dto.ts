import { PartialType } from '@nestjs/swagger';
import { CreateListingDto } from './create-listing.dto';
import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateListingDto extends PartialType(CreateListingDto) {
  @ApiPropertyOptional({
    description: 'Statut du listing',
    enum: ['available', 'reserved', 'pending_delivery', 'sold', 'removed'],
  })
  @IsOptional()
  @IsEnum(['available', 'reserved', 'pending_delivery', 'sold', 'removed'])
  status?: string;
}
