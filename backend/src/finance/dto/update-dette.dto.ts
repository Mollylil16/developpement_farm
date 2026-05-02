import { PartialType } from '@nestjs/swagger';
import { CreateDetteDto } from './create-dette.dto';

export class UpdateDetteDto extends PartialType(CreateDetteDto) {}

