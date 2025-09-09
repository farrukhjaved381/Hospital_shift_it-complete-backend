import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { TokenHelpers } from './token.helpers';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly tokenHelpers: TokenHelpers,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { email, username, password, firstName, lastName, role } = registerDto;

    // Check if user already exists
    const existingUserByEmail = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUserByEmail) {
      throw new ConflictException('User with this email already exists');
    }

    const existingUserByUsername = await this.prisma.user.findUnique({
      where: { username },
    });

    if (existingUserByUsername) {
      throw new ConflictException('User with this username already exists');
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        firstName,
        lastName,
        role,
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });

    // Generate tokens
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.tokenHelpers.generateAccessToken(payload);
    const refreshToken = this.tokenHelpers.generateRefreshToken(payload);

    // Save refresh token to database
    await this.saveRefreshToken(user.id, refreshToken);

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: 15 * 60, // 15 minutes
      user,
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { emailOrUsername, password } = loginDto;

    // Find user by email or username
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: emailOrUsername },
          { username: emailOrUsername },
        ],
      },
      select: {
        id: true,
        email: true,
        username: true,
        password: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Validate password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.tokenHelpers.generateAccessToken(payload);
    const refreshToken = this.tokenHelpers.generateRefreshToken(payload);

    // Save refresh token to database
    await this.saveRefreshToken(user.id, refreshToken);

    // Remove password from response
    const { password: _, ...userResponse } = user;

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: 15 * 60, // 15 minutes
      user: userResponse,
    };
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto): Promise<AuthResponseDto> {
    const { refreshToken } = refreshTokenDto;

    try {
      // Verify refresh token
      const payload = this.tokenHelpers.verifyRefreshToken(refreshToken);

      // Check if refresh token exists in database
      const storedToken = await this.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: true },
      });

      if (!storedToken || storedToken.expiresAt < new Date()) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Get user
      const user = storedToken.user;
      if (!user.isActive) {
        throw new UnauthorizedException('User is not active');
      }

      // Generate new tokens
      const newPayload: JwtPayload = {
        sub: user.id,
        email: user.email,
        role: user.role,
      };

      const newAccessToken = this.tokenHelpers.generateAccessToken(newPayload);
      const newRefreshToken = this.tokenHelpers.generateRefreshToken(newPayload);

      // Delete old refresh token and save new one
      await this.prisma.refreshToken.delete({
        where: { token: refreshToken },
      });
      await this.saveRefreshToken(user.id, newRefreshToken);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        tokenType: 'Bearer',
        expiresIn: 15 * 60, // 15 minutes
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(refreshToken: string): Promise<{ message: string }> {
    await this.prisma.refreshToken.deleteMany({
      where: { token: refreshToken },
    });

    return { message: 'Successfully logged out' };
  }

  private async saveRefreshToken(userId: string, token: string): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.prisma.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt,
      },
    });
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (user && (await bcrypt.compare(password, user.password))) {
      const { password: _, ...result } = user;
      return result;
    }
    return null;
  }
}
