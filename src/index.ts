import blocked from "blocked";

import "./env.js";
import { validateCloudIsolation } from "./validators/cloudIsolation.js";

// Validate cloud isolation before loading other services
validateCloudIsolation();

import prisma from "./config/prisma.js";
import app from "./app.js";
import logger from "./config/logger.js";
import { AppError, type AppErrorDetails } from "./errors/appError.js";
import { createOIDCService } from "./services/oidc.service.js";

const appHost: string = process.env["APP_HOST"] ?? "localhost";
const appPort: number = Number(process.env["APP_PORT"]) || 3789;
const eventLoopBlockLog: boolean =
  Boolean(process.env["LOG_EVENT_LOOP"]) || false;

let isShuttingDown = false;

async function shutdown(): Promise<void> {
  logger.info("Shutdown: starting");

  const [appClose, prismaDisconnect] = await Promise.allSettled([
    app.close(),
    prisma.$disconnect(),
  ]);

  if (appClose.status === "rejected") {
    new AppError({
      statusCode: 500,
      message: "Error during Fastify server shutdown",
      code: "SERVER_SHUTDOWN_FAILED",
      cause: appClose.reason,
      level: "warn",
      details: { source: "fastify" },
    }).report();
  }

  if (prismaDisconnect.status === "rejected") {
    new AppError({
      statusCode: 500,
      message: "Error during Prisma client shutdown",
      code: "SERVER_SHUTDOWN_FAILED",
      cause: prismaDisconnect.reason,
      level: "warn",
      details: { source: "prisma" },
    }).report();
  }

  logger.info("Shutdown: finished");
}

function fatal(
  error: unknown,
  options: { code: string; message: string; details?: AppErrorDetails },
): void {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  new AppError({
    statusCode: 500,
    message: options.message,
    code: options.code,
    ...(options.details ? { details: options.details } : null),
    cause: error,
    level: "error",
  }).report();

  const forceExitTimer = setTimeout(() => {
    logger.info("Shutdown: forced exit after 5000ms timeout");
    process.exit(1);
  }, 5000);
  forceExitTimer.unref();

  void shutdown().finally(() => {
    process.exit(1);
  });
}

async function start(): Promise<void> {
  logger.info("Startup: starting");

  try {
    logger.info("Startup: connecting to database");
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    logger.info("Startup: database connected");
  } catch (error) {
    fatal(error, {
      code: "DATABASE_CONNECT_FAILED",
      message: "Startup: database connection failed",
      details: { source: "prisma" },
    });
    return;
  }

  // Initialize OIDC/SSO service (non-blocking if not configured)
  try {
    const oidcService = createOIDCService(prisma);
    await oidcService.initialize();
    if (oidcService.isConfigured()) {
      logger.info("Startup: OIDC/SSO service initialized (OpenAM ready)");
    } else {
      logger.info("Startup: OIDC not configured - using local auth only");
    }
  } catch (error) {
    // OIDC failure is non-fatal - local auth still works
    logger.warn({
      msg: "Startup: OIDC initialization failed - SSO disabled",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }

  try {
    const address = await app.listen({ host: appHost, port: appPort });
    logger.info(`Startup: server listening at ${address}/api`);
  } catch (error) {
    fatal(error, {
      code: "SERVER_LISTEN_FAILED",
      message: "Startup: server listen failed",
      details: { source: "fastify" },
    });
    return;
  }
}

if (eventLoopBlockLog) {
  blocked(
    (ms: number) => {
      new AppError({
        statusCode: 500,
        message: "Event loop blocked",
        code: "EVENT_LOOP_BLOCKED",
        level: "warn",
        details: {
          source: "node",
          meta: {
            ms,
            thresholdMs: 50,
            intervalMs: 1000,
          },
        },
      }).report();
    },
    { interval: 1000, threshold: 50 },
  );
}

void start();

process.on("unhandledRejection", (error) => {
  fatal(error, {
    code: "UNHANDLED_REJECTION",
    message: "Unhandled rejection",
    details: { source: "node" },
  });
});

process.on("uncaughtException", (error) => {
  fatal(error, {
    code: "UNCAUGHT_EXCEPTION",
    message: "Uncaught exception",
    details: { source: "node" },
  });
});
