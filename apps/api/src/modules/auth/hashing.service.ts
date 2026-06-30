import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { createHash } from 'crypto';

@Injectable()
export class HashingService {
  constructor(private readonly config: ConfigService) {}

  hashPassword(plain: string): Promise<string> {
    return argon2.hash(plain, {
      type: argon2.argon2id,
      memoryCost: this.config.get<number>('argon2.memoryCost', 19456),
      timeCost: this.config.get<number>('argon2.timeCost', 2),
      parallelism: this.config.get<number>('argon2.parallelism', 1),
    });
  }

  verifyPassword(hash: string, plain: string): Promise<boolean> {
    return argon2.verify(hash, plain).catch(() => false);
  }

  /** SHA-256 para armazenar/buscar refresh tokens sem guardar o token cru. */
  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
