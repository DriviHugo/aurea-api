import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import multipart from "@fastify/multipart";
import compress from "@fastify/compress";
import fastifySwaggerUi from "@fastify/swagger-ui";
import fastifySwagger from "@fastify/swagger";
import fastifyModule, { type FastifyInstance } from "fastify";
import { v4 as uuidv4 } from "uuid";

import logRequest from "./plugins/logRequest.js";
import { swaggerConfig, swaggerUiConfig } from "./config/swagger.js";
import swaggerSchemas from "./schema/swagger.js";
import privateRoutes from "./routes/private/index.js";
import publicRoutes from "./routes/public/index.js";
import functionsRoutes from "./routes/functions/index.js";
import authAccessToken from "./plugins/authAccessToken.js";
import authRefreshToken from "./plugins/authRefreshToken.js";
import customFormatsAjvPlugin from "./plugins/ajvCustomFormats.js";
import errorHandler from "./plugins/errorHandler.js";
import originRequestId from "./plugins/originRequestId.js";
import prismaPlugin from "./plugins/prisma.js";
import { registerRateLimiting } from "./plugins/rateLimit.js";

const regularRoutePath = "/api";

const fastify: FastifyInstance = fastifyModule({
  genReqId: () => uuidv4(),
  logger: false,
});

const isSwaggerEnabled =
  process.env["NODE_ENV"] !== "production" ||
  process.env["SWAGGER_ENABLED"] === "true";

// Plugins
const corsOrigins = process.env["FRONTEND_BASE_URL"]
  ? [process.env["FRONTEND_BASE_URL"]]
  : [];
if (process.env["CORS_EXTRA_ORIGINS"]?.trim()) {
  corsOrigins.push(
    ...process.env["CORS_EXTRA_ORIGINS"].split(",").map((o) => o.trim()),
  );
}

fastify.register(cors, {
  origin: corsOrigins,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
});

fastify.register(helmet);
fastify.register(cookie, {
  secret: process.env["COOKIE_SECRET"]!,
});
fastify.register(compress);
fastify.register(multipart, {
  attachFieldsToBody: true,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB
  },
});
if (isSwaggerEnabled) {
  fastify.register(fastifySwagger, swaggerConfig);
  fastify.register(fastifySwaggerUi, swaggerUiConfig);
}
fastify.register(swaggerSchemas);
fastify.register(customFormatsAjvPlugin);
fastify.register(prismaPlugin);
fastify.register(originRequestId);
fastify.register(errorHandler);
fastify.register(registerRateLimiting);

// Hooks
fastify.register(logRequest);
fastify.register(authAccessToken);
fastify.register(authRefreshToken);

// Routes
fastify.register(privateRoutes, { prefix: `${regularRoutePath}/private` });
fastify.register(publicRoutes, { prefix: `${regularRoutePath}/public` });
fastify.register(functionsRoutes, { prefix: `${regularRoutePath}/functions` });
fastify.register(functionsRoutes, {
  prefix: `${regularRoutePath}/private/functions`,
});

// Liveness endpoint (process is up)
fastify.get("/health/live", async () => {
  return {
    status: "ok",
    type: "live",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };
});

// Readiness endpoint (critical dependencies available)
fastify.get("/health/ready", async (_request, reply) => {
  try {
    await fastify.prisma.$queryRaw`SELECT 1`;
    return {
      status: "ok",
      type: "ready",
      timestamp: new Date().toISOString(),
    };
  } catch {
    return reply.code(503).send({
      status: "error",
      type: "ready",
      timestamp: new Date().toISOString(),
    });
  }
});

// Backward compatible health endpoint
fastify.get("/health", async () => {
  return {
    status: "ok",
    type: "live",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };
});

export default fastify;
