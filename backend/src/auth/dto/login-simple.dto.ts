import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginSimpleDto {
  @ApiProperty({
    description: 'Email ou numéro de téléphone',
    example: 'user@example.com ou 0123456789',
  })
  @IsString({ message: "L'identifiant doit être une chaîne de caractères." })
  @IsNotEmpty({ message: 'Veuillez entrer votre email ou numéro de téléphone.' })
  identifier: string;
}
