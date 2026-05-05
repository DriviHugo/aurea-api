import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import { verifyRefreshToken } from "../utils/jwt.js";
import { Errors } from "../errors/appErrorFactory.js";

declare module "fastify" {
  interface FastifyRequest {
    refreshOpaqueToken: string;
    refreshUserId: string;
  }
  interface FastifyInstance {
    authRefreshToken: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
  }
}

const authRefreshTokenPlugin = fp(async (fastify: FastifyInstance) => {
  fastify.decorate(
    "authRefreshToken",
    async (request: FastifyRequest, _reply: FastifyReply) => {
      const keyRefreshToken =
        process.env["NODE_ENV"] === "production"
          ? "__Secure-refresh_token"
          : "refresh_token";
      // eslint-disable-next-line
      if (!request.cookies[keyRefreshToken]) {
        throw new Errors.unauthorizedToken();
      }

      const refreshToken = request.unsignCookie(
        // eslint-disable-next-line security/detect-object-injection
        request.cookies[keyRefreshToken],
      );

      if (!refreshToken.valid) {
        throw new Errors.unauthorizedToken();
      }

      try {
        const { jti, sub } = verifyRefreshToken(refreshToken.value);
        request.refreshOpaqueToken = jti;
        request.refreshUserId = sub;

        const profile = await fastify.prisma.profile.findUnique({
          where: { id: sub },
          select: { active: true },
        });

        if (!profile?.active) {
          throw new Errors.unauthorizedToken();
        }
      } catch {
        throw new Errors.unauthorizedToken();
      }
    },
  );
});

export default authRefreshTokenPlugin;
