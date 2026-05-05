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
}

const ALLOWED_USER_ROLES = new Set<UserRole>(["admin", "processor"]);

export class AdminService {
  constructor(private prisma: PrismaClient) {}

  private async countActiveAdmins(excludeUserId?: string): Promise<number> {
    const adminAssignments = await this.prisma.userRoleAssignment.findMany({
      where: {
        role: "admin",
        ...(excludeUserId ? { userId: { not: excludeUserId } } : {}),
      },
      select: { userId: true },
    });

    if (adminAssignments.length === 0) return 0;

    return this.prisma.profile.count({
      where: {
        id: { in: adminAssignments.map((assignment) => assignment.userId) },
        active: true,
      },
    });
  }

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

    if (roles.some((role) => !ALLOWED_USER_ROLES.has(role))) {
      throw new Error("Solo se permiten los roles administrador y tramitador");
    }

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

    const profile = await this.prisma.profile.findUnique({
      where: { id: userId },
      select: { active: true },
    });

    if (!profile) {
      throw new Error("User not found");
    }

    const isAdminRole =
      (await this.prisma.userRoleAssignment.findFirst({
        where: { userId, role: "admin" },
        select: { id: true },
      })) !== null;

    if (isAdminRole && profile.active) {
      const remainingAdmins = await this.countActiveAdmins(userId);
      if (remainingAdmins === 0) {
        throw new Error("Debe existir al menos un administrador activo");
      }
    }

    await this.prisma.profile.update({
      where: { id: userId },
      data: { active: false },
    });

    void reassignToUserId;

    return { success: true };
  }
}

export function createAdminService(prisma: PrismaClient): AdminService {
  return new AdminService(prisma);
}
