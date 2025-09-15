import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: (configService.get<string>('JWT_PUBLIC_KEY') || configService.get<string>('JWT_ACCESS_SECRET')) ?? '',
    });
  }

  /**
   * Validates the JWT payload and returns the authenticated user.
   * @param payload The JWT payload extracted from the token.
   * @returns The user object if validation is successful.
   * @throws UnauthorizedException if the user is not found or is inactive.
   */
  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        userType: true,
        affiliationId: true,
        emailVerified: true,
        memberships: {
          select: {
            role: true,
            organization: {
              select: {
                id: true,
                name: true,
                type: true, // Corrected: use 'type' instead of 'organizationType'
              },
            },
          },
        },
      },
    });

    if (!user || !user.emailVerified) { // Check emailVerified instead of isActive
      throw new UnauthorizedException('User not found or email not verified');
    }

    return user;
  }
}
