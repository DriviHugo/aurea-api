import fp from "fastify-plugin";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

// TO-DO
// Check allowed domains to prevent header injection attacks

declare module "fastify" {
  interface FastifyRequest {
    originRequestId?: string;
  }
}

const DEFAULT_ORIGIN_REQUEST_ID_HEADER = "x-origin-request-id";

function getHeaderName(): string {
  const raw = (process.env["LOG_ORIGIN_REQUEST_ID_HEADER"] ?? "")
    .toLowerCase()
    .trim();

  if (raw.length === 0) {
    return DEFAULT_ORIGIN_REQUEST_ID_HEADER;
  }

  if (!/^[a-z0-9-]+$/.test(raw)) {
    return DEFAULT_ORIGIN_REQUEST_ID_HEADER;
  }

  return raw;
}

function getHeaderValue(
  headers: FastifyRequest["headers"],
  headerName: string,
): unknown {
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === headerName) {
      return value;
    }
  }

  return undefined;
}

function headerValueToString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }

  if (Array.isArray(value) && typeof value[0] === "string") {
    const first = value[0].trim();
    return first.length > 0 ? first : undefined;
  }

  return undefined;
}

export default fp(async (fastify: FastifyInstance) => {
  fastify.decorateRequest("originRequestId", undefined);

  fastify.addHook(
    "onRequest",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const headerName = getHeaderName();
      const headerValue = getHeaderValue(request.headers, headerName);
      const originRequestId = headerValueToString(headerValue);

      if (originRequestId !== undefined) {
        request.originRequestId = originRequestId;
        reply.header(headerName, originRequestId);
      } else {
        reply.header(headerName, request.id);
      }
    },
  );
});
