/**
 * Functions Routes - Edge Function compatibility layer
 * Maps Supabase-style function invocations to REST endpoints
 */

import type { FastifyInstance } from "fastify";
import aiContratoRoutes from "./ai-contrato.js";
import aiAnalysisRoutes from "./ai-analysis.js";
import aiWizardHelpRoutes from "./ai-wizard-help.js";
import aiGenerarDocumentoRoutes from "./ai-generar-documento.js";
import aiReescribirSeccionRoutes from "./ai-reescribir-seccion.js";
import cpvSearchRoutes from "./cpv-search.js";
import importCpvCodesRoutes from "./import-cpv-codes.js";
import adminUserFunctionsRoutes from "./admin-user-functions.js";

export default async (fastify: FastifyInstance): Promise<void> => {
  // AI Contract functions (mejorar_objeto, proponer_presupuesto, buscar_cpv)
  fastify.register(aiContratoRoutes);

  // AI Analysis functions (cpv, tipo, emergencia, centralizacion, etc.)
  fastify.register(aiAnalysisRoutes);

  // AI Wizard help
  fastify.register(aiWizardHelpRoutes);

  // AI Document generation
  fastify.register(aiGenerarDocumentoRoutes);

  // AI Section rewriting
  fastify.register(aiReescribirSeccionRoutes);

  // CPV Search
  fastify.register(cpvSearchRoutes);

  // Import CPV Codes
  fastify.register(importCpvCodesRoutes);

  // Admin user functions
  fastify.register(adminUserFunctionsRoutes);
};
