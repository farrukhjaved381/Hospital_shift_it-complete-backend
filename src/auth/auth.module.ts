import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { RefreshStrategy } from './refresh.strategy'; // Import RefreshStrategy
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        // Use access token secret from env (align with .env keys)
        secret: configService.get<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          // Align with .env key JWT_ACCESS_EXPIRATION (e.g., '15m')
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
    // Removed TokenHelpers
  ],
  exports: [
    AuthService,
    JwtStrategy,
    RefreshStrategy, // Export RefreshStrategy
  ],
})
export class AuthModule {}
