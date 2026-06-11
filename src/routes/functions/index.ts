/**
 * Functions Routes - Edge Function compatibility layer
 * Maps Supabase-style function invocations to REST endpoints
 */

import type { FastifyInstance } from "fastify";
import aiContractRoutes from "./ai-contract.js";
import aiAnalysisRoutes from "./ai-analysis.js";
import aiWizardHelpRoutes from "./ai-wizard-help.js";
import aiGenerateDocumentRoutes from "./ai-generate-document.js";
import aiProcessRepairRoutes from "./ai-process-repair.js";
import aiEvaluateSufficiencyRoutes from "./ai-evaluate-sufficiency.js";
import { getProductionGateway } from "../../services/ai-gateway/production-gateway.js";
import { createCpvService } from "../../services/cpv.service.js";
import { createAdminService } from "../../services/admin.service.js";

export default async (fastify: FastifyInstance): Promise<void> => {
  // AI Contract functions (improve_subject, propose_budget, search_cpv)
  fastify.register(aiContractRoutes);

  // AI Analysis functions (cpv, type, emergency, centralization, etc.)
  fastify.register(aiAnalysisRoutes);

  // AI Wizard help
  fastify.register(aiWizardHelpRoutes);

  // AI Document generation
  fastify.register(aiGenerateDocumentRoutes);

  // AI Repair document processing
  fastify.register(aiProcessRepairRoutes);

  // AI Sufficiency evaluation
  fastify.register(aiEvaluateSufficiencyRoutes);

  // POST /functions/cpv-search - CPV autocomplete
  // Rate limited globally via @fastify/rate-limit plugin
  fastify.post("/cpv-search", {
    preValidation: [fastify.authAccessToken],
    schema: {
      body: {
        type: "object",
        required: ["query"],
        properties: {
          query: { type: "string", minLength: 2 },
          limit: { type: "number", minimum: 1, maximum: 50 },
        },
      },
    },
    handler: async (request, reply) => {
      const { query, limit = 20 } = request.body as {
        query: string;
        limit?: number;
      };
      const cpvService = createCpvService(fastify.prisma);
      const results = await cpvService.search(query, limit);
      return reply.send({ results });
    },
  });

  // POST /functions/ai-provider-info - Get current provider order
  // Rate limited globally via @fastify/rate-limit plugin
  fastify.post("/ai-provider-info", {
    preValidation: [fastify.authAccessToken],
    handler: async (_request, reply) => {
      const gateway = getProductionGateway();
      return reply.send(gateway.getProviderInfo());
    },
  });

  // POST /functions/ai-swap-provider - Swap primary/fallback order
  // Rate limited globally via @fastify/rate-limit plugin
  fastify.post("/ai-swap-provider", {
    preValidation: [fastify.authAccessToken],
    handler: async (_request, reply) => {
      const gateway = getProductionGateway();
      gateway.swap();
      return reply.send(gateway.getProviderInfo());
    },
  });

  // POST /functions/import-cpv-codes - Import CPV codes in batch (admin only)
  fastify.post("/import-cpv-codes", {
    preValidation: [fastify.authAccessToken],
    handler: async (request, reply) => {
      const userId = (request as unknown as { userId: string }).userId;
      const adminService = createAdminService(fastify.prisma);
      if (!(await adminService.isAdmin(userId))) {
        return reply.status(403).send({ error: "Forbidden" });
      }
      const cpvService = createCpvService(fastify.prisma);
      const body = request.body as { cpvData?: unknown[] };
      const result = await cpvService.importCodes((body.cpvData || []) as any);
      return reply.send(result);
    },
  });
};
