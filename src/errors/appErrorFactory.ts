import errorMessages from "./errorMessages.js";
import { AppError, type AppErrorDetails } from "./appError.js";

interface ErrorFactoryOptions {
  message?: string;
  cause?: unknown;
  details?: AppErrorDetails;
}

interface ErrorDefaults {
  statusCode: number;
  message: string;
  code: string;
}

// Helper to merge options with defaults
function mergeOptions(
  defaults: ErrorDefaults,
  options: ErrorFactoryOptions = {},
): ErrorDefaults & ErrorFactoryOptions {
  return {
    ...defaults,
    ...(options.message !== undefined ? { message: options.message } : {}),
    ...(options.cause !== undefined ? { cause: options.cause } : {}),
    ...(options.details !== undefined ? { details: options.details } : {}),
  };
}

export const Errors = {
  badRequest: class BadRequest extends AppError {
    constructor(options: ErrorFactoryOptions = {}) {
      super(
        mergeOptions(
          {
            statusCode: 400,
            message: errorMessages.general[400],
            code: "BAD_REQUEST",
          },
          options,
        ),
      );
    }
  },
  unauthorizedToken: class UnauthorizedToken extends AppError {
    constructor(options: ErrorFactoryOptions = {}) {
      super(
        mergeOptions(
          {
            statusCode: 401,
            message: errorMessages.auth[401],
            code: "UNAUTHORIZED_TOKEN",
          },
          options,
        ),
      );
    }
  },
  unauthorizedApiKey: class UnauthorizedApiKey extends AppError {
    constructor(options: ErrorFactoryOptions = {}) {
      super(
        mergeOptions(
          {
            statusCode: 401,
            message: errorMessages.public[401],
            code: "UNAUTHORIZED_API_KEY",
          },
          options,
        ),
      );
    }
  },
  forbidden: class Forbidden extends AppError {
    constructor(options: ErrorFactoryOptions = {}) {
      super(
        mergeOptions(
          {
            statusCode: 403,
            message: errorMessages.general[403],
            code: "FORBIDDEN_PRIVATE",
          },
          options,
        ),
      );
    }
  },
  forbiddenPublic: class ForbiddenPublic extends AppError {
    constructor(options: ErrorFactoryOptions = {}) {
      super(
        mergeOptions(
          {
            statusCode: 403,
            message: errorMessages.public[403],
            code: "FORBIDDEN_PUBLIC",
          },
          options,
        ),
      );
    }
  },
  notFound: class NotFound extends AppError {
    constructor(options: ErrorFactoryOptions = {}) {
      super(
        mergeOptions(
          {
            statusCode: 404,
            message: errorMessages.general[404],
            code: "NOT_FOUND",
          },
          options,
        ),
      );
    }
  },
  tooManyRequests: class TooManyRequests extends AppError {
    constructor(options: ErrorFactoryOptions = {}) {
      super(
        mergeOptions(
          {
            statusCode: 429,
            message: errorMessages.general[429],
            code: "TOO_MANY_REQUESTS",
          },
          options,
        ),
      );
    }
  },
  internal: class Internal extends AppError {
    constructor(options: ErrorFactoryOptions = {}) {
      super(
        mergeOptions(
          {
            statusCode: 500,
            message: errorMessages.general[500],
            code: "INTERNAL_SERVER_ERROR",
          },
          options,
        ),
      );
    }
  },
} as const;
