/**
 * AI Document Routes - AI document operation endpoints (private/authenticated)
 */

import type { FastifyInstance } from "fastify";
import { AIDocumentController } from "../../controllers/ai-document.controller.js";
import { createAIDocumentService } from "../../services/ai-document.service.js";

export default async (fastify: FastifyInstance): Promise<void> => {
  const aiDocumentService = createAIDocumentService(fastify.prisma);
  const aiDocumentController = new AIDocumentController(aiDocumentService);

  // Rewrite document section with AI
  fastify.post("/ai-reescribir-seccion", {
    preValidation: [fastify.authAccessToken],
    handler: aiDocumentController.reescribirSeccion.bind(aiDocumentController),
  });
};
