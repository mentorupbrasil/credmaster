import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { IsCPF } from '../../../common/validators/is-cpf.validator';

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
  @IsCPF()
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
  @ApiPropertyOptional({
    description:
      'Opcional. Em navegadores o refresh token vem por cookie httpOnly.',
  })
  @IsString()
  @IsOptional()
  refreshToken?: string;
}

export class RequestPasswordResetDto {
  @ApiProperty({ example: 'maria@exemplo.com' })
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Token recebido por e-mail' })
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({ example: 'NovaSenhaForte@123' })
  @IsString()
  @MinLength(10)
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'A senha deve conter maiúsculas, minúsculas e números',
  })
  novaSenha!: string;
}

export class VerifyEmailDto {
  @ApiProperty({ description: 'Token de verificação recebido por e-mail' })
  @IsString()
  @IsNotEmpty()
  token!: string;
}

export class LogoutDto {
  @ApiProperty()
  @IsString()
  @IsOptional()
  refreshToken?: string;
}
