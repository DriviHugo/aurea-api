/**
 * Admin Service - User management business logic
 */

import type { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

export interface CreateUserInput {
  email: string;
  password: string;
  name: string;
  lastName?: string | undefined;
  unit?: string | undefined;
  roles?: UserRole[] | undefined;
}

export interface CreateUserResult {
  userId: string;
  success: boolean;
}

export interface DeleteUserResult {
  success: boolean;
  code?: string;
  expedientesCount?: number;
}

export class AdminService {
  constructor(private prisma: PrismaClient) {}

  async isAdmin(userId: string): Promise<boolean> {
    const adminRole = await this.prisma.userRoleAssignment.findFirst({
      where: { userId, role: "admin" },
    });
    return adminRole !== null;
  }

  async createUser(input: CreateUserInput): Promise<CreateUserResult> {
    const {
      email,
      password,
      name,
      lastName,
      unit,
      roles = ["processor" as UserRole],
    } = input;

    // Check if email already exists
    const existingUser = await this.prisma.profile.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new Error("Ya existe un usuario con ese email");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create profile and roles in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create profile (which is the user in this schema)
      const profile = await tx.profile.create({
        data: {
          id: crypto.randomUUID(),
          email,
          password: hashedPassword,
          name,
          lastName: lastName ?? null,
          unit: unit ?? null,
          active: true,
        },
      });

      // Create roles
      for (const role of roles) {
        await tx.userRoleAssignment.create({
          data: {
            userId: profile.id,
            role,
          },
        });
      }

      return profile;
    });

    return {
      userId: result.id,
      success: true,
    };
  }

  async updatePassword(userId: string, newPassword: string): Promise<boolean> {
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await this.prisma.profile.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return true;
  }

  async deleteUser(
    userId: string,
    requestUserId: string,
    reassignToUserId?: string,
  ): Promise<DeleteUserResult> {
    // Prevent self-deletion
    if (userId === requestUserId) {
      throw new Error("Cannot delete yourself");
    }

    // Check if user has cases (using creatorId field)
    const cases = await this.prisma.case.findMany({
      where: { creatorId: userId },
      select: { id: true },
    });

    if (cases.length > 0 && !reassignToUserId) {
      return {
        success: false,
        code: "NEEDS_REASSIGN",
        expedientesCount: cases.length,
      };
    }

    await this.prisma.$transaction(async (tx) => {
      // Reassign cases if needed
      if (cases.length > 0 && reassignToUserId) {
        await tx.case.updateMany({
          where: { creatorId: userId },
          data: { creatorId: reassignToUserId },
        });
      }

      // Delete user roles
      await tx.userRoleAssignment.deleteMany({
        where: { userId },
      });

      // Delete profile
      await tx.profile.delete({
        where: { id: userId },
      });
    });

    return { success: true };
  }
}

export function createAdminService(prisma: PrismaClient): AdminService {
  return new AdminService(prisma);
}
