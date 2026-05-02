import { IsArray, IsString, ArrayMinSize, ArrayMaxSize, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetListingsDetailsDto {
  @ApiProperty({
    description: 'Liste des IDs de listings à récupérer',
    type: [String],
    example: ['listing_123', 'listing_456'],
    minItems: 1,
    maxItems: 50,
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Au moins un listingId est requis' })
  @ArrayMaxSize(50, { message: 'Maximum 50 listingIds autorisés par requête' })
  @IsString({ each: true, message: 'Chaque listingId doit être une chaîne de caractères' })
  // Note: Validation du format listingId assouplie pour compatibilité
  listingIds: string[];
}
