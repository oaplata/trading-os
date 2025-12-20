import { IsUUID, IsArray, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReorderRulesDto {
  @ApiProperty({
    description: 'ID del setup',
    example: 'uuid',
  })
  @IsUUID()
  setupId: string;

  @ApiProperty({
    description: 'Array de IDs de reglas en el orden deseado',
    example: ['uuid1', 'uuid2', 'uuid3'],
    type: [String],
  })
  @IsArray()
  @IsUUID(undefined, { each: true })
  @ArrayMinSize(1)
  ruleIds: string[];
}

