/**
 * Admin User Functions - User management for admin role
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";

interface CreateUserBody {
  email: string;
  password: string;
  nombre: string;
  apellidos?: string;
  unidad?: string;
  roles?: string[];
  sendWelcomeEmail?: boolean;
  appUrl?: string;
}

interface UpdatePasswordBody {
  userId: string;
  newPassword: string;
}

interface DeleteUserBody {
  userId: string;
  reassignToUserId?: string;
}

export default async (app: FastifyInstance): Promise<void> => {
  // Create new user (admin only)
  app.post("/admin-create-user", {
    preValidation: [app.authAccessToken],
    handler: async (
      req: FastifyRequest<{ Body: CreateUserBody }>,
      reply: FastifyReply,
    ) => {
      const {
        email,
        password,
        nombre,
        apellidos,
        unidad,
        roles = ["tecnico"],
      } = req.body;

      // Verify admin role
      const requestUserId = (req as unknown as { userId: string }).userId;
      const { prisma } = app;

      const adminRole = await prisma.userRole.findFirst({
        where: { userId: requestUserId, role: "admin" },
      });

      if (!adminRole) {
        return reply.status(403).send({
          data: null,
          error: { message: "Solo los administradores pueden crear usuarios" },
        });
      }

      try {
        // Check if email already exists
        const existingUser = await prisma.user.findUnique({
          where: { email },
        });

        if (existingUser) {
          return reply.status(400).send({
            data: null,
            error: { message: "Ya existe un usuario con ese email" },
          });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user and profile in transaction
        const result = await prisma.$transaction(async (tx) => {
          // Create user
          const user = await tx.user.create({
            data: {
              email,
              password: hashedPassword,
              emailValidated: true,
            },
          });

          // Create profile
          await tx.profile.create({
            data: {
              id: user.id,
              email,
              nombre,
              apellidos: apellidos ?? null,
              unidad: unidad ?? null,
            },
          });

          // Create roles
          for (const role of roles) {
            await tx.userRole.create({
              data: {
                userId: user.id,
                role,
              },
            });
          }

          return user;
        });

        return reply.send({
          data: {
            userId: result.id,
            success: true,
          },
          error: null,
        });
      } catch (error) {
        console.error("Error creating user:", error);
        return reply.status(500).send({
          data: null,
          error: {
            message:
              error instanceof Error
                ? error.message
                : "Error al crear el usuario",
          },
        });
      }
    },
  });

  // Update user password (admin only)
  app.post("/admin-update-password", {
    preValidation: [app.authAccessToken],
    handler: async (
      req: FastifyRequest<{ Body: UpdatePasswordBody }>,
      reply: FastifyReply,
    ) => {
      const { userId, newPassword } = req.body;

      // Verify admin role
      const requestUserId = (req as unknown as { userId: string }).userId;
      const { prisma } = app;

      const adminRole = await prisma.userRole.findFirst({
        where: { userId: requestUserId, role: "admin" },
      });

      if (!adminRole) {
        return reply.status(403).send({
          data: null,
          error: {
            message: "Solo los administradores pueden cambiar contraseñas",
          },
        });
      }

      try {
        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        await prisma.user.update({
          where: { id: userId },
          data: { password: hashedPassword },
        });

        return reply.send({
          data: { success: true },
          error: null,
        });
      } catch (error) {
        console.error("Error updating password:", error);
        return reply.status(500).send({
          data: null,
          error: {
            message:
              error instanceof Error
                ? error.message
                : "Error al actualizar la contraseña",
          },
        });
      }
    },
  });

  // Delete user (admin only)
  app.post("/admin-delete-user", {
    preValidation: [app.authAccessToken],
    handler: async (
      req: FastifyRequest<{ Body: DeleteUserBody }>,
      reply: FastifyReply,
    ) => {
      const { userId, reassignToUserId } = req.body;

      // Verify admin role
      const requestUserId = (req as unknown as { userId: string }).userId;
      const { prisma } = app;

      const adminRole = await prisma.userRole.findFirst({
        where: { userId: requestUserId, role: "admin" },
      });

      if (!adminRole) {
        return reply.status(403).send({
          data: null,
          error: {
            message: "Solo los administradores pueden eliminar usuarios",
          },
        });
      }

      // Prevent self-deletion
      if (userId === requestUserId) {
        return reply.status(400).send({
          data: null,
          error: { message: "No puedes eliminarte a ti mismo" },
        });
      }

      try {
        // Check if user has expedientes
        const expedientes = await prisma.expediente.findMany({
          where: { usuarioId: userId },
          select: { id: true },
        });

        if (expedientes.length > 0 && !reassignToUserId) {
          return reply.send({
            data: {
              code: "NEEDS_REASSIGN",
              expedientesCount: expedientes.length,
            },
            error: null,
          });
        }

        await prisma.$transaction(async (tx) => {
          // Reassign expedientes if needed
          if (expedientes.length > 0 && reassignToUserId) {
            await tx.expediente.updateMany({
              where: { usuarioId: userId },
              data: { usuarioId: reassignToUserId },
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

          // Delete user
          await tx.user.delete({
            where: { id: userId },
          });
        });

        return reply.send({
          data: { success: true },
          error: null,
        });
      } catch (error) {
        console.error("Error deleting user:", error);
        return reply.status(500).send({
          data: null,
          error: {
            message:
              error instanceof Error
                ? error.message
                : "Error al eliminar el usuario",
          },
        });
      }
    },
  });
};
