import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';
import { PagamentoForma } from '@prisma/client';

export class RegistrarPagamentoDto {
  @ApiProperty()
  @IsUUID()
  parcelaId!: string;

  @ApiProperty({ example: 1785.26 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  valor!: number;

  @ApiProperty({ enum: PagamentoForma, example: PagamentoForma.PIX })
  @IsEnum(PagamentoForma)
  forma!: PagamentoForma;

  @ApiPropertyOptional({ example: '2026-07-01' })
  @IsOptional()
  @IsString()
  dataPagamento?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comprovante?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observacao?: string;
}

export class EstornarPagamentoDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  motivo!: string;
}
