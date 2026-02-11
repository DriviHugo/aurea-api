import type { FastifyRequest } from "fastify";
import { isAppErrorLike } from "../errors/appErrorGuard.js";

export function errorToLogObject(error: unknown): Record<string, unknown> {
  function serializeCause(cause: unknown, seen = new WeakSet()): unknown {
    if (cause === undefined || cause === null) return cause;
    if (typeof cause !== "object") return cause;
    if (seen.has(cause)) return "[Circular]";
    seen.add(cause);
    const result: Record<string, unknown> = {};
    for (const key of Object.getOwnPropertyNames(cause)) {
      try {
        const value = (cause as any)[key];
        result[key] =
          typeof value === "object" && value !== null
            ? serializeCause(value, seen)
            : value;
      } catch (e) {
        result[key] = `[Unserializable: ${(e as Error).message}]`;
      }
    }
    return result;
  }

  if (error instanceof Error && Boolean(isAppErrorLike(error))) {
    const appError = error as Error & {
      statusCode: number;
      code?: string;
      headers?: Record<string, string>;
      details?: unknown;
      cause?: unknown;
    };
    return {
      stack: appError.stack,
      headers: appError.headers,
      details: appError.details,
      cause: serializeCause(appError.cause),
    };
  }

  if (error instanceof Error) {
    return {
      stack: error.stack,
      cause: serializeCause(error.cause),
    };
  }

  return { error };
}

export function requestToLogObject(
  request: FastifyRequest,
): Record<string, unknown> {
  return {
    requestId: request.id,
    originRequestId: request.originRequestId,
    method: request.method,
    url: request.url,
    query: request.query,
    params: request.params,
  };
}
