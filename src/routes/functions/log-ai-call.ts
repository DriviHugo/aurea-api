/**
 * Utility: logAICall
 * Persists an AI function invocation to AiFunctionLog so the admin
 * AI-monitoring tab (AICallLogsTable) shows data — mirroring the behaviour
 * of Supabase edge functions in the main branch which wrote to
 * ai_function_logs automatically.
 *
 * Call fire-and-forget (do NOT await in the critical path) to avoid
 * impacting response latency.
 */

import type { PrismaClient } from "@prisma/client";
import logger from "../../config/logger.js";

export interface LogAICallParams {
  prisma: PrismaClient;
  functionCode: string;
  functionName?: string | null;
  providerName?: string | null;
  model: string;
  systemPrompt?: string | null;
  userPrompt?: string | null;
  inputVariables?: Record<string, unknown>;
  response?: unknown;
  tokensInput?: number | null;
  tokensOutput?: number | null;
  durationMs?: number | null;
  status?: "success" | "error";
  errorMessage?: string | null;
  userId?: string | null;
}

export function logAICall(params: LogAICallParams): void {
  const {
    prisma,
    functionCode,
    functionName,
    providerName,
    model,
    systemPrompt,
    userPrompt,
    inputVariables,
    response,
    tokensInput,
    tokensOutput,
    durationMs,
    status = "success",
    errorMessage,
    userId,
  } = params;

  // Fire-and-forget: we intentionally don't await so the response is not blocked
  prisma.aiFunctionLog
    .create({
      data: {
        functionCode,
        functionName: functionName ?? null,
        providerName: providerName ?? null,
        model,
        systemPrompt: systemPrompt ?? null,
        userPrompt: userPrompt ?? null,
        inputVariables: (inputVariables ?? {}) as object,
        response: (response ?? null) as object,
        tokensInput: tokensInput ?? null,
        tokensOutput: tokensOutput ?? null,
        durationMs: durationMs ?? null,
        status,
        errorMessage: errorMessage ?? null,
        userId: userId ?? null,
      },
    })
    .catch((err: unknown) => {
      // Log to app logger but never surface to the end user
      logger.warn({
        msg: "[logAICall] Failed to persist AI call log",
        functionCode,
        error: err instanceof Error ? err.message : String(err),
      });
    });
}
