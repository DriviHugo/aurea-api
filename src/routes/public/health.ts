import { type FastifyInstance } from "fastify";

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    handler: async () => {
      return {
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      };
    },
    method: "GET",
    url: "/health",
    schema: {
      summary: "Health check",
      description: "Check if the API is running",
      tags: ["System"],
      response: {
        200: {
          type: "object",
          properties: {
            status: { type: "string" },
            timestamp: { type: "string" },
            uptime: { type: "number" },
          },
        },
      },
    },
  });
}
