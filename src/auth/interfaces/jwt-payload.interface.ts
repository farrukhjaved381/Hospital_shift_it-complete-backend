import { Role, UserType } from '@prisma/client';

export interface JwtPayload {
  sub: string; // User ID
  email: string;
  role: Role; // Re-added as per detailed plan
  userType: UserType;
  affiliationId?: string;
  iat?: number;
  exp?: number;
  jti?: string;
}
