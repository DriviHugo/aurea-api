/**
 * Admin Routes - User management endpoints (private/authenticated)
 */

import type { FastifyInstance } from "fastify";
import { AdminController } from "../../controllers/admin.controller.js";
import { createAdminService } from "../../services/admin.service.js";

export default async (fastify: FastifyInstance): Promise<void> => {
  const adminService = createAdminService(fastify.prisma);
  const adminController = new AdminController(adminService);

  // Create new user (admin only)
  fastify.post("/admin-create-user", {
    preValidation: [fastify.authAccessToken],
    handler: adminController.createUser.bind(adminController),
  });

  // Update user password (admin only)
  fastify.post("/admin-update-password", {
    preValidation: [fastify.authAccessToken],
    handler: adminController.updatePassword.bind(adminController),
  });

  // Delete user (admin only)
  fastify.post("/admin-delete-user", {
    preValidation: [fastify.authAccessToken],
    handler: adminController.deleteUser.bind(adminController),
  });

  // User metrics (admin only)
  fastify.get(
    "/admin/metrics",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Admin"],
        description: "Get user metrics aggregated in the backend",
        response: {
          200: {
            type: "object",
            properties: {
              total: { type: "integer" },
              active: { type: "integer" },
              inactive: { type: "integer" },
              newThisMonth: { type: "integer" },
              roleCount: {
                type: "object",
                additionalProperties: { type: "integer" },
              },
            },
          },
          403: { type: "object", properties: { error: { type: "string" } } },
        },
      },
    },
    async (request, reply) => {
      const userId = (request as unknown as { userId: string }).userId;
      if (!(await adminService.isAdmin(userId))) {
        return reply.status(403).send({ error: "Forbidden" });
      }
      const metrics = await adminService.getUserMetrics();
      return reply.status(200).send(metrics);
    },
  );

  // List all users with their roles (admin only)
  fastify.get(
    "/admin/users",
    { preValidation: [fastify.authAccessToken] },
    async (request, reply) => {
      const userId = (request as unknown as { userId: string }).userId;
      if (!(await adminService.isAdmin(userId))) {
        return reply.status(403).send({ error: "Forbidden" });
      }
      const prisma = fastify.prisma;
      const [profiles, roleAssignments] = await Promise.all([
        prisma.profile.findMany({
          // Never expose the password hash to the admin UI
          select: {
            id: true,
            email: true,
            name: true,
            lastName: true,
            unit: true,
            active: true,
            showWizardHelp: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.userRoleAssignment.findMany(),
      ]);
      const users = profiles.map((p) => ({
        ...p,
        roles: roleAssignments
          .filter((r) => r.userId === p.id)
          .map((r) => r.role),
      }));
      return reply.status(200).send(users);
    },
  );

  // Remove a role from a user (admin only)
  fastify.post(
    "/admin/remove-role",
    { preValidation: [fastify.authAccessToken] },
    async (request, reply) => {
      const requestUserId = (request as unknown as { userId: string }).userId;
      if (!(await adminService.isAdmin(requestUserId))) {
        return reply.status(403).send({ error: "Forbidden" });
      }
      const { userId, role } = request.body as { userId: string; role: string };
      const prisma = fastify.prisma;

      // Prevent removing the last active admin
      if (role === "admin") {
        const adminAssignments = await prisma.userRoleAssignment.findMany({
          where: { role: "admin", userId: { not: userId } },
          select: { userId: true },
        });
        const activeAdmins = await prisma.profile.count({
          where: {
            id: { in: adminAssignments.map((a) => a.userId) },
            active: true,
          },
        });
        if (activeAdmins === 0) {
          return reply
            .status(400)
            .send({ error: "Debe existir al menos un administrador activo" });
        }
      }

      await prisma.userRoleAssignment.deleteMany({
        where: { userId, role: role as any },
      });
      return reply.status(200).send({ success: true });
    },
  );

  // CPV code stats (admin only)
  fastify.get(
    "/admin/cpv-stats",
    { preValidation: [fastify.authAccessToken] },
    async (request, reply) => {
      const userId = (request as unknown as { userId: string }).userId;
      if (!(await adminService.isAdmin(userId))) {
        return reply.status(403).send({ error: "Forbidden" });
      }
      const prisma = fastify.prisma;
      const [total, byLevelRaw] = await Promise.all([
        prisma.cpvCode.count(),
        prisma.cpvCode.groupBy({ by: ["level"], _count: { level: true } }),
      ]);
      const byLevel: Record<number, number> = {};
      for (const row of byLevelRaw) {
        byLevel[row.level] = row._count.level;
      }
      return reply.status(200).send({ total, byLevel });
    },
  );

  // Audit log (admin only)
  fastify.get(
    "/admin/audit-log",
    { preValidation: [fastify.authAccessToken] },
    async (request, reply) => {
      const userId = (request as unknown as { userId: string }).userId;
      if (!(await adminService.isAdmin(userId))) {
        return reply.status(403).send({ error: "Forbidden" });
      }
      const { limit = 50 } = request.query as { limit?: number };
      const prisma = fastify.prisma;
      const logs = await prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: Number(limit),
      });
      return reply.status(200).send(logs);
    },
  );

  // Assign a role to a user (admin only)
  fastify.post(
    "/admin/assign-role",
    { preValidation: [fastify.authAccessToken] },
    async (request, reply) => {
      const requestUserId = (request as unknown as { userId: string }).userId;
      if (!(await adminService.isAdmin(requestUserId))) {
        return reply.status(403).send({ error: "Forbidden" });
      }
      const { userId, role } = request.body as { userId: string; role: string };
      const prisma = fastify.prisma;

      // Idempotent: skip if already assigned
      const existing = await prisma.userRoleAssignment.findFirst({
        where: { userId, role: role as any },
      });
      if (!existing) {
        await prisma.userRoleAssignment.create({
          data: { userId, role: role as any },
        });
      }
      return reply.status(200).send({ success: true });
    },
  );

  // Toggle active status of a user (admin only)
  fastify.post(
    "/admin/toggle-active",
    { preValidation: [fastify.authAccessToken] },
    async (request, reply) => {
      const requestUserId = (request as unknown as { userId: string }).userId;
      if (!(await adminService.isAdmin(requestUserId))) {
        return reply.status(403).send({ error: "Forbidden" });
      }
      const { userId, active } = request.body as {
        userId: string;
        active: boolean;
      };
      const prisma = fastify.prisma;

      // Prevent deactivating the last active admin
      if (!active) {
        const adminAssignments = await prisma.userRoleAssignment.findMany({
          where: { role: "admin", userId: { not: userId } },
          select: { userId: true },
        });
        const otherActiveAdmins = await prisma.profile.count({
          where: {
            id: { in: adminAssignments.map((a) => a.userId) },
            active: true,
          },
        });
        const isThisUserAdmin = await prisma.userRoleAssignment.findFirst({
          where: { userId, role: "admin" },
        });
        if (isThisUserAdmin && otherActiveAdmins === 0) {
          return reply.status(400).send({
            error: "Debe existir al menos un administrador activo",
          });
        }
      }

      await prisma.profile.update({
        where: { id: userId },
        data: { active },
      });
      return reply.status(200).send({ success: true });
    },
  );

  // Update user profile (admin only)
  fastify.post(
    "/admin/update-profile",
    { preValidation: [fastify.authAccessToken] },
    async (request, reply) => {
      const requestUserId = (request as unknown as { userId: string }).userId;
      if (!(await adminService.isAdmin(requestUserId))) {
        return reply.status(403).send({ error: "Forbidden" });
      }
      const { userId, data } = request.body as {
        userId: string;
        data: {
          name?: string;
          lastName?: string;
          unit?: string;
          showWizardHelp?: boolean;
        };
      };
      const prisma = fastify.prisma;
      const updated = await prisma.profile.update({
        where: { id: userId },
        data,
      });
      return reply.status(200).send(updated);
    },
  );
};
