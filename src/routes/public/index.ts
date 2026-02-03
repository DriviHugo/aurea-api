import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { basicResponseSchema } from "../../schema/common.js";

export default async (fastify: FastifyInstance): Promise<void> => {
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
};
