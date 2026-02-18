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
};
