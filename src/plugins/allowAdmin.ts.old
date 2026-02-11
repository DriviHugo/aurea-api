import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import prisma from "../config/prisma.js";
import type { UserEntity } from "@prisma/client";
import { Errors } from "../errors/appErrorFactory.js";

declare module "fastify" {
  interface FastifyRequest {
    userAdmin?: UserEntity;
  }
  interface FastifyInstance {
    allowAdmin: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

const allowAdminPlugin = fp(async (fastify: FastifyInstance) => {
  fastify.decorate(
    "allowAdmin",
    async (request: FastifyRequest, _reply: FastifyReply) => {
      try {
        const authorizedUser = await prisma.userEntity.findUnique({
          where: { id: request.userId, isAdmin: true, isActive: true },
        });
        if (!authorizedUser) {
          throw new Errors.forbidden();
        }

        request.userAdmin = authorizedUser;
      } catch (error) {
        if (
          error &&
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

export default allowAdminPlugin;
