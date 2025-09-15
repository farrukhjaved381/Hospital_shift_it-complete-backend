import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  // Removed UseGuards and Request as they are not needed for these core auth endpoints
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth, // Keep for future endpoints that require it
  ApiBody,
} from '@nestjs/swagger';
// Removed RequestWithUser interface as it's not needed for these core auth endpoints
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
// Removed JwtAuthGuard as it's not needed for these core auth endpoints

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Registers a new user with the provided details.
   * @param registerDto The DTO containing user registration information.
   * @returns An AuthResponseDto with access token, refresh token, and user details.
   */
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict: User with this email already exists',
  })
  @ApiBody({ type: RegisterDto })
  @Post('register')
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(registerDto);
  }

  /**
   * Logs in a user with the provided credentials.
   * @param loginDto The DTO containing user login credentials.
   * @returns An AuthResponseDto with access token, refresh token, and user details.
   */
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({
    status: 200,
    description: 'User successfully logged in',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized: Invalid credentials',
  })
  @ApiBody({ type: LoginDto })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }

  /**
   * Refreshes the access token using a valid refresh token.
   * @param refreshTokenDto The DTO containing the refresh token.
   * @returns An AuthResponseDto with new access token, refresh token, and user details.
   */
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({
    status: 200,
    description: 'Token successfully refreshed',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized: Invalid refresh token',
  })
  @ApiBody({ type: RefreshTokenDto })
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refreshTokens(@Body() refreshTokenDto: RefreshTokenDto): Promise<AuthResponseDto> {
    return this.authService.refreshTokens(refreshTokenDto);
  }

  @ApiOperation({ summary: 'Logout (revoke refresh token)' })
  @ApiResponse({ status: 200, description: 'Logged out' })
  @ApiBody({ type: RefreshTokenDto })
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(@Body() dto: RefreshTokenDto): Promise<{ message: string }> {
    await this.authService.logout(dto);
    return { message: 'Logged out' };
  }

  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({ status: 200, description: 'Reset email queued' })
  @ApiBody({ type: ForgotPasswordDto })
  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 200, description: 'Password reset successful' })
  @ApiBody({ type: ResetPasswordDto })
  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @ApiOperation({ summary: 'Verify email' })
  @ApiResponse({ status: 200, description: 'Email verified' })
  @HttpCode(HttpStatus.OK)
  @Post('verify-email')
  async verifyEmail(@Body('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @ApiOperation({ summary: 'Accept admin invite' })
  @ApiResponse({ status: 200, description: 'Invite accepted', type: AuthResponseDto })
  @HttpCode(HttpStatus.OK)
  @Post('accept-invite')
  async acceptInvite(@Body() dto: AcceptInviteDto): Promise<AuthResponseDto> {
    return this.authService.acceptInvite(dto);
  }
}
