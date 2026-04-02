import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class QueryProductDto {
  @ApiPropertyOptional({ example: 'laptop' }) @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional({ example: true }) @IsOptional() @Transform(({ value }) => value === 'true' || value === true) @IsBoolean() isActive?: boolean;
}
