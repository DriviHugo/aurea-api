import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import prisma from "../config/prisma.js";

const prismaPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate("prisma", prisma);
};

export default fp(prismaPlugin);
