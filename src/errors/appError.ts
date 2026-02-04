import type { FastifyRequest } from "fastify";
import logger from "../config/logger.js";
import { errorToLogObject, requestToLogObject } from "../utils/logging.js";

export type ErrorHeaders = Record<string, string>;

export type AppErrorReportLevel = "error" | "warn" | "info";

export interface AppErrorDetails {
  source?: string;
  meta?: unknown;
  tags?: string[];
}

export interface AppErrorOptions {
  message: string;
  statusCode: number;
  code?: string;
  headers?: ErrorHeaders;
  details?: AppErrorDetails;
  cause?: unknown;
  request?: FastifyRequest;
  level?: AppErrorReportLevel;
  stack?: unknown;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code?: string;
  public readonly headers?: ErrorHeaders;
  public readonly details?: AppErrorDetails;
  public readonly request?: FastifyRequest;
  public readonly level?: AppErrorReportLevel;

  constructor(options: AppErrorOptions) {
    super(
      options.message,
      options.cause != null ? { cause: options.cause } : undefined,
    );
    this.name = "AppError";
    this.statusCode = options.statusCode;

    if (options.code !== undefined) {
      this.code = options.code;
    }

    if (options.headers !== undefined) {
      this.headers = options.headers;
    }

    if (options.details !== undefined) {
      this.details = options.details;
    }

    if (options.request !== undefined) {
      this.request = options.request;
    }

    if (options.level !== undefined) {
      this.level = options.level;
    }

    if (
      options.stack === undefined &&
      this.cause instanceof Error &&
      this.cause.stack !== undefined
    ) {
      this.stack = `${this.stack?.toString()}\nCaused by: ${this.cause.stack.toString()}`;
      delete this.cause.stack;
    }

    if (options.stack !== undefined && typeof options.stack === "string") {
      this.stack = options.stack;
      if (this.cause instanceof Error) {
        delete this.cause.stack;
      }
    }
  }

  report(): void {
    const level = this.level ?? "error";
    const request = this.request;
    const objectError = {
      ...(request ? requestToLogObject(request) : null),
      statusCode: this.statusCode,
      code: this.code,
      ...errorToLogObject(this),
    };

    switch (level) {
      case "info":
        logger.info(this.message, objectError);
        return;
      case "warn":
        logger.warn(this.message, objectError);
        return;
      case "error":
        logger.error(this.message, objectError);
        return;
      default:
        logger.error(this.message, objectError);
        return;
    }
  }
}
