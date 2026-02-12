import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import { verifyAccessToken } from "../utils/jwt.js";
import { Errors } from "../errors/appErrorFactory.js";

declare module "fastify" {
  interface FastifyRequest {
    userId: string;
    sessionId: string;
  }
  interface FastifyInstance {
    authAccessToken: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
  }
}

const authAccessTokenPlugin = fp(async (fastify: FastifyInstance) => {
  fastify.decorate(
    "authAccessToken",
    async (request: FastifyRequest, _reply: FastifyReply) => {
      let accessToken: string | null = null;

      // Try to get token from Authorization header (Bearer token)
      const authHeader = request.headers.authorization;
      console.log("[authAccessToken] Authorization header:", authHeader);
      if (authHeader?.startsWith("Bearer ")) {
        accessToken = authHeader.substring(7);
        console.log(
          "[authAccessToken] Token from header:",
          accessToken.substring(0, 20) + "...",
        );
      }

      // Fallback: try to get token from cookies (legacy)
      if (!accessToken) {
        const keyAccessToken =
          process.env["NODE_ENV"] === "production"
            ? "__Secure-access_token"
            : "access_token";
        // eslint-disable-next-line
        if (request.cookies[keyAccessToken]) {
          const cookieToken = request.unsignCookie(
            request.cookies[keyAccessToken],
          );
          if (cookieToken.valid) {
            accessToken = cookieToken.value;
          }
        }
      }

      // No token found in either header or cookie
      if (!accessToken) {
        console.log("[authAccessToken] No token found");
        throw new Errors.unauthorizedToken();
      }

      try {
        console.log("[authAccessToken] Verifying token...");
        const { sub, jti } = verifyAccessToken(accessToken);
        console.log(
          "[authAccessToken] Token verified successfully, userId:",
          sub,
        );
        request.userId = sub;
        request.sessionId = jti;
      } catch (error) {
        console.log("[authAccessToken] Token verification failed:", error);
        throw new Errors.unauthorizedToken();
      }
    },
  );
});

export default authAccessTokenPlugin;
