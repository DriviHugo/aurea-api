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
// OLD BOILERPLATE PLUGINS (DISABLED)
// import authApiKey from "./plugins/authApiKey.js";
// import allowAdmin from "./plugins/allowAdmin.js";
// import isSameUserOrAdmin from "./plugins/isSameUserOrAdmin.js";
import customFormatsAjvPlugin from "./plugins/ajvCustomFormats.js";
import errorHandler from "./plugins/errorHandler.js";
import originRequestId from "./plugins/originRequestId.js";
import prismaPlugin from "./plugins/prisma.js";

const regularRoutePath = "/api";

const fastify: FastifyInstance = fastifyModule({
  genReqId: () => uuidv4(),
});

// Plugins
fastify.register(cors, {
  origin: [
    process.env["FRONTEND_BASE_URL"] ?? "http://localhost:8080",
    "http://localhost:8080",
    "http://localhost:8081",
    "http://127.0.0.1:8080",
    "http://127.0.0.1:8081",
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
});

fastify.register(helmet);
fastify.register(cookie, {
  secret: process.env["COOKIE_SECRET"] ?? "defaultCookieSecret",
});
fastify.register(compress);
fastify.register(multipart, {
  attachFieldsToBody: true,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB
  },
});
fastify.register(fastifySwagger, swaggerConfig);
fastify.register(fastifySwaggerUi, swaggerUiConfig);
fastify.register(swaggerSchemas);
fastify.register(customFormatsAjvPlugin);
fastify.register(prismaPlugin);
fastify.register(originRequestId);
fastify.register(errorHandler);

// Hooks
fastify.register(logRequest);
fastify.register(authAccessToken);
fastify.register(authRefreshToken);
// OLD BOILERPLATE HOOKS (DISABLED)
// fastify.register(authApiKey);
// fastify.register(allowAdmin);
// fastify.register(isSameUserOrAdmin);

// Routes
fastify.register(privateRoutes, { prefix: `${regularRoutePath}/private` });
fastify.register(publicRoutes, { prefix: `${regularRoutePath}/public` });
fastify.register(functionsRoutes, { prefix: `${regularRoutePath}/functions` });

// Health check endpoint (no prefix, available at /health)
fastify.get("/health", async () => {
  return {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };
});

export default fastify;
