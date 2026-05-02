import { PartialType } from '@nestjs/swagger';
import { CreateRapportCroissanceDto } from './create-rapport-croissance.dto';

export class UpdateRapportCroissanceDto extends PartialType(CreateRapportCroissanceDto) {}
