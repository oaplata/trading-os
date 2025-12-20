import { ApiProperty } from '@nestjs/swagger';

export class OpenTradeDto {
  @ApiProperty({ description: 'ID del trade a abrir' })
  tradeId: string;
}

