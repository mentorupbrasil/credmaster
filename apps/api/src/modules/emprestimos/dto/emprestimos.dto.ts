import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { PagamentoForma, TipoAmortizacao } from '@prisma/client';

export class SimularEmprestimoDto {
  @ApiProperty({ example: 10000 })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  valorPrincipal!: number;

  @ApiProperty({ example: 2, description: 'Taxa de juros ao mês (%)' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  taxaJurosMes!: number;

  @ApiProperty({ enum: TipoAmortizacao, example: TipoAmortizacao.PRICE })
  @IsEnum(TipoAmortizacao)
  tipoAmortizacao!: TipoAmortizacao;

  @ApiProperty({ example: 6 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(120)
  prazoMeses!: number;

  @ApiProperty({ example: 1, description: 'Dia do vencimento (1-28)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(28)
  diaVencimento!: number;

  @ApiPropertyOptional({ example: '2026-06-01' })
  @IsOptional()
  @IsString()
  dataContratacao?: string;

  @ApiPropertyOptional({ example: 0, description: 'Tarifas/IOF na liberação' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  tarifasIniciais?: number;
}

export class CreateEmprestimoDto extends SimularEmprestimoDto {
  @ApiProperty()
  @IsUUID()
  clienteId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  produtoId?: string;

  @ApiPropertyOptional({ example: 2, description: 'Multa por atraso (%)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  multaAtrasoPercent?: number;

  @ApiPropertyOptional({ example: 1, description: 'Juros de mora ao mês (%)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  jurosMoraMesPercent?: number;
}

export class CancelarEmprestimoDto {
  @ApiProperty()
  @IsString()
  motivo!: string;
}

export class QuitarEmprestimoDto {
  @ApiPropertyOptional({ enum: PagamentoForma, example: PagamentoForma.PIX })
  @IsOptional()
  @IsEnum(PagamentoForma)
  forma?: PagamentoForma;

  @ApiPropertyOptional({ example: 'Quitação antecipada solicitada pelo cliente' })
  @IsOptional()
  @IsString()
  observacao?: string;
}
