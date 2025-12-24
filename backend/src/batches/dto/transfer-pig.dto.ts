import { IsString, IsOptional } from 'class-validator';

export class TransferPigDto {
  @IsString()
  pig_id: string;

  @IsString()
  from_batch_id: string;

  @IsString()
  to_batch_id: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

