import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import {
  AuthUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { AuthService } from './auth.service';
import {
  LoginDto,
  LogoutDto,
  RefreshDto,
  RegisterDto,
  RequestPasswordResetDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from './dto/auth.dto';

const REFRESH_COOKIE = 'refresh_token';

function meta(req: Request) {
  return {
    ip: req.ip,
    userAgent: req.headers['user-agent'] as string | undefined,
  };
}

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  private refreshCookieOptions(maxAge?: number) {
    const prod = this.config.get<string>('nodeEnv') === 'production';
    const sameSite = prod && !process.env.VERCEL ? ('none' as const) : ('lax' as const);
    return {
      httpOnly: true,
      secure: prod,
      sameSite,
      path: '/',
      ...(maxAge !== undefined ? { maxAge } : {}),
    };
  }

  private setRefreshCookie(res: Response, refreshToken: string) {
    const maxAge = this.config.get<number>('jwt.refreshTtl', 2592000) * 1000;
    res.cookie(REFRESH_COOKIE, refreshToken, this.refreshCookieOptions(maxAge));
  }

  private clearRefreshCookie(res: Response) {
    res.clearCookie(REFRESH_COOKIE, this.refreshCookieOptions());
  }

  /** Remove o refresh token do corpo da resposta (fica apenas no cookie). */
  private sanitize(payload: Record<string, unknown>) {
    const clone: Record<string, unknown> = { ...payload };
    delete clone.refreshToken;
    return clone;
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(dto, meta(req));
    this.setRefreshCookie(res, result.refreshToken);
    return this.sanitize(result);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto, meta(req));
    this.setRefreshCookie(res, result.refreshToken);
    return this.sanitize(result);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(
    @Body() dto: RefreshDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies?.[REFRESH_COOKIE] ?? dto.refreshToken;
    const result = await this.authService.refresh(token, meta(req));
    this.setRefreshCookie(res, result.refreshToken);
    return this.sanitize(result);
  }

  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(
    @CurrentUser() user: AuthUser,
    @Body() dto: LogoutDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies?.[REFRESH_COOKIE] ?? dto.refreshToken;
    const result = await this.authService.logout(user.sub, token);
    this.clearRefreshCookie(res);
    return result;
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @Post('verificar-email')
  verificarEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verificarEmail(dto.token);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @Post('esqueci-senha')
  esqueciSenha(@Body() dto: RequestPasswordResetDto) {
    return this.authService.solicitarRedefinicaoSenha(dto.email);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @Post('redefinir-senha')
  redefinirSenha(@Body() dto: ResetPasswordDto, @Req() req: Request) {
    return this.authService.redefinirSenha(dto.token, dto.novaSenha, meta(req));
  }

  @ApiBearerAuth()
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.authService.me(user.sub);
  }
}
