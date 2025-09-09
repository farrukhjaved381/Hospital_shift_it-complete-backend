import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class TokenHelpers {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  generateAccessToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRATION', '15m'),
    });
  }

  generateRefreshToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION', '7d'),
    });
  }

  verifyRefreshToken(token: string): JwtPayload {
    return this.jwtService.verify(token, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
    });
  }

  generateRandomToken(): string {
    return this.jwtService.sign(
      { random: Math.random().toString(36) },
      { expiresIn: '7d' }
    );
  }
}
