/**
 * CPV Routes - CPV code search and import endpoints (private/authenticated)
 */

import type { FastifyInstance } from "fastify";
import { CpvController } from "../../controllers/cpv.controller.js";
import { createCpvService } from "../../services/cpv.service.js";

export default async (fastify: FastifyInstance): Promise<void> => {
  const cpvService = createCpvService(fastify.prisma);
  const cpvController = new CpvController(cpvService);

  // Search CPV codes
  fastify.post("/cpv-search", {
    preValidation: [fastify.authAccessToken],
    handler: cpvController.search.bind(cpvController),
  });

  // Import CPV codes (admin only)
  fastify.post("/import-cpv-codes", {
    preValidation: [fastify.authAccessToken],
    handler: cpvController.importCodes.bind(cpvController),
  });
};
