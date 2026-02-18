/**
 * Admin Controller - User management request handlers
 */

import type { FastifyRequest, FastifyReply } from "fastify";
import type { RolUsuario } from "@prisma/client";
import type { AdminService } from "../services/admin.service.js";

interface CreateUserBody {
  email: string;
  password: string;
  nombre: string;
  apellidos?: string;
  unidad?: string;
  roles?: RolUsuario[];
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

export class AdminController {
  constructor(private adminService: AdminService) {}

  async createUser(
    req: FastifyRequest<{ Body: CreateUserBody }>,
    reply: FastifyReply,
  ): Promise<void> {
    const requestUserId = (req as unknown as { userId: string }).userId;

    // Verify admin role
    const isAdmin = await this.adminService.isAdmin(requestUserId);
    if (!isAdmin) {
      return reply.status(403).send({
        data: null,
        error: { message: "Solo los administradores pueden crear usuarios" },
      });
    }

    try {
      const result = await this.adminService.createUser({
        email: req.body.email,
        password: req.body.password,
        nombre: req.body.nombre,
        apellidos: req.body.apellidos,
        unidad: req.body.unidad,
        roles: req.body.roles,
      });

      return reply.send({
        data: result,
        error: null,
      });
    } catch (error) {
      console.error("Error creating user:", error);
      return reply
        .status(
          error instanceof Error && error.message.includes("Ya existe")
            ? 400
            : 500,
        )
        .send({
          data: null,
          error: {
            message:
              error instanceof Error
                ? error.message
                : "Error al crear el usuario",
          },
        });
    }
  }

  async updatePassword(
    req: FastifyRequest<{ Body: UpdatePasswordBody }>,
    reply: FastifyReply,
  ): Promise<void> {
    const requestUserId = (req as unknown as { userId: string }).userId;

    // Verify admin role
    const isAdmin = await this.adminService.isAdmin(requestUserId);
    if (!isAdmin) {
      return reply.status(403).send({
        data: null,
        error: {
          message: "Solo los administradores pueden cambiar contraseñas",
        },
      });
    }

    try {
      await this.adminService.updatePassword(
        req.body.userId,
        req.body.newPassword,
      );

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
  }

  async deleteUser(
    req: FastifyRequest<{ Body: DeleteUserBody }>,
    reply: FastifyReply,
  ): Promise<void> {
    const requestUserId = (req as unknown as { userId: string }).userId;

    // Verify admin role
    const isAdmin = await this.adminService.isAdmin(requestUserId);
    if (!isAdmin) {
      return reply.status(403).send({
        data: null,
        error: { message: "Solo los administradores pueden eliminar usuarios" },
      });
    }

    try {
      const result = await this.adminService.deleteUser(
        req.body.userId,
        requestUserId,
        req.body.reassignToUserId,
      );

      return reply.send({
        data: result,
        error: null,
      });
    } catch (error) {
      console.error("Error deleting user:", error);
      return reply
        .status(
          error instanceof Error && error.message.includes("ti mismo")
            ? 400
            : 500,
        )
        .send({
          data: null,
          error: {
            message:
              error instanceof Error
                ? error.message
                : "Error al eliminar el usuario",
          },
        });
    }
  }
}
