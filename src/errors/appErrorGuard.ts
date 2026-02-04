import type { AppError } from "./appError.js";

export function isAppErrorLike(error: unknown): error is {
  name: string;
  statusCode: number;
  code?: string;
  headers?: Record<string, string>;
  details?: unknown;
} {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { name?: string }).name === "AppError" &&
    typeof (error as { statusCode?: unknown }).statusCode === "number"
  );
}

export function isAppError(error: unknown): error is AppError {
  return isAppErrorLike(error);
}
