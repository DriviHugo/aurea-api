-- CreateEnum
CREATE TYPE "ProcessingRegime" AS ENUM ('ordinaria', 'urgente_119', 'emergencia_120');

-- CreateEnum
CREATE TYPE "EmergencyOperationalRoute" AS ENUM ('am_direct_purchase', 'am_second_tender', 'sda_invitation', 'own_means', 'immediate_action');

-- CreateEnum
CREATE TYPE "EmergencyReason" AS ENUM ('catastrofe', 'peligro_grave', 'defensa_nacional');

-- CreateEnum
CREATE TYPE "DeliveryType" AS ENUM ('single', 'successive');

-- CreateEnum
CREATE TYPE "DeliveryFrequency" AS ENUM ('monthly', 'quarterly', 'on_demand');

-- CreateEnum
CREATE TYPE "DeliveryDeadlineUnit" AS ENUM ('days', 'weeks');

-- CreateEnum
CREATE TYPE "DeliveryLocationMode" AS ENUM ('single_location', 'multiple_locations');

-- CreateEnum
CREATE TYPE "FiscalRegime" AS ENUM ('IVA', 'IGIC', 'IPSI');

-- CreateEnum
CREATE TYPE "InnovationLevel" AS ENUM ('existe', 'requiere_adaptacion', 'no_existe');

-- CreateEnum
CREATE TYPE "CentralizationNotApplicableReason" AS ENUM ('error_identificacion', 'causa_juridica');

-- AlterTable
ALTER TABLE "Case" ADD COLUMN     "centralizationNotApplicableReason" "CentralizationNotApplicableReason",
ADD COLUMN     "deliveryDeadlineUnit" "DeliveryDeadlineUnit",
ADD COLUMN     "deliveryDeadlineValue" INTEGER,
ADD COLUMN     "deliveryFrequency" "DeliveryFrequency",
ADD COLUMN     "deliveryLocationMode" "DeliveryLocationMode",
ADD COLUMN     "deliveryLocations" JSONB,
ADD COLUMN     "deliveryType" "DeliveryType",
ADD COLUMN     "durationMonths" INTEGER,
ADD COLUMN     "emergencyJustification" TEXT,
ADD COLUMN     "emergencyOperationalRoute" "EmergencyOperationalRoute",
ADD COLUMN     "emergencyReasons" "EmergencyReason"[],
ADD COLUMN     "extensionMonths" INTEGER,
ADD COLUMN     "fiscalRegime" "FiscalRegime",
ADD COLUMN     "hasOwnMeans" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "includesIDPhases" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "innovationLevel" "InnovationLevel",
ADD COLUMN     "isSubscription" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maxBudget" DECIMAL(15,2),
ADD COLUMN     "overrideInnovation" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pblAdjustedToMax" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "processingRegime" "ProcessingRegime",
ADD COLUMN     "supplyPeriodMonths" INTEGER;
