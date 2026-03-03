-- CreateEnum
CREATE TYPE "TestCaseStatus" AS ENUM ('pending', 'passed', 'failed', 'blocked', 'validate');

-- CreateEnum
CREATE TYPE "RepairRuleType" AS ENUM ('do', 'dont');

-- CreateTable
CREATE TABLE "TestCase" (
    "id" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "observations" TEXT,
    "status" "TestCaseStatus" NOT NULL DEFAULT 'pending',
    "promotingUnit" TEXT,
    "contractingBody" TEXT,
    "createdBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepairDocument" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "errorMessage" TEXT,
    "uploadedBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepairDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepairExtraction" (
    "id" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "affectedSection" TEXT,
    "errorType" TEXT,
    "literalDescription" TEXT NOT NULL,
    "normReference" TEXT,
    "consequence" TEXT,
    "originalText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepairExtraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepairRule" (
    "id" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "extractionId" UUID,
    "caseSection" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "type" "RepairRuleType" NOT NULL,
    "content" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepairRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RuleUsage" (
    "id" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "sectionId" UUID NOT NULL,
    "ruleId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RuleUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SectionQuestion" (
    "id" UUID NOT NULL,
    "sectionId" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "order" INTEGER NOT NULL,
    "round" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SectionQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TestCase_createdAt_idx" ON "TestCase"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "RepairDocument_createdAt_idx" ON "RepairDocument"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "RepairExtraction_documentId_idx" ON "RepairExtraction"("documentId");

-- CreateIndex
CREATE INDEX "RepairRule_documentId_idx" ON "RepairRule"("documentId");

-- CreateIndex
CREATE INDEX "RepairRule_active_idx" ON "RepairRule"("active");

-- CreateIndex
CREATE INDEX "RuleUsage_documentId_sectionId_idx" ON "RuleUsage"("documentId", "sectionId");

-- CreateIndex
CREATE INDEX "SectionQuestion_sectionId_idx" ON "SectionQuestion"("sectionId");

-- CreateIndex
CREATE INDEX "SectionQuestion_documentId_idx" ON "SectionQuestion"("documentId");

-- AddForeignKey
ALTER TABLE "RepairExtraction" ADD CONSTRAINT "RepairExtraction_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "RepairDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairRule" ADD CONSTRAINT "RepairRule_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "RepairDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairRule" ADD CONSTRAINT "RepairRule_extractionId_fkey" FOREIGN KEY ("extractionId") REFERENCES "RepairExtraction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RuleUsage" ADD CONSTRAINT "RuleUsage_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "RepairRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
