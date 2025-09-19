import { ConflictException, Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { hashString, verifyHash } from './utils/hash.util';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { Role, UserType, OrganizationType } from '@prisma/client'; // Ensure UserType is imported
import { randomBytes } from 'crypto';
import { EmailService } from '../common/email/email.service';
import { AuditService } from '../common/audit/audit.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly email: EmailService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Registers a new user.
   * @param registerDto User registration data.
   * @returns AuthResponseDto containing user details and tokens.
   */
  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    // Validate against self-assigning admin roles
    if (registerDto.role && ([Role.HOSPITAL_ADMIN, Role.SCHOOL_ADMIN, Role.SUPER_ADMIN] as Role[]).includes(registerDto.role)) {
      throw new BadRequestException('Cannot self-register as an admin role.');
    }

    const existingUser = await this.prisma.user.findUnique({ where: { email: registerDto.email } });
    if (existingUser) {
      throw new ConflictException('User with this email already exists.');
    }

    const passwordHash = await hashString(registerDto.password);

    let userRole: Role = registerDto.role || Role.STUDENT; // Default to STUDENT if not provided
    let userAffiliationId: string | null = registerDto.affiliationId || null;
    let userUserType: UserType = UserType.NONE; // Default user type

    // Determine user type and affiliation based on provided affiliation details
    if (registerDto.affiliationId && registerDto.affiliationType) {
      const organization = await this.prisma.organization.findUnique({ where: { id: registerDto.affiliationId } });
      if (!organization || organization.type !== registerDto.affiliationType) {
        throw new BadRequestException('Invalid affiliationId or affiliationType.');
      }
      if (registerDto.affiliationType === OrganizationType.HOSPITAL) {
        userUserType = UserType.HOSPITAL_USER;
      } else if (registerDto.affiliationType === OrganizationType.SCHOOL) {
        userUserType = UserType.SCHOOL_USER;
      }
    } else if (registerDto.affiliationId || registerDto.affiliationType) {
      // If only one of affiliationId or affiliationType is provided, it's a bad request
      throw new BadRequestException('Both affiliationId and affiliationType must be provided if affiliating.');
    }

    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email,
        passwordHash, // Use passwordHash
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        role: userRole,
        userType: userUserType,
        affiliationId: userAffiliationId,
        emailVerified: false, // Email verification required for self-registered users
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        userType: true,
        affiliationId: true,
        emailVerified: true,
      },
    });

    const { accessToken, refreshToken } = await this.generateTokens(user.id, user.role, user.userType, user.affiliationId);
    const tokenRecordId = await this.saveRefreshToken(user.id, refreshToken);
    const compositeRefreshToken = `${tokenRecordId}.${refreshToken}`;

    // Create email verification token (dev: return it via log)
    const emailTokenPlain = randomBytes(32).toString('hex');
    const emailTokenHash = await hashString(emailTokenPlain);
    const emailExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h
    const emailToken = await this.prisma.emailVerification.create({
      data: { userId: user.id, tokenHash: emailTokenHash, expiresAt: emailExpiresAt },
    });
    const composite = `${emailToken.id}.${emailTokenPlain}`;
    const appUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
    const link = `${appUrl}/verify-email?token=${encodeURIComponent(composite)}`;
    await this.email.send(user.email, 'Verify your email', `Click to verify: ${link}`);

    await this.audit.log(user.id, 'USER_REGISTERED', { email: user.email });
    const resp: AuthResponseDto = {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        userType: user.userType,
        affiliationId: user.affiliationId,
        emailVerified: user.emailVerified,
      },
      accessToken,
      refreshToken: compositeRefreshToken,
      tokenType: 'Bearer',
      expiresIn: this.getAccessTtlSeconds(),
    };
    return resp;
  }

  /**
   * Logs in a user.
   * @param loginDto User login data.
   * @returns AuthResponseDto containing user details and tokens.
   */
  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        passwordHash: true, // Select passwordHash
        role: true,
        userType: true,
        affiliationId: true,
        emailVerified: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    if (!user.emailVerified) {
      throw new UnauthorizedException('Email not verified. Please check your inbox.');
    }

    const isPasswordValid = await verifyHash(loginDto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const { accessToken, refreshToken } = await this.generateTokens(user.id, user.role, user.userType, user.affiliationId);
    const tokenRecordId = await this.saveRefreshToken(user.id, refreshToken);
    const compositeRefreshToken = `${tokenRecordId}.${refreshToken}`;

    const { passwordHash, ...rest } = user; // Exclude passwordHash from response
    const userResponse = {
      id: rest.id,
      email: rest.email,
      firstName: rest.firstName,
      lastName: rest.lastName,
      role: rest.role,
      userType: rest.userType,
      affiliationId: rest.affiliationId,
      emailVerified: rest.emailVerified,
    };

    await this.audit.log(user.id, 'USER_LOGIN_SUCCESS', { email: user.email });
    const resp: AuthResponseDto = {
      user: userResponse,
      accessToken,
      refreshToken: compositeRefreshToken,
      tokenType: 'Bearer',
      expiresIn: this.getAccessTtlSeconds(),
    };
    return resp;
  }

  /**
   * Request password reset: creates a PasswordReset token and returns it (for dev/testing).
   */
  async forgotPassword(dto: { email: string }): Promise<{ message: string; resetToken?: string }> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      // Don't reveal user existence
      return { message: 'If the email exists, a reset was sent' };
    }
    const tokenPlain = randomBytes(48).toString('hex');
    const tokenHash = await hashString(tokenPlain);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 2); // 2 hours
    const created = await this.prisma.passwordReset.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });
    const composite = `${created.id}.${tokenPlain}`;
    const appUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
    const link = `${appUrl}/reset-password?token=${encodeURIComponent(composite)}`;
    await this.email.send(user.email, 'Password reset', `Reset your password: ${link}`);
    await this.audit.log(user.id, 'PASSWORD_RESET_REQUESTED');
    return { message: 'Reset email queued' };
  }

  /**
   * Reset password with token; revokes all refresh tokens on success.
   */
  async resetPassword(dto: { token: string; newPassword: string }): Promise<{ message: string }> {
    const { tokenId, tokenPlain } = this.parseCompositeToken(dto.token);
    const record = await this.prisma.passwordReset.findUnique({ where: { id: tokenId } });
    if (!record || record.used || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }
    const ok = await verifyHash(tokenPlain, record.tokenHash);
    if (!ok) throw new UnauthorizedException('Invalid reset token');
    const passwordHash = await hashString(dto.newPassword);
    await this.prisma.user.update({ where: { id: record.userId }, data: { passwordHash } });
    await this.prisma.passwordReset.update({ where: { id: record.id }, data: { used: true } });
    await this.revokeAllUserRefreshTokens(record.userId);
    await this.audit.log(record.userId, 'PASSWORD_RESET_COMPLETED');
    return { message: 'Password reset successful' };
  }

  /**
   * Verify email using composite token created at registration.
   */
  async verifyEmail(token: string): Promise<{ message: string }> {
    const { tokenId, tokenPlain } = this.parseCompositeToken(token);
    const rec = await this.prisma.emailVerification.findUnique({ where: { id: tokenId } });
    if (!rec || rec.used || rec.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired verification token');
    }
    const ok = await verifyHash(tokenPlain, rec.tokenHash);
    if (!ok) throw new UnauthorizedException('Invalid verification token');
    await this.prisma.user.update({ where: { id: rec.userId }, data: { emailVerified: true } });
    await this.prisma.emailVerification.update({ where: { id: rec.id }, data: { used: true } });
    await this.audit.log(rec.userId, 'USER_EMAIL_VERIFIED');
    return { message: 'Email verified' };
  }

  /**
   * Accept an admin invite using composite invite token (inviteId.tokenPlain).
   */
  async acceptInvite(dto: { token: string; firstName: string; lastName: string; password: string }): Promise<AuthResponseDto> {
    const { tokenId, tokenPlain } = this.parseCompositeToken(dto.token);
    const invite = await this.prisma.invite.findUnique({ where: { id: tokenId } });
    if (!invite || invite.used || invite.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired invite');
    }
    const ok = await verifyHash(tokenPlain, invite.token);
    if (!ok) throw new UnauthorizedException('Invalid invite token');

    const org = invite.orgId ? await this.prisma.organization.findUnique({ where: { id: invite.orgId } }) : null;
    if (!org) throw new UnauthorizedException('Invite organization not found');

    let user = await this.prisma.user.findUnique({ where: { email: invite.inviteeEmail } });
    const passwordHash = await hashString(dto.password);
    const userType = org.type === 'HOSPITAL' ? UserType.HOSPITAL_USER : UserType.SCHOOL_USER;

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: invite.inviteeEmail,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          role: invite.roleToCreate!,
          userType,
          affiliationId: invite.orgId!,
          emailVerified: true,
        },
      });
    } else {
      // upgrade existing user
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          role: invite.roleToCreate!,
          userType,
          affiliationId: invite.orgId!,
          emailVerified: true,
        },
      });
    }

    // Ensure membership
    const existingMembership = await this.prisma.membership.findFirst({ where: { userId: user.id, organizationId: invite.orgId! } });
    if (!existingMembership) {
      await this.prisma.membership.create({
        data: { userId: user.id, organizationId: invite.orgId!, role: invite.roleToCreate! },
      });
    }

    await this.prisma.invite.update({ where: { id: invite.id }, data: { used: true } });

    const { accessToken, refreshToken } = await this.generateTokens(user.id, invite.roleToCreate!, userType, invite.orgId!);
    const tokenRecordId = await this.saveRefreshToken(user.id, refreshToken);
    const compositeRefreshToken = `${tokenRecordId}.${refreshToken}`;

    const userResp = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, userType: true, affiliationId: true, emailVerified: true },
    });

    await this.audit.log(user.id, 'INVITE_ACCEPTED', { userId: user.id, orgId: invite.orgId, role: invite.roleToCreate });
    const resp: AuthResponseDto = {
      user: userResp!,
      accessToken,
      refreshToken: compositeRefreshToken,
      tokenType: 'Bearer',
      expiresIn: this.getAccessTtlSeconds(),
    };
    return resp;
  }

  /**
   * Refreshes access and refresh tokens using a rotating refresh token strategy.
   * @param userId The ID of the user requesting token refresh.
   * @param currentRefreshToken The current refresh token provided by the client.
   * @returns AuthResponseDto with new tokens and user details.
   * @throws UnauthorizedException if the refresh token is invalid, revoked, or expired.
   */
  async refreshTokens(dto: RefreshTokenDto): Promise<AuthResponseDto> {
    const { tokenId, tokenPlain } = this.parseCompositeToken(dto.refreshToken);
    const storedRefreshToken = await this.prisma.refreshToken.findUnique({ where: { id: tokenId } });

    if (!storedRefreshToken) {
      this.logger.warn(`No refresh token found for id ${tokenId}`);
      throw new UnauthorizedException('Invalid refresh token.');
    }

    const isTokenValid = await verifyHash(tokenPlain, storedRefreshToken.tokenHash);
    if (!isTokenValid) {
      this.logger.warn(`Invalid refresh token for id ${tokenId}. Revoking all tokens due to potential replay attack.`);
      // If an invalid refresh token is presented, revoke all tokens for the user
      await this.revokeAllUserRefreshTokens(storedRefreshToken.userId);
      throw new UnauthorizedException('Invalid refresh token. All sessions revoked.');
    }

    if (storedRefreshToken.revoked || storedRefreshToken.expiresAt < new Date()) {
      this.logger.warn(`Revoked or expired refresh token used for user ${storedRefreshToken.userId}`);
      throw new UnauthorizedException('Refresh token revoked or expired.');
    }

    // Revoke the old token immediately
    await this.prisma.refreshToken.update({
      where: { id: storedRefreshToken.id },
      data: { revoked: true },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: storedRefreshToken.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        userType: true,
        affiliationId: true,
        emailVerified: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found.');
    }

    const { accessToken, refreshToken: newRefreshTokenPlain } = await this.generateTokens(
      user.id,
      user.role,
      user.userType,
      user.affiliationId,
    );
    const newTokenId = await this.saveRefreshToken(user.id, newRefreshTokenPlain, storedRefreshToken.id);

    const resp: AuthResponseDto = {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        userType: user.userType,
        affiliationId: user.affiliationId,
        emailVerified: user.emailVerified,
      },
      accessToken,
      refreshToken: `${newTokenId}.${newRefreshTokenPlain}`,
      tokenType: 'Bearer',
      expiresIn: this.getAccessTtlSeconds(),
    };
    return resp;
  }

  /**
   * Revokes a specific refresh token.
   * @param userId The ID of the user.
   * @param refreshTokenPlain The plaintext refresh token to revoke.
   */
  async logout(dto: RefreshTokenDto): Promise<void> {
    const { tokenId, tokenPlain } = this.parseCompositeToken(dto.refreshToken);
    const storedToken = await this.prisma.refreshToken.findUnique({ where: { id: tokenId } });
    if (!storedToken) return;
    const isTokenMatch = await verifyHash(tokenPlain, storedToken.tokenHash);
    if (!isTokenMatch) return;
    await this.prisma.refreshToken.update({ where: { id: storedToken.id }, data: { revoked: true } });
    await this.audit.log(storedToken.userId, 'USER_LOGOUT');
  }

  /**
   * Revokes all active refresh tokens for a user.
   * Used in security-sensitive operations like password reset or detected token replay.
   * @param userId The ID of the user whose tokens should be revoked.
   */
  async revokeAllUserRefreshTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId: userId, revoked: false },
      data: { revoked: true },
    });
    this.logger.log(`All refresh tokens for user ${userId} have been revoked.`);
  }

  /**
   * Generates JWT access token and a random refresh token.
   * @param userId User ID.
   * @param role User role.
   * @param userType User type.
   * @param affiliationId User affiliation ID.
   * @returns An object containing the access token and plaintext refresh token.
   */
  private async generateTokens(
    userId: string,
    role: Role,
    userType: UserType,
    affiliationId?: string | null,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: JwtPayload = {
      sub: userId,
      email: (
        await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true } })
      )?.email || '',
      role: role,
      userType: userType,
      affiliationId: affiliationId ?? undefined,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET') ?? '',
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRATION') ?? '15m',
    });

    const refreshTokenPlain = randomBytes(64).toString('hex'); // Generate a random string
    return { accessToken, refreshToken: refreshTokenPlain };
  }

  /**
   * Hashes and saves the refresh token to the database.
   * @param userId The ID of the user.
   * @param refreshTokenPlain The plaintext refresh token.
   * @param replacedById Optional ID of the token that this new token replaces (for rotation chain).
   */
  private async saveRefreshToken(userId: string, refreshTokenPlain: string, replacedById?: string): Promise<string> {
    const expiresAt = this.computeExpiryFromDaysEnv(this.configService.get<string>('JWT_REFRESH_EXPIRATION') ?? '7d');

    const tokenHash = await hashString(refreshTokenPlain);

    const created = await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
        revoked: false,
        replacedBy: replacedById || null,
      },
    });
    if (replacedById) {
      await this.prisma.refreshToken.update({ where: { id: replacedById }, data: { replacedBy: created.id } });
    }
    return created.id;
  }

  private computeExpiryFromDaysEnv(val: string): Date {
    let days = 7;
    const m = val.match(/^(\d+)(d)?$/i);
    if (m) days = parseInt(m[1], 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (isNaN(days) ? 7 : days));
    return expiresAt;
  }

  private parseCompositeToken(composite: string): { tokenId: string; tokenPlain: string } {
    const idx = composite.indexOf('.');
    if (idx === -1) throw new BadRequestException('Malformed refresh token');
    return { tokenId: composite.slice(0, idx), tokenPlain: composite.slice(idx + 1) };
  }

  private getAccessTtlSeconds(): number {
    const raw = this.configService.get<string>('JWT_ACCESS_EXPIRATION') ?? '15m';
    const m = raw.match(/^(\d+)([smhd])$/i);
    if (!m) return 900;
    const num = parseInt(m[1], 10);
    const unit = m[2].toLowerCase();
    switch (unit) {
      case 's':
        return num;
      case 'm':
        return num * 60;
      case 'h':
        return num * 3600;
      case 'd':
        return num * 86400;
      default:
        return 900;
    }
  }
}
