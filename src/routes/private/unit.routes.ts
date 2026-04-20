import type { FastifyPluginAsync } from "fastify";
import type { PrismaClient } from "@prisma/client";

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // GET /units - List all units
  fastify.get(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Unit"],
        description: "Get list of organizational units",
        response: {
          200: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                    createdAt: { type: "string", format: "date-time" },
                    updatedAt: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
          500: { type: "object", properties: { error: { type: "string" } } },
        },
      },
    },
    async (_request, reply) => {
      try {
        const units = await prisma.unit.findMany({
          orderBy: { name: "asc" },
        });
        return reply.status(200).send({ data: units });
      } catch {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // POST /units - Create unit
  fastify.post(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Unit"],
        description: "Create new organizational unit",
        body: {
          type: "object",
          required: ["name"],
          properties: {
            name: { type: "string", minLength: 1 },
          },
        },
        response: {
          201: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              createdAt: { type: "string", format: "date-time" },
              updatedAt: { type: "string", format: "date-time" },
            },
          },
          400: { type: "object", properties: { error: { type: "string" } } },
          500: { type: "object", properties: { error: { type: "string" } } },
        },
      },
    },
    async (request, reply) => {
      try {
        const { name } = request.body as { name: string };
        const trimmedName = name.trim();
        if (!trimmedName) {
          return reply.status(400).send({ error: "Unit name is required" });
        }

        const unit = await prisma.unit.create({
          data: { name: trimmedName },
        });

        return reply.status(201).send(unit);
      } catch (error: any) {
        if (error?.code === "P2002") {
          return reply.status(400).send({ error: "Unit already exists" });
        }
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );
};

export default routes;
