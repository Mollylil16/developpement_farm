import { PartialType } from '@nestjs/swagger';
import { CreateOfferDto } from './create-offer.dto';
import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateOfferDto extends PartialType(CreateOfferDto) {
  @ApiPropertyOptional({
    description: "Statut de l'offre",
    enum: ['pending', 'accepted', 'rejected', 'countered', 'expired', 'withdrawn'],
  })
  @IsOptional()
  @IsEnum(['pending', 'accepted', 'rejected', 'countered', 'expired', 'withdrawn'])
  status?: string;
}
