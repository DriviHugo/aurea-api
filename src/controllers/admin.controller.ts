/**
 * Admin Controller - User management request handlers
 */

import type { FastifyRequest, FastifyReply } from "fastify";
import type { UserRole } from "@prisma/client";
import type { AdminService } from "../services/admin.service.js";
import prisma from "../config/prisma.js";
import { writeAuditLog } from "../services/audit.service.js";
import logger from "../config/logger.js";

interface CreateUserBody {
  email: string;
  password: string;
  name: string;
  lastName?: string;
  unit?: string;
  roles?: UserRole[];
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
        name: req.body.name,
        lastName: req.body.lastName,
        unit: req.body.unit,
        roles: req.body.roles,
      });

      await writeAuditLog({
        prisma,
        action: "crear_usuario",
        entity: "profiles",
        entityId: result.userId,
        userId: requestUserId,
        ipAddress: req.ip,
        newData: {
          email: req.body.email,
          name: req.body.name,
          lastName: req.body.lastName,
          unit: req.body.unit,
          roles: req.body.roles,
        },
      });

      return reply.send({
        data: result,
        error: null,
      });
    } catch (error) {
      logger.error({ err: error, msg: "Error creating user" });
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

      await writeAuditLog({
        prisma,
        action: "cambiar_contraseña",
        entity: "profiles",
        entityId: req.body.userId,
        userId: requestUserId,
        ipAddress: req.ip,
        newData: { target_user_id: req.body.userId, action: "password_changed" },
      });

      return reply.send({
        data: { success: true },
        error: null,
      });
    } catch (error) {
      logger.error({ err: error, msg: "Error updating password" });
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

      await writeAuditLog({
        prisma,
        action: "eliminar_usuario",
        entity: "profiles",
        entityId: req.body.userId,
        userId: requestUserId,
        ipAddress: req.ip,
        previousData: {
          user_id: req.body.userId,
          reassigned_to: req.body.reassignToUserId ?? null,
        },
      });

      return reply.send({
        data: result,
        error: null,
      });
    } catch (error) {
      logger.error({ err: error, msg: "Error deleting user" });
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
