/**
 * Functions Routes - Edge Function compatibility layer
 * Maps Supabase-style function invocations to REST endpoints
 */

import type { FastifyInstance } from "fastify";
import aiContractRoutes from "./ai-contract.js";
import aiAnalysisRoutes from "./ai-analysis.js";
import aiWizardHelpRoutes from "./ai-wizard-help.js";
import aiGenerateDocumentRoutes from "./ai-generate-document.js";

export default async (fastify: FastifyInstance): Promise<void> => {
  // AI Contract functions (improve_subject, propose_budget, search_cpv)
  fastify.register(aiContractRoutes);

  // AI Analysis functions (cpv, type, emergency, centralization, etc.)
  fastify.register(aiAnalysisRoutes);

  // AI Wizard help
  fastify.register(aiWizardHelpRoutes);

  // AI Document generation
  fastify.register(aiGenerateDocumentRoutes);
};
