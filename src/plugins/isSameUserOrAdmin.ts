import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import prisma from "../config/prisma.js";
import { type UserEntity } from "@prisma/client";
import { Errors } from "../errors/appErrorFactory.js";

declare module "fastify" {
  interface FastifyRequest {
    authorizedUser?: UserEntity;
  }
  interface FastifyInstance {
    isSameUserOrAdmin: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
  }
}

const isSameUserOrAdminPlugin = fp(async (fastify: FastifyInstance) => {
  fastify.decorate(
    "isSameUserOrAdmin",
    async (request: FastifyRequest, _reply: FastifyReply) => {
      try {
        const authorizedUser = await prisma.userEntity.findUnique({
          where: { id: request.userId, isActive: true },
        });
        if (!authorizedUser) {
          throw new Errors.forbidden();
        }
        // @ts-ignore
        const userId = request.params.id;
        if (!authorizedUser.isAdmin && userId !== authorizedUser.id) {
          throw new Errors.forbidden();
        }
        request.authorizedUser = authorizedUser;
      } catch (error: unknown) {
        if (
          error != null &&
          typeof error === "object" &&
          typeof (error as { statusCode?: unknown }).statusCode === "number"
        ) {
          throw error;
        }
        throw new Errors.internal({ cause: error });
      }
    },
  );
});

export default isSameUserOrAdminPlugin;
