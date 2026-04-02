import { IsInt, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ReserveStockDto {
  @ApiProperty({ example: 2, description: 'Units to reserve or release' })
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  quantity: number;
}
