import { IsString, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BatchToIndividualOptionsDto } from './batch-to-individual.dto';
import { IndividualToBatchOptionsDto } from './individual-to-batch.dto';

export class PreviewBatchToIndividualDto {
  @ApiProperty({ description: 'ID de la bande à convertir' })
  @IsString()
  batchId: string;

  @ApiProperty({ description: 'Options de migration', type: BatchToIndividualOptionsDto })
  options: BatchToIndividualOptionsDto;
}

export class PreviewIndividualToBatchDto {
  @ApiProperty({ description: 'IDs des animaux à regrouper', type: [String] })
  @IsArray()
  @IsString({ each: true })
  pigIds: string[];

  @ApiProperty({ description: 'Options de migration', type: IndividualToBatchOptionsDto })
  options: IndividualToBatchOptionsDto;
}

