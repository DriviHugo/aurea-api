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

      const authHeader = request.headers.authorization;
      if (authHeader?.startsWith("Bearer ") === true) {
        accessToken = authHeader.substring(7);
      }

      if (accessToken === null) {
        const keyAccessToken =
          process.env["NODE_ENV"] === "production"
            ? "__Secure-access_token"
            : "access_token";
        // eslint-disable-next-line security/detect-object-injection
        const cookieValue = request.cookies[keyAccessToken];
        if (cookieValue !== undefined && cookieValue !== "") {
          const cookieToken = request.unsignCookie(cookieValue);
          if (cookieToken.valid === true) {
            accessToken = cookieToken.value;
          }
        }
      }

      if (accessToken === null) {
        throw new Errors.unauthorizedToken();
      }

      try {
        const { sub, jti } = verifyAccessToken(accessToken);
        request.userId = sub;
        request.sessionId = jti;
      } catch {
        throw new Errors.unauthorizedToken();
      }
    },
  );
});

export default authAccessTokenPlugin;
