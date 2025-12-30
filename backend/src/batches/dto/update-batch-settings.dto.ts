import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateBatchSettingsDto {
  @ApiPropertyOptional({
    description: 'Gain moyen quotidien (kg/jour) pour cette loge',
    minimum: 0.1,
    example: 0.45,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  avg_daily_gain?: number;
}


