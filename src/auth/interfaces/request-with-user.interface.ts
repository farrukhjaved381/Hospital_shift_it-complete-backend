import { Request } from 'express';
import { User, Membership, Organization, Role, OrganizationType } from '@prisma/client';

// Define a type for the user object that JwtStrategy will return
type UserWithMemberships = User & {
  memberships: (Membership & {
    organization: Organization;
  })[];
};

export interface RequestWithUser extends Request {
  user: UserWithMemberships;
}
