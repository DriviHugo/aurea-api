/**
 * AI Document Routes - AI document operation endpoints (private/authenticated)
 */

import type { FastifyInstance } from "fastify";
import { AIDocumentController } from "../../controllers/ai-document.controller.js";
import { createAIDocumentService } from "../../services/ai-document.service.js";

export default async (fastify: FastifyInstance): Promise<void> => {
  // Rewrite document section with AI
  fastify.post("/ai-reescribir-seccion", {
    preValidation: [fastify.authAccessToken],
    handler: async (request, reply) => {
      const aiDocumentService = createAIDocumentService(fastify.prisma);
      const aiDocumentController = new AIDocumentController(aiDocumentService);
      return aiDocumentController.reescribirSeccion(
        request as Parameters<typeof aiDocumentController.reescribirSeccion>[0],
        reply,
      );
    },
  });
};
