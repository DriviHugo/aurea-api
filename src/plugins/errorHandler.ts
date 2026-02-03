import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import logger from "../config/logger.js";
import { toAppError } from "../errors/toAppError.js";
import { Errors } from "../errors/appErrorFactory.js";
import { errorToLogObject, requestToLogObject } from "../utils/logging.js";

export default fp(async (fastify: FastifyInstance) => {
  fastify.setNotFoundHandler(async () => {
    throw new Errors.notFound();
  });

  fastify.setErrorHandler(async (error, request, reply) => {
    const appError = toAppError(error);

    if (appError.headers) {
      for (const [key, value] of Object.entries(appError.headers)) {
        reply.header(key, value);
      }
    }

    const requestForLog = appError.request ?? request;
    const errorObject = {
      ...requestToLogObject(requestForLog),
      statusCode: appError.statusCode,
      code: appError.code,
    };

    const defaultLevel = appError.statusCode >= 500 ? "error" : "warn";
    const level = appError.level ?? defaultLevel;
    const message = appError.message;
    const payload = {
      ...errorObject,
      ...errorToLogObject(appError),
    };

    switch (level) {
      case "info":
        logger.info(message, payload);
        break;
      case "warn":
        logger.warn(message, payload);
        break;
      case "error":
        logger.error(message, payload);
        break;
      default:
        logger.error(message, payload);
        break;
    }

    if (reply.sent) {
      return;
    }

    return reply.code(appError.statusCode).send({ message: appError.message });
  });
});
