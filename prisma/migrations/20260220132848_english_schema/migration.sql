/*
  Warnings:

  - You are about to drop the `ai_function_logs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ai_function_versions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ai_functions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ai_providers` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `alternativas_procedimiento` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `audit_log` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `comentarios` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `cpv_codigos` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `cpv_recomendados` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `documento_generaciones` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `documento_secciones` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `documento_versiones` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `documentos` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `documentos_evidencias` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `evidencias` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `expedientes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `incidencias` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `profiles` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `reglas` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `revisiones` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_roles` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `validaciones` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `validaciones_evidencias` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('intake', 'draft', 'alternatives', 'validated', 'approved', 'review', 'incident', 'inDrafting', 'withObservations', 'readyValidation', 'inIntervention', 'closed');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('works', 'services', 'supplies', 'worksConcession', 'servicesConcession', 'mixed');

-- CreateEnum
CREATE TYPE "ProcedureType" AS ENUM ('open', 'openSimplified', 'openSuperSimplified', 'restricted', 'negotiatedNoPublicity', 'negotiatedWithPublicity', 'competitiveDialogue', 'innovationPartnership', 'minor', 'basedContract');

-- CreateEnum
CREATE TYPE "RuleSeverity" AS ENUM ('blocking', 'warning', 'recommendation');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('pending', 'inReview', 'approved', 'rejected', 'toCorrect');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('processor', 'legal', 'auditor', 'supervisor', 'auditorRole', 'admin', 'appAuditor', 'aiAuditor');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('report', 'technicalSpecs', 'adminClauses', 'technicalAnnex', 'economicAnnex', 'needsReport', 'procedureJustification');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('boe', 'pcsp', 'doctrine', 'alfil', 'template', 'courtOfAuditors');

-- CreateEnum
CREATE TYPE "ReviewDecision" AS ENUM ('compliant', 'toCorrect', 'reject');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('green', 'amber', 'red');

-- DropForeignKey
ALTER TABLE "ai_function_versions" DROP CONSTRAINT "ai_function_versions_creado_por_fkey";

-- DropForeignKey
ALTER TABLE "ai_function_versions" DROP CONSTRAINT "ai_function_versions_function_id_fkey";

-- DropForeignKey
ALTER TABLE "ai_function_versions" DROP CONSTRAINT "ai_function_versions_provider_id_fkey";

-- DropForeignKey
ALTER TABLE "ai_functions" DROP CONSTRAINT "ai_functions_provider_id_fkey";

-- DropForeignKey
ALTER TABLE "alternativas_procedimiento" DROP CONSTRAINT "alternativas_procedimiento_expediente_id_fkey";

-- DropForeignKey
ALTER TABLE "audit_log" DROP CONSTRAINT "audit_log_expediente_id_fkey";

-- DropForeignKey
ALTER TABLE "audit_log" DROP CONSTRAINT "audit_log_usuario_id_fkey";

-- DropForeignKey
ALTER TABLE "comentarios" DROP CONSTRAINT "comentarios_revision_id_fkey";

-- DropForeignKey
ALTER TABLE "comentarios" DROP CONSTRAINT "comentarios_usuario_id_fkey";

-- DropForeignKey
ALTER TABLE "cpv_recomendados" DROP CONSTRAINT "cpv_recomendados_expediente_id_fkey";

-- DropForeignKey
ALTER TABLE "documento_generaciones" DROP CONSTRAINT "documento_generaciones_documento_id_fkey";

-- DropForeignKey
ALTER TABLE "documento_secciones" DROP CONSTRAINT "documento_secciones_documento_id_fkey";

-- DropForeignKey
ALTER TABLE "documento_versiones" DROP CONSTRAINT "documento_versiones_documento_id_fkey";

-- DropForeignKey
ALTER TABLE "documentos" DROP CONSTRAINT "documentos_creador_id_fkey";

-- DropForeignKey
ALTER TABLE "documentos" DROP CONSTRAINT "documentos_expediente_id_fkey";

-- DropForeignKey
ALTER TABLE "documentos_evidencias" DROP CONSTRAINT "documentos_evidencias_documento_id_fkey";

-- DropForeignKey
ALTER TABLE "documentos_evidencias" DROP CONSTRAINT "documentos_evidencias_evidencia_id_fkey";

-- DropForeignKey
ALTER TABLE "expedientes" DROP CONSTRAINT "expedientes_creador_id_fkey";

-- DropForeignKey
ALTER TABLE "incidencias" DROP CONSTRAINT "incidencias_usuario_id_fkey";

-- DropForeignKey
ALTER TABLE "reglas" DROP CONSTRAINT "reglas_aprobador_id_fkey";

-- DropForeignKey
ALTER TABLE "reglas" DROP CONSTRAINT "reglas_evidencia_id_fkey";

-- DropForeignKey
ALTER TABLE "revisiones" DROP CONSTRAINT "revisiones_documento_id_fkey";

-- DropForeignKey
ALTER TABLE "revisiones" DROP CONSTRAINT "revisiones_expediente_id_fkey";

-- DropForeignKey
ALTER TABLE "revisiones" DROP CONSTRAINT "revisiones_usuario_id_fkey";

-- DropForeignKey
ALTER TABLE "validaciones" DROP CONSTRAINT "validaciones_documento_id_fkey";

-- DropForeignKey
ALTER TABLE "validaciones" DROP CONSTRAINT "validaciones_expediente_id_fkey";

-- DropForeignKey
ALTER TABLE "validaciones" DROP CONSTRAINT "validaciones_regla_id_fkey";

-- DropForeignKey
ALTER TABLE "validaciones" DROP CONSTRAINT "validaciones_usuario_id_fkey";

-- DropForeignKey
ALTER TABLE "validaciones_evidencias" DROP CONSTRAINT "validaciones_evidencias_evidencia_id_fkey";

-- DropForeignKey
ALTER TABLE "validaciones_evidencias" DROP CONSTRAINT "validaciones_evidencias_validacion_id_fkey";

-- DropTable
DROP TABLE "ai_function_logs";

-- DropTable
DROP TABLE "ai_function_versions";

-- DropTable
DROP TABLE "ai_functions";

-- DropTable
DROP TABLE "ai_providers";

-- DropTable
DROP TABLE "alternativas_procedimiento";

-- DropTable
DROP TABLE "audit_log";

-- DropTable
DROP TABLE "comentarios";

-- DropTable
DROP TABLE "cpv_codigos";

-- DropTable
DROP TABLE "cpv_recomendados";

-- DropTable
DROP TABLE "documento_generaciones";

-- DropTable
DROP TABLE "documento_secciones";

-- DropTable
DROP TABLE "documento_versiones";

-- DropTable
DROP TABLE "documentos";

-- DropTable
DROP TABLE "documentos_evidencias";

-- DropTable
DROP TABLE "evidencias";

-- DropTable
DROP TABLE "expedientes";

-- DropTable
DROP TABLE "incidencias";

-- DropTable
DROP TABLE "profiles";

-- DropTable
DROP TABLE "reglas";

-- DropTable
DROP TABLE "revisiones";

-- DropTable
DROP TABLE "user_roles";

-- DropTable
DROP TABLE "validaciones";

-- DropTable
DROP TABLE "validaciones_evidencias";

-- DropEnum
DROP TYPE "DecisionRevision";

-- DropEnum
DROP TYPE "EstadoExpediente";

-- DropEnum
DROP TYPE "EstadoRevision";

-- DropEnum
DROP TYPE "NivelRiesgo";

-- DropEnum
DROP TYPE "RolUsuario";

-- DropEnum
DROP TYPE "SeveridadRegla";

-- DropEnum
DROP TYPE "TipoContrato";

-- DropEnum
DROP TYPE "TipoDocumento";

-- DropEnum
DROP TYPE "TipoFuente";

-- DropEnum
DROP TYPE "TipoProcedimiento";

-- CreateTable
CREATE TABLE "Profile" (
    "id" UUID NOT NULL,
    "email" TEXT,
    "password" TEXT,
    "name" TEXT NOT NULL,
    "lastName" TEXT,
    "unit" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "showWizardHelp" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRoleAssignment" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "UserRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRoleAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Case" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "creatorId" UUID NOT NULL,
    "status" "CaseStatus" NOT NULL DEFAULT 'draft',
    "contractType" "ContractType" NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT,
    "estimatedContractValue" DECIMAL(15,2),
    "baseTenderBudget" DECIMAL(15,2),
    "vat" DECIMAL(15,2),
    "extensionsAmount" DECIMAL(15,2),
    "modificationsAmount" DECIMAL(15,2),
    "proposedProcedure" "ProcedureType",
    "selectedProcedure" "ProcedureType",
    "selectedCpv" TEXT,
    "hasLots" BOOLEAN NOT NULL DEFAULT false,
    "lotsJustification" TEXT,
    "numLots" INTEGER,
    "isUrgent" BOOLEAN NOT NULL DEFAULT false,
    "isEmergency" BOOLEAN NOT NULL DEFAULT false,
    "urgencyJustification" TEXT,
    "completionPercentage" INTEGER NOT NULL DEFAULT 0,
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'green',
    "lastPendingAction" TEXT,
    "dueDate" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Case_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcedureAlternative" (
    "id" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "procedure" "ProcedureType" NOT NULL,
    "score" INTEGER,
    "justification" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcedureAlternative_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendedCpv" (
    "id" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "score" INTEGER,
    "justification" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecommendedCpv_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CpvCode" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "descriptionEn" TEXT,
    "level" INTEGER NOT NULL,
    "parentCode" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CpvCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" UUID NOT NULL,
    "sourceType" "SourceType" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "section" TEXT,
    "range" TEXT,
    "version" TEXT NOT NULL,
    "validityStart" DATE NOT NULL,
    "validityEnd" DATE,
    "textFragment" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rule" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "RuleSeverity" NOT NULL,
    "evidenceId" UUID,
    "condition" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "approverId" UUID,
    "approverRole" "UserRole",
    "approvalDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "type" "DocumentType" NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "hash" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'pending',
    "content" JSONB,
    "docxUrl" TEXT,
    "pdfUrl" TEXT,
    "creatorId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentSection" (
    "id" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "tokensUsed" INTEGER,
    "generationTimeMs" INTEGER,
    "lcspArticles" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentGeneration" (
    "id" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "plan" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'planning',
    "currentSection" INTEGER NOT NULL DEFAULT 0,
    "totalSections" INTEGER,
    "globalReview" JSONB,
    "errors" JSONB,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "DocumentGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentVersion" (
    "id" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "contentSnapshot" JSONB NOT NULL,
    "sectionsSnapshot" JSONB,
    "changeDescription" TEXT,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentEvidence" (
    "id" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "evidenceId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Validation" (
    "id" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "documentId" UUID,
    "ruleId" UUID NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "foundValue" TEXT,
    "explanation" TEXT NOT NULL,
    "structureScore" INTEGER,
    "contentScore" INTEGER,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Validation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ValidationEvidence" (
    "id" UUID NOT NULL,
    "validationId" UUID NOT NULL,
    "evidenceId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ValidationEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "documentId" UUID,
    "userId" UUID NOT NULL,
    "role" "UserRole" NOT NULL,
    "changeDescription" TEXT NOT NULL,
    "decision" "ReviewDecision" NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" UUID NOT NULL,
    "reviewId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "UserRole" NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "caseId" UUID,
    "userId" UUID,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" UUID,
    "previousData" JSONB,
    "newData" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiProvider" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AiProviderType" NOT NULL DEFAULT 'custom',
    "baseUrl" TEXT NOT NULL,
    "apiKeySecretName" TEXT,
    "availableModels" TEXT[],
    "defaultParams" JSONB NOT NULL DEFAULT '{"temperature": 0.3}',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiFunction" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "providerId" UUID,
    "model" TEXT NOT NULL,
    "systemPrompt" TEXT NOT NULL,
    "userPromptTemplate" TEXT,
    "toolSchema" JSONB,
    "params" JSONB NOT NULL DEFAULT '{"temperature": 0.3}',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiFunction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiFunctionVersion" (
    "id" UUID NOT NULL,
    "functionId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "systemPrompt" TEXT NOT NULL,
    "userPromptTemplate" TEXT,
    "toolSchema" JSONB,
    "params" JSONB,
    "model" TEXT NOT NULL,
    "providerId" UUID,
    "changeReason" TEXT,
    "createdBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiFunctionVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiFunctionLog" (
    "id" UUID NOT NULL,
    "functionCode" TEXT NOT NULL,
    "functionName" TEXT,
    "providerName" TEXT,
    "model" TEXT NOT NULL,
    "inputVariables" JSONB NOT NULL DEFAULT '{}',
    "systemPrompt" TEXT,
    "userPrompt" TEXT,
    "response" JSONB,
    "tokensInput" INTEGER,
    "tokensOutput" INTEGER,
    "durationMs" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'success',
    "errorMessage" TEXT,
    "userId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiFunctionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Issue" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "location" TEXT NOT NULL,
    "functionality" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "expectedBehavior" TEXT NOT NULL,
    "screenshotUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Issue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Profile_email_key" ON "Profile"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserRoleAssignment_userId_role_key" ON "UserRoleAssignment"("userId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "Case_code_key" ON "Case"("code");

-- CreateIndex
CREATE INDEX "Case_status_idx" ON "Case"("status");

-- CreateIndex
CREATE INDEX "Case_creatorId_idx" ON "Case"("creatorId");

-- CreateIndex
CREATE INDEX "Case_unit_idx" ON "Case"("unit");

-- CreateIndex
CREATE UNIQUE INDEX "CpvCode_code_key" ON "CpvCode"("code");

-- CreateIndex
CREATE INDEX "CpvCode_code_idx" ON "CpvCode"("code");

-- CreateIndex
CREATE INDEX "CpvCode_level_idx" ON "CpvCode"("level");

-- CreateIndex
CREATE INDEX "CpvCode_active_idx" ON "CpvCode"("active");

-- CreateIndex
CREATE UNIQUE INDEX "Rule_code_key" ON "Rule"("code");

-- CreateIndex
CREATE INDEX "Document_caseId_idx" ON "Document"("caseId");

-- CreateIndex
CREATE INDEX "DocumentSection_documentId_idx" ON "DocumentSection"("documentId");

-- CreateIndex
CREATE INDEX "DocumentSection_status_idx" ON "DocumentSection"("status");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentSection_documentId_order_key" ON "DocumentSection"("documentId", "order");

-- CreateIndex
CREATE INDEX "DocumentGeneration_documentId_idx" ON "DocumentGeneration"("documentId");

-- CreateIndex
CREATE INDEX "DocumentGeneration_status_idx" ON "DocumentGeneration"("status");

-- CreateIndex
CREATE INDEX "DocumentVersion_documentId_idx" ON "DocumentVersion"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentVersion_documentId_version_key" ON "DocumentVersion"("documentId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentEvidence_documentId_evidenceId_key" ON "DocumentEvidence"("documentId", "evidenceId");

-- CreateIndex
CREATE INDEX "Validation_caseId_idx" ON "Validation"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "ValidationEvidence_validationId_evidenceId_key" ON "ValidationEvidence"("validationId", "evidenceId");

-- CreateIndex
CREATE INDEX "Review_caseId_idx" ON "Review"("caseId");

-- CreateIndex
CREATE INDEX "AuditLog_caseId_idx" ON "AuditLog"("caseId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "AiProvider_name_key" ON "AiProvider"("name");

-- CreateIndex
CREATE UNIQUE INDEX "AiFunction_code_key" ON "AiFunction"("code");

-- CreateIndex
CREATE UNIQUE INDEX "AiFunctionVersion_functionId_version_key" ON "AiFunctionVersion"("functionId", "version");

-- CreateIndex
CREATE INDEX "AiFunctionLog_createdAt_idx" ON "AiFunctionLog"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "AiFunctionLog_functionCode_idx" ON "AiFunctionLog"("functionCode");

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcedureAlternative" ADD CONSTRAINT "ProcedureAlternative_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendedCpv" ADD CONSTRAINT "RecommendedCpv_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rule" ADD CONSTRAINT "Rule_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rule" ADD CONSTRAINT "Rule_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentSection" ADD CONSTRAINT "DocumentSection_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentGeneration" ADD CONSTRAINT "DocumentGeneration_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentEvidence" ADD CONSTRAINT "DocumentEvidence_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentEvidence" ADD CONSTRAINT "DocumentEvidence_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Validation" ADD CONSTRAINT "Validation_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Validation" ADD CONSTRAINT "Validation_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Validation" ADD CONSTRAINT "Validation_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "Rule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Validation" ADD CONSTRAINT "Validation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValidationEvidence" ADD CONSTRAINT "ValidationEvidence_validationId_fkey" FOREIGN KEY ("validationId") REFERENCES "Validation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValidationEvidence" ADD CONSTRAINT "ValidationEvidence_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiFunction" ADD CONSTRAINT "AiFunction_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "AiProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiFunctionVersion" ADD CONSTRAINT "AiFunctionVersion_functionId_fkey" FOREIGN KEY ("functionId") REFERENCES "AiFunction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiFunctionVersion" ADD CONSTRAINT "AiFunctionVersion_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "AiProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiFunctionVersion" ADD CONSTRAINT "AiFunctionVersion_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
