import { ApiPropertyOptional, ApiProperty, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Min,
  IsEnum,
} from 'class-validator';
import { ClienteStatus } from '@prisma/client';
import { IsCPF } from '../../../common/validators/is-cpf.validator';

export class CreateClienteDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  nome!: string;

  @ApiProperty({ description: 'CPF (somente dígitos)' })
  @IsString()
  @IsCPF()
  cpf!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  telefone!: string;

  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rg?: string;

  @ApiPropertyOptional({ example: 5000.0 })
  @IsOptional()
  @Type(() => Number)
  rendaMensal?: number;

  @ApiPropertyOptional({ example: '1990-05-20' })
  @IsOptional()
  @IsString()
  dataNascimento?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  whatsapp?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observacoes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logradouro?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  numero?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cidade?: string;

  @ApiPropertyOptional({ example: 'SP' })
  @IsOptional()
  @Matches(/^[A-Z]{2}$/)
  uf?: string;

  @ApiPropertyOptional({ example: '01001000' })
  @IsOptional()
  @IsString()
  cep?: string;
}

export class UpdateClienteDto extends PartialType(CreateClienteDto) {}

export class ReprovarClienteDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  motivo!: string;
}

export class EnderecoDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  logradouro!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  numero?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  complemento?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bairro?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  cidade!: string;

  @ApiProperty({ example: 'SP' })
  @IsString()
  @Matches(/^[A-Z]{2}$/, { message: 'UF deve ter 2 letras maiúsculas' })
  uf!: string;

  @ApiProperty({ example: '01001000' })
  @IsString()
  @Matches(/^\d{8}$/, { message: 'CEP deve conter 8 dígitos' })
  cep!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  principal?: boolean;
}

export class ListarClientesQuery {
  @ApiPropertyOptional({ enum: ClienteStatus })
  @IsOptional()
  @IsEnum(ClienteStatus)
  status?: ClienteStatus;

  @ApiPropertyOptional({ description: 'Busca por nome, CPF ou e-mail' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize = 20;
}
