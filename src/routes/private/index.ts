import userRoutes from "./user.js";
import authRoutes from "./auth.js";
import apiKeyRoutes from "./apikey.js";
import type { FastifyInstance } from "fastify";

export default async (fastify: FastifyInstance): Promise<void> => {
  fastify.register(userRoutes, { prefix: "/users" });
  fastify.register(authRoutes, { prefix: "/auth" });
  fastify.register(apiKeyRoutes, { prefix: "/apikeys" });
};
