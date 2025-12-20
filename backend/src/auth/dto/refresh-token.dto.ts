import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Token de rafraîchissement',
    example: 'uuid-refresh-token',
  })
  @IsString()
  @IsNotEmpty({ message: 'Le token de rafraîchissement est requis' })
  refresh_token: string;
}
