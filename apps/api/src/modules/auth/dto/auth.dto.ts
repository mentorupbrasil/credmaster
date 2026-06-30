import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'maria@exemplo.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'SenhaForte@123', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'A senha deve ter ao menos 8 caracteres' })
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'A senha deve conter maiúscula, minúscula e número',
  })
  senha!: string;

  @ApiProperty({ example: 'Maria Silva' })
  @IsString()
  @IsNotEmpty()
  nome!: string;

  @ApiProperty({ example: '12345678909', description: 'CPF (somente dígitos)' })
  @IsString()
  @Matches(/^\d{11}$/, { message: 'CPF deve conter 11 dígitos' })
  cpf!: string;

  @ApiProperty({ example: '11999998888' })
  @IsString()
  @IsNotEmpty()
  telefone!: string;
}

export class LoginDto {
  @ApiProperty({ example: 'maria@exemplo.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'SenhaForte@123' })
  @IsString()
  @IsNotEmpty()
  senha!: string;
}

export class RefreshDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

export class LogoutDto {
  @ApiProperty()
  @IsString()
  @IsOptional()
  refreshToken?: string;
}
