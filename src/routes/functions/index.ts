/**
 * Functions Routes - Edge Function compatibility layer
 * Maps Supabase-style function invocations to REST endpoints
 */

import type { FastifyInstance } from "fastify";
import aiContratoRoutes from "./ai-contrato.js";
import aiAnalysisRoutes from "./ai-analysis.js";
import aiWizardHelpRoutes from "./ai-wizard-help.js";
import aiGenerarDocumentoRoutes from "./ai-generar-documento.js";

export default async (fastify: FastifyInstance): Promise<void> => {
  // AI Contract functions (mejorar_objeto, proponer_presupuesto, buscar_cpv)
  fastify.register(aiContratoRoutes);

  // AI Analysis functions (cpv, tipo, emergencia, centralizacion, etc.)
  fastify.register(aiAnalysisRoutes);

  // AI Wizard help
  fastify.register(aiWizardHelpRoutes);

  // AI Document generation
  fastify.register(aiGenerarDocumentoRoutes);
};
