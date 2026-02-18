// OLD BOILERPLATE ROUTES (DISABLED)
// import userRoutes from "./user.js";
// import authRoutes from "./auth.js";
// import apiKeyRoutes from "./apikey.js";
import generatedRoutes from "../generated/index.js";
import adminRoutes from "./admin.js";
import cpvRoutes from "./cpv.js";
import aiDocumentRoutes from "./ai-document.js";
import type { FastifyInstance } from "fastify";

export default async (fastify: FastifyInstance): Promise<void> => {
  // OLD BOILERPLATE ROUTES (DISABLED)
  // fastify.register(userRoutes, { prefix: "/users" });
  // fastify.register(authRoutes, { prefix: "/auth" });
  // fastify.register(apiKeyRoutes, { prefix: "/apikeys" });

  // Auto-generated CRUD routes
  fastify.register(generatedRoutes);

  // Admin user management
  fastify.register(adminRoutes);

  // CPV code search and import
  fastify.register(cpvRoutes);

  // AI document operations
  fastify.register(aiDocumentRoutes);
};
