import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { RefreshStrategy } from './refresh.strategy'; // Import RefreshStrategy
import { PrismaModule } from '../prisma/prisma.module';
import { AuditService } from '../common/audit/audit.service';

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        // RS256 if keys present, else HS256 with secret
        privateKey: configService.get<string>('JWT_PRIVATE_KEY') || undefined,
        publicKey: configService.get<string>('JWT_PUBLIC_KEY') || undefined,
        secret: !configService.get<string>('JWT_PRIVATE_KEY')
          ? configService.get<string>('JWT_ACCESS_SECRET')
          : undefined,
        signOptions: {
          algorithm: configService.get<string>('JWT_PRIVATE_KEY') ? 'RS256' : 'HS256',
          expiresIn: configService.get<string>('JWT_ACCESS_EXPIRATION') || '15m',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    RefreshStrategy, // Add RefreshStrategy to providers
    AuditService,
  ],
  exports: [
    AuthService,
    JwtStrategy,
    RefreshStrategy, // Export RefreshStrategy
  ],
})
export class AuthModule {}
