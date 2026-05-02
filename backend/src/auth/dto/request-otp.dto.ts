import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class RequestOtpDto {
  @ApiProperty({
    description: "Email ou numéro de téléphone (ex: user@example.com ou +2250102030405)",
    example: 'user@example.com',
  })
  @IsString()
  @IsNotEmpty()
  identifier: string;
}


