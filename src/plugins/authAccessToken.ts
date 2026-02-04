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
      const keyAccessToken =
        process.env["NODE_ENV"] === "production"
          ? "__Secure-access_token"
          : "access_token";
      // eslint-disable-next-line
      if (!request.cookies[keyAccessToken]) {
        throw new Errors.unauthorizedToken();
      }
      // eslint-disable-next-line security/detect-object-injection
      const accessToken = request.unsignCookie(request.cookies[keyAccessToken]);

      if (!accessToken.valid) {
        throw new Errors.unauthorizedToken();
      }

      try {
        const { sub, jti } = verifyAccessToken(accessToken.value);
        request.userId = sub;
        request.sessionId = jti;
      } catch {
        throw new Errors.unauthorizedToken();
      }
    },
  );
});

export default authAccessTokenPlugin;
