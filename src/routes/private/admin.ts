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
};
