import { IsUUID, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrderItemDto {
  @ApiProperty() @IsUUID() productId: string;
  @ApiProperty({ minimum: 1 }) @IsInt() @Min(1) quantity: number;
}
