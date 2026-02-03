import fp from "fastify-plugin";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import prisma from "../config/prisma.js";
import requestIp from "request-ip";
import { validatePasswordHash } from "../utils/crypto.js";
import ipaddr from "ipaddr.js";
import { consumePublicLimiter } from "../services/ratelimiter.js";
import { Errors } from "../errors/appErrorFactory.js";
import { AppError } from "../errors/appError.js";

const DUMMY_PASSWORD_HASH =
  "$2b$10$CwTycUXWue0Thq9StjUM0uJ8rQpQ1rQ1rQ1rQ1rQ1rQ1rQ1rQ1rQ";

declare module "fastify" {
  interface FastifyRequest {
    apiKey?: Awaited<ReturnType<typeof prisma.apiKeyEntity.findFirst>>;
  }
  interface FastifyInstance {
    authApiKey: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

function extractDomain(origin?: string): string | undefined {
  if (!origin) return undefined;
  if (/^https?:\/\//i.test(origin)) {
    try {
      return new URL(origin).hostname;
    } catch {}
  }

  const withoutPort = origin.split(":")[0] ?? "";
  return withoutPort.split("/")[0];
}

function isIpAllowed(clientIp: string, allowedIps: string[]): boolean {
  if (!allowedIps.length) return true;
  try {
    const addr = ipaddr.parse(clientIp);
    return allowedIps.some((ipOrCidr) => {
      if (ipOrCidr.includes("/")) {
        const [range, prefixLength] = ipOrCidr.split("/");
        if (!range || !prefixLength) return false;
        if (!ipaddr.isValid(range)) return false;
        const subnet = ipaddr.parse(range);
        return addr.match(subnet, parseInt(prefixLength, 10));
      } else {
        // Single IP
        return addr.toString() === ipOrCidr;
      }
    });
  } catch {
    return false;
  }
}

const authApiKeyPlugin = fp(async (fastify: FastifyInstance) => {
  fastify.decorate(
    "authApiKey",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const authHeader = request.headers.authorization;
      const clientIp = requestIp.getClientIp(request);
      if (!clientIp) {
        throw new Errors.badRequest();
      }
      const origin = request.headers.origin ?? request.headers.host ?? "";
      const originDomain = extractDomain(origin);

      const limiterResult = await consumePublicLimiter(clientIp, reply);
      if (limiterResult.isLimited) {
        throw new Errors.tooManyRequests();
      }

      const [keyId, secret] = authHeader?.startsWith("API-KEY ")
        ? authHeader.replace("API-KEY ", "").trim().split(":")
        : [];

      if (keyId && secret) {
        const apiKey = await prisma.apiKeyEntity.findUnique({
          where: { keyId },
        });
        const match = await validatePasswordHash(
          secret,
          apiKey?.keyHash ?? DUMMY_PASSWORD_HASH,
        );

        if (match && apiKey) {
          // Check allowed IPs
          if (isIpAllowed(clientIp, apiKey.allowedIps)) {
            // Check allowed domains
            if (
              !apiKey.allowedDomains.length ||
              apiKey.allowedDomains.includes(origin) ||
              (originDomain && apiKey.allowedDomains.includes(originDomain))
            ) {
              request.apiKey = apiKey;
              prisma.apiKeyEntity
                .update({
                  where: { keyId: apiKey.keyId },
                  data: { lastUsedAt: new Date() },
                })
                .catch((error: unknown) => {
                  new AppError({
                    statusCode: 500,
                    message: "Failed to update apiKey lastUsedAt",
                    code: "APIKEY_LAST_USED_UPDATE_FAILED",
                    cause: error,
                    level: "warn",
                    request,
                  }).report();
                });
              return;
            }
          }

          throw new Errors.forbiddenPublic();
        }
      }

      throw new Errors.unauthorizedApiKey();
    },
  );
});

export default authApiKeyPlugin;
