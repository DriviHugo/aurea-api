import type { FastifyInstance } from "fastify";
import authRoutes from "./auth-simple.js";
import ssoRoutes from "./sso.routes.js";

export default async (fastify: FastifyInstance): Promise<void> => {
  // Rutas de autenticación local (email/password)
  await fastify.register(authRoutes, { prefix: "/auth" });

  // Rutas SSO (OpenAM/OIDC)
  await fastify.register(ssoRoutes, { prefix: "/sso" });

  // OLD BOILERPLATE ROUTE (DISABLED - uses authApiKey which is disabled)
  /*
  fastify.route({
    method: "GET",
    url: "/example",
    onRequest: [fastify.authApiKey],
    schema: {
      summary: "Example route with API Key Authentication",
      description: "Example public route with API key authentication",
      tags: ["public"],
      security: [
        {
          apiKeyAuth: [],
        },
      ],
      response: {
        200: basicResponseSchema,
      },
    },
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      return { message: "This is a public route." };
    },
  });
  */
};
