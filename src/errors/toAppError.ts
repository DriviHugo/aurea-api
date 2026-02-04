import { AppError } from "./appError.js";
import { isAppError } from "./appErrorGuard.js";
import errorMessages from "./errorMessages.js";

function isJwtError(error: unknown): boolean {
  if (error == null || typeof error !== "object") {
    return false;
  }

  const name = (error as { name?: unknown }).name;
  return (
    name === "JsonWebTokenError" ||
    name === "TokenExpiredError" ||
    name === "NotBeforeError"
  );
}

function isFastifyValidationError(error: unknown): boolean {
  return (
    error != null &&
    typeof error === "object" &&
    "validation" in error &&
    Array.isArray((error as { validation?: unknown }).validation)
  );
}

function isPrismaKnownRequestError(
  error: unknown,
): error is { name?: string; code: string; meta?: unknown } {
  if (error == null || typeof error !== "object") {
    return false;
  }

  const code = (error as { code?: unknown }).code;
  if (typeof code !== "string") {
    return false;
  }

  return true;
}

export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (isFastifyValidationError(error)) {
    const statusCode =
      typeof (error as { statusCode?: unknown }).statusCode === "number"
        ? (error as { statusCode: number }).statusCode
        : 400;

    const message =
      typeof (error as { message?: unknown }).message === "string"
        ? (error as { message: string }).message
        : errorMessages.general[400];

    return new AppError({
      statusCode,
      message,
      code: "VALIDATION_ERROR",
      details: {
        source: "fastify",
      },
      cause: error,
      stack: error instanceof Error ? error.stack : undefined,
    });
  }

  if (isJwtError(error)) {
    return new AppError({
      statusCode: 401,
      message: errorMessages.auth[401],
      code: "UNAUTHORIZED",
      details: { source: "jwt" },
      cause: error,
      stack: error instanceof Error ? error.stack : undefined,
    });
  }

  if (isPrismaKnownRequestError(error)) {
    if (error.code === "P2002") {
      return new AppError({
        statusCode: 409,
        message: errorMessages.general[409],
        code: "CONFLICT",
        details: {
          source: "prisma",
        },
        cause: error,
        stack: error instanceof Error ? error.stack : undefined,
      });
    }

    return new AppError({
      statusCode: 400,
      message: errorMessages.general[400],
      code: "BAD_REQUEST",
      details: {
        source: "prisma",
      },
      cause: error,
      stack: error instanceof Error ? error.stack : undefined,
    });
  }

  if (
    error != null &&
    typeof error === "object" &&
    typeof (error as { statusCode?: unknown }).statusCode === "number"
  ) {
    const statusCode = (error as { statusCode: number }).statusCode;
    const maybeFastifyCode = (error as { code?: unknown }).code;
    const code =
      typeof maybeFastifyCode === "string" ? maybeFastifyCode : "HTTP_ERROR";
    const message =
      statusCode >= 500
        ? errorMessages.general[500]
        : typeof (error as { message?: unknown }).message === "string"
          ? (error as { message: string }).message
          : errorMessages.general[
              statusCode as 400 | 401 | 403 | 404 | 409 | 429
            ];

    return new AppError({
      statusCode,
      message,
      code,
      details: { source: "fastify" },
      cause: error,
      stack: error instanceof Error ? error.stack : undefined,
    });
  }

  return new AppError({
    statusCode: 500,
    message: errorMessages.general[500],
    code: "INTERNAL_SERVER_ERROR",
    cause: error,
    stack: error instanceof Error ? error.stack : undefined,
  });
}
