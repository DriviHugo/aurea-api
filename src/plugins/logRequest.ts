import fastifyPlugin from "fastify-plugin";
import logger from "../config/logger.js";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requestToLogObject } from "../utils/logging.js";

export default fastifyPlugin(async (fastify) => {
  fastify.addHook(
    "onResponse",
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (reply.statusCode >= 400) return;

      logger.info(`Request with status code ${reply.statusCode}`, {
        ...requestToLogObject(request),
        statusCode: reply.statusCode,
        responseTime: reply.elapsedTime.toFixed(4),
      });
    },
  );
});
