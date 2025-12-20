import { PartialType } from '@nestjs/swagger';
import { CreateSetupDto } from './create-setup.dto';

export class UpdateSetupDto extends PartialType(CreateSetupDto) {}

