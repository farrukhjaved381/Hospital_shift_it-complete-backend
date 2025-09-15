import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user';
import { UpdateUserDto } from './dto/update-user';
import { UserEntity } from './user.entity';
import * as bcrypt from 'bcryptjs';
import { User, Role, UserType, OrganizationType } from '@prisma/client'; // Import User and new enums

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a new user in the database. This method is intended for internal use
   * (e.g., by SuperAdmin) or specific flows where roles and affiliations are explicitly set.
   * For self-registration, AuthService.register should be used.
   * @param createUserDto The DTO containing user creation information.
   * @returns A promise that resolves to a UserEntity of the newly created user.
   * @throws ConflictException if a user with the provided email already exists.
   * @throws NotFoundException if the provided affiliationId does not exist or matches type.
   */
  async create(createUserDto: CreateUserDto): Promise<UserEntity> {
    // Check if user already exists by email
    const existingUserByEmail = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUserByEmail) {
      throw new ConflictException('User with this email already exists');
    }

    // Validate affiliation if provided
    if (createUserDto.affiliationId && createUserDto.affiliationType) {
      const organization = await this.prisma.organization.findUnique({
        where: { id: createUserDto.affiliationId },
      });

      if (!organization || organization.type !== createUserDto.affiliationType) {
        throw new NotFoundException('Invalid affiliationId or affiliationType.');
      }
    } else if (createUserDto.affiliationId || createUserDto.affiliationType) {
      throw new ConflictException('Both affiliationId and affiliationType must be provided if one is.');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(createUserDto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: createUserDto.email,
        passwordHash: passwordHash,
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
        role: createUserDto.role || Role.STUDENT, // Default to STUDENT if not provided
        userType: createUserDto.userType || UserType.NONE, // Default to NONE if not provided
        affiliationId: createUserDto.affiliationId,
        emailVerified: false, // Default to false, to be verified later or set explicitly
      },
    });

    return new UserEntity(user);
  }

  /**
   * Retrieves all users, including their memberships and affiliation details. Filters by emailVerified.
   * @returns A promise that resolves to an array of UserEntity.
   */
  async findAll(): Promise<UserEntity[]> {
    const users = await this.prisma.user.findMany({
      where: { emailVerified: true }, // Example: only return email verified users
      include: {
        memberships: {
          include: {
            organization: true,
          },
        },
        affiliation: true,
      },
    });
    return users.map(user => new UserEntity(user));
  }

  /**
   * Finds a user by ID, including their memberships and affiliation details.
   * @param id The ID of the user to find.
   * @returns A promise that resolves to a UserEntity if found.
   * @throws NotFoundException if the user is not found.
   */
  async findOne(id: string): Promise<UserEntity> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        memberships: {
          include: {
            organization: true,
          },
        },
        affiliation: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return new UserEntity(user);
  }

  /**
   * Finds a user by email, including their memberships and affiliation details.
   * @param email The email of the user to find.
   * @returns A promise that resolves to a UserEntity if found, otherwise null.
   */
  async findByEmail(email: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          include: {
            organization: true,
          },
        },
        affiliation: true,
      },
    });
    return user ? new UserEntity(user) : null;
  }

  /**
   * Updates an existing user's information.
   * @param id The ID of the user to update.
   * @param updateUserDto The DTO containing the updated user information.
   * @returns A promise that resolves to a UserEntity of the updated user.
   * @throws NotFoundException if the user is not found.
   * @throws ConflictException if the updated email already exists.
   * @throws NotFoundException if the provided affiliationId does not exist or matches type.
   */
  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserEntity> {
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    // Check for unique constraints if updating email
    if (updateUserDto.email && updateUserDto.email !== existingUser.email) {
      const emailExists = await this.prisma.user.findUnique({
        where: { email: updateUserDto.email },
      });
      if (emailExists) {
        throw new ConflictException('User with this email already exists');
      }
    }

    // Validate affiliation if provided for update
    if (updateUserDto.affiliationId && updateUserDto.affiliationType) {
      const organization = await this.prisma.organization.findUnique({
        where: { id: updateUserDto.affiliationId },
      });

      if (!organization || organization.type !== updateUserDto.affiliationType) {
        throw new NotFoundException('Invalid affiliationId or affiliationType.');
      }
    } else if (updateUserDto.affiliationId || updateUserDto.affiliationType) {
      throw new ConflictException('Both affiliationId and affiliationType must be provided if one is.');
    }

    // If password is being updated, hash it
    if (updateUserDto.password) {
      updateUserDto.passwordHash = await bcrypt.hash(updateUserDto.password, 12);
      delete updateUserDto.password; // Remove plain password before updating
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        email: updateUserDto.email,
        passwordHash: updateUserDto.passwordHash,
        firstName: updateUserDto.firstName,
        lastName: updateUserDto.lastName,
        role: updateUserDto.role,
        userType: updateUserDto.userType,
        affiliationId: updateUserDto.affiliationId,
        emailVerified: updateUserDto.emailVerified,
      },
    });

    return new UserEntity(user);
  }

  /**
   * Deletes a user by ID. (Hard delete for now, soft delete to be implemented later).
   * @param id The ID of the user to delete.
   * @returns A promise that resolves when the user is deleted.
   * @throws NotFoundException if the user is not found.
   */
  async remove(id: string): Promise<void> {
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.delete({
      where: { id },
    });
  }
}