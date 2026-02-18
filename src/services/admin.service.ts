/**
 * Admin Service - User management business logic
 */

import type { PrismaClient, RolUsuario } from "@prisma/client";
import bcrypt from "bcryptjs";

export interface CreateUserInput {
  email: string;
  password: string;
  nombre: string;
  apellidos?: string | undefined;
  unidad?: string | undefined;
  roles?: RolUsuario[] | undefined;
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
    const adminRole = await this.prisma.userRole.findFirst({
      where: { userId, role: "admin" },
    });
    return adminRole !== null;
  }

  async createUser(input: CreateUserInput): Promise<CreateUserResult> {
    const {
      email,
      password,
      nombre,
      apellidos,
      unidad,
      roles = ["tramitador" as RolUsuario],
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
          nombre,
          apellidos: apellidos ?? null,
          unidad: unidad ?? null,
          activo: true,
        },
      });

      // Create roles
      for (const role of roles) {
        await tx.userRole.create({
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
      throw new Error("No puedes eliminarte a ti mismo");
    }

    // Check if user has expedientes (using creadorId field)
    const expedientes = await this.prisma.expediente.findMany({
      where: { creadorId: userId },
      select: { id: true },
    });

    if (expedientes.length > 0 && !reassignToUserId) {
      return {
        success: false,
        code: "NEEDS_REASSIGN",
        expedientesCount: expedientes.length,
      };
    }

    await this.prisma.$transaction(async (tx) => {
      // Reassign expedientes if needed
      if (expedientes.length > 0 && reassignToUserId) {
        await tx.expediente.updateMany({
          where: { creadorId: userId },
          data: { creadorId: reassignToUserId },
        });
      }

      // Delete user roles
      await tx.userRole.deleteMany({
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
