/**
 * Audit logging — persists admin/security actions to AuditLog so the
 * admin "Auditoría" tab shows who did what (who logs in, who creates a
 * user, password changes...). Mirrors the Supabase edge functions in the
 * Lovable/main version that wrote to the `audit_log` table.
 *
 * Best-effort: failures are logged but never break the originating action.
 */

import type { PrismaClient } from "@prisma/client";
import logger from "../config/logger.js";

export interface WriteAuditLogParams {
  prisma: PrismaClient;
  action: string;
  entity: string;
  entityId?: string | null;
  userId?: string | null;
  previousData?: unknown;
  newData?: unknown;
  ipAddress?: string | null;
  caseId?: string | null;
}

export async function writeAuditLog({
  prisma,
  action,
  entity,
  entityId,
  userId,
  previousData,
  newData,
  ipAddress,
  caseId,
}: WriteAuditLogParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        entity,
        entityId: entityId ?? null,
        userId: userId ?? null,
        ipAddress: ipAddress ?? null,
        caseId: caseId ?? null,
        // Json? columns: only set when provided so the column otherwise stays NULL
        ...(previousData != null ? { previousData: previousData as object } : {}),
        ...(newData != null ? { newData: newData as object } : {}),
      },
    });
  } catch (err) {
    logger.warn({
      msg: "[writeAuditLog] Failed to persist audit entry",
      action,
      entity,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
