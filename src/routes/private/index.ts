// OLD BOILERPLATE ROUTES (DISABLED)
// import userRoutes from "./user.js";
// import authRoutes from "./auth.js";
// import apiKeyRoutes from "./apikey.js";

// Entity CRUD routes (previously auto-generated)
import profileRoutes from "./profile.routes.js";
import userroleRoutes from "./userroleassignment.routes.js";
import expedienteRoutes from "./case.routes.js";
import alternativaprocedimientoRoutes from "./procedurealternative.routes.js";
import cpvrecomendadoRoutes from "./recommendedcpv.routes.js";
import cpvcodigoRoutes from "./cpvcode.routes.js";
import evidenciaRoutes from "./evidence.routes.js";
import reglaRoutes from "./rule.routes.js";
import documentoRoutes from "./document.routes.js";
import documentoseccionRoutes from "./documentsection.routes.js";
import documentogeneracionRoutes from "./documentgeneration.routes.js";
import documentoversionRoutes from "./documentversion.routes.js";
import documentoevidenciaRoutes from "./documentevidence.routes.js";
import validacionRoutes from "./validation.routes.js";
import validacionevidenciaRoutes from "./validationevidence.routes.js";
import revisionRoutes from "./review.routes.js";
import comentarioRoutes from "./comment.routes.js";
import auditlogRoutes from "./auditlog.routes.js";
// DISABLED BOILERPLATE ROUTES (not used in AUREA production)
// import aiproviderRoutes from "./aiprovider.routes.js";
import aifunctionRoutes from "./aifunction.routes.js";
import aifunctionversionRoutes from "./aifunctionversion.routes.js";
import aifunctionlogRoutes from "./aifunctionlog.routes.js";
import incidenciaRoutes from "./issue.routes.js";
// import testcaseRoutes from "./testcase.routes.js";
// import repairdocumentRoutes from "./repairdocument.routes.js";
// import repairextractionRoutes from "./repairextraction.routes.js";
// import repairruleRoutes from "./repairrule.routes.js";
import ruleusageRoutes from "./ruleusage.routes.js";
import sectionquestionRoutes from "./sectionquestion.routes.js";
import unitRoutes from "./unit.routes.js";
import authSimpleRoutes from "./auth-simple.js";

// Custom routes
import adminRoutes from "./admin.js";
import cpvRoutes from "./cpv.js";
import aiDocumentRoutes from "./ai-document.js";
import storageRoutes from "./storage.js";
import centralizationRoutes from "./centralization.routes.js";
import type { FastifyInstance } from "fastify";

export default async (fastify: FastifyInstance): Promise<void> => {
  // OLD BOILERPLATE ROUTES (DISABLED)
  // fastify.register(userRoutes, { prefix: "/users" });
  // fastify.register(authRoutes, { prefix: "/auth" });
  // fastify.register(apiKeyRoutes, { prefix: "/apikeys" });

  // Entity CRUD routes
  fastify.register(profileRoutes, { prefix: "/profile" });
  fastify.register(userroleRoutes, { prefix: "/user-role-assignment" });
  fastify.register(expedienteRoutes, { prefix: "/case" });
  fastify.register(alternativaprocedimientoRoutes, {
    prefix: "/procedure-alternative",
  });
  fastify.register(cpvrecomendadoRoutes, { prefix: "/recommended-cpv" });
  fastify.register(cpvcodigoRoutes, { prefix: "/cpv-code" });
  fastify.register(evidenciaRoutes, { prefix: "/evidence" });
  fastify.register(reglaRoutes, { prefix: "/rule" });
  fastify.register(documentoRoutes, { prefix: "/document" });
  fastify.register(documentoseccionRoutes, { prefix: "/document-section" });
  fastify.register(documentogeneracionRoutes, {
    prefix: "/document-generation",
  });
  fastify.register(documentoversionRoutes, { prefix: "/document-version" });
  fastify.register(documentoevidenciaRoutes, {
    prefix: "/document-evidence",
  });
  fastify.register(validacionRoutes, { prefix: "/validation" });
  fastify.register(validacionevidenciaRoutes, {
    prefix: "/validation-evidence",
  });
  fastify.register(revisionRoutes, { prefix: "/review" });
  fastify.register(comentarioRoutes, { prefix: "/comment" });
  fastify.register(auditlogRoutes, { prefix: "/audit-log" });
  // DISABLED: aiprovider routes (boilerplate, not used in production)
  // fastify.register(aiproviderRoutes, { prefix: "/ai-provider" });
  fastify.register(aifunctionRoutes, { prefix: "/ai-function" });
  fastify.register(aifunctionversionRoutes, { prefix: "/ai-function-version" });
  fastify.register(aifunctionlogRoutes, { prefix: "/ai-function-log" });
  fastify.register(incidenciaRoutes, { prefix: "/issue" });
  // DISABLED: testcase routes (boilerplate test fixture, not used in production)
  // fastify.register(testcaseRoutes, { prefix: "/test-case" });
  // DISABLED: repair routes (debugging/utility, not used in production)
  // fastify.register(repairdocumentRoutes, { prefix: "/repair-document" });
  // fastify.register(repairextractionRoutes, { prefix: "/repair-extraction" });
  // fastify.register(repairruleRoutes, { prefix: "/repair-rule" });
  fastify.register(ruleusageRoutes, { prefix: "/rule-usage" });
  fastify.register(sectionquestionRoutes, { prefix: "/section-question" });
  fastify.register(unitRoutes, { prefix: "/unit" });
  fastify.register(authSimpleRoutes, { prefix: "/auth" });

  // Custom routes - Admin user management
  fastify.register(adminRoutes);

  // Custom routes - CPV code search and import
  fastify.register(cpvRoutes);

  // Custom routes - AI document operations
  fastify.register(aiDocumentRoutes);

  // Custom routes - File storage (MinIO/S3)
  fastify.register(storageRoutes);

  // Centralization catalog
  fastify.register(centralizationRoutes, { prefix: "/centralization" });
};
