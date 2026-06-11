import type { FastifyPluginAsync } from "fastify";
import type { PrismaClient } from "@prisma/client";

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // List AiFunctionLogs with pagination and filters
  fastify.get(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["AiFunctionLog"],
        description: "Get all AI function logs with pagination and filters",
        querystring: {
          type: "object",
          properties: {
            page: { type: "integer", minimum: 1, default: 1 },
            limit: { type: "integer", minimum: 1, maximum: 100, default: 10 },
            search: { type: "string" },
            status: { type: "string" },
            from: { type: "string" },
            to: { type: "string" },
          },
        },
        response: {
          500: { type: "object", properties: { error: { type: "string" } } },
          200: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    functionCode: { type: "string" },
                    functionName: { type: "string", nullable: true },
                    providerName: { type: "string", nullable: true },
                    model: { type: "string" },
                    inputVariables: {
                      type: "object",
                      additionalProperties: true,
                      nullable: true,
                    },
                    systemPrompt: { type: "string", nullable: true },
                    userPrompt: { type: "string", nullable: true },
                    response: {
                      type: "object",
                      additionalProperties: true,
                      nullable: true,
                    },
                    tokensInput: { type: "integer", nullable: true },
                    tokensOutput: { type: "integer", nullable: true },
                    durationMs: { type: "integer", nullable: true },
                    status: { type: "string" },
                    errorMessage: { type: "string", nullable: true },
                    userId: { type: "string", nullable: true },
                    createdAt: { type: "string" },
                  },
                },
              },
              total: { type: "integer" },
              page: { type: "integer" },
              limit: { type: "integer" },
              totalPages: { type: "integer" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const {
          page = 1,
          limit = 10,
          search,
          status,
          from,
          to,
        } = request.query as {
          page?: number;
          limit?: number;
          search?: string;
          status?: string;
          from?: string;
          to?: string;
        };
        const skip = (page - 1) * limit;

        const where = {
          ...(search
            ? {
                OR: [
                  {
                    functionCode: {
                      contains: search,
                      mode: "insensitive" as const,
                    },
                  },
                  {
                    functionName: {
                      contains: search,
                      mode: "insensitive" as const,
                    },
                  },
                  { model: { contains: search, mode: "insensitive" as const } },
                ],
              }
            : {}),
          ...(status && status !== "all" ? { status } : {}),
          ...((from ?? to)
            ? {
                createdAt: {
                  ...(from ? { gte: new Date(from) } : {}),
                  ...(to ? { lte: new Date(to) } : {}),
                },
              }
            : {}),
        };

        const [data, total] = await Promise.all([
          prisma.aiFunctionLog.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
          }),
          prisma.aiFunctionLog.count({ where }),
        ]);

        const totalPages = Math.ceil(total / limit);

        return reply.status(200).send({ data, total, page, limit, totalPages });
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // Get single AiFunctionLog by ID
  fastify.get(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["AiFunctionLog"],
        description: "Get AI function log by ID",
        params: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
          },
          required: ["id"],
        },
        response: {
          500: { type: "object", properties: { error: { type: "string" } } },
          200: {
            type: "object",
            properties: {
              id: { type: "string" },
              functionCode: { type: "string" },
              functionName: { type: "string", nullable: true },
              providerName: { type: "string", nullable: true },
              model: { type: "string" },
              inputVariables: { type: "object", additionalProperties: true },
            },
          },
          404: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };

        const aiFunctionLog = await prisma.aiFunctionLog.findUnique({
          where: { id },
        });

        if (!aiFunctionLog) {
          return reply.status(404).send({ error: "AI function log not found" });
        }

        return reply.status(200).send(aiFunctionLog);
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // Create new AiFunctionLog
  fastify.post(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["AiFunctionLog"],
        description: "Create new AI function log",
        body: {
          type: "object",
          properties: {
            functionCode: { type: "string" },
            functionName: { type: "string", nullable: true },
            providerName: { type: "string", nullable: true },
            model: { type: "string" },
            inputVariables: { type: "object", default: {} },
          },
          required: ["functionCode", "model"],
        },
        response: {
          404: { type: "object", properties: { error: { type: "string" } } },
          500: { type: "object", properties: { error: { type: "string" } } },
          201: {
            type: "object",
            properties: {
              id: { type: "string" },
              functionCode: { type: "string" },
              functionName: { type: "string", nullable: true },
              providerName: { type: "string", nullable: true },
              model: { type: "string" },
              inputVariables: { type: "object", additionalProperties: true },
            },
          },
          400: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const {
          functionCode,
          functionName,
          providerName,
          model,
          inputVariables = {},
        } = request.body as {
          functionCode: string;
          functionName?: string | null;
          providerName?: string | null;
          model: string;
          inputVariables?: object;
        };

        const aiFunctionLog = await prisma.aiFunctionLog.create({
          data: {
            functionCode,
            model,
            inputVariables,
            ...(functionName !== undefined && { functionName }),
            ...(providerName !== undefined && { providerName }),
          },
        });

        return reply.status(201).send(aiFunctionLog);
      } catch (error) {
        return reply
          .status(400)
          .send({ error: "Failed to create AI function log" });
      }
    },
  );

  // Update AiFunctionLog by ID
  fastify.put(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["AiFunctionLog"],
        description: "Update AI function log by ID",
        params: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
          },
          required: ["id"],
        },
        body: {
          type: "object",
          properties: {
            functionCode: { type: "string" },
            functionName: { type: "string", nullable: true },
            providerName: { type: "string", nullable: true },
            model: { type: "string" },
            inputVariables: { type: "object" },
          },
        },
        response: {
          400: { type: "object", properties: { error: { type: "string" } } },
          500: { type: "object", properties: { error: { type: "string" } } },
          200: {
            type: "object",
            properties: {
              id: { type: "string" },
              functionCode: { type: "string" },
              functionName: { type: "string", nullable: true },
              providerName: { type: "string", nullable: true },
              model: { type: "string" },
              inputVariables: { type: "object", additionalProperties: true },
            },
          },
          404: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const updateData = request.body as {
          functionCode?: string;
          functionName?: string | null;
          providerName?: string | null;
          model?: string;
          inputVariables?: object;
        };

        const existingLog = await prisma.aiFunctionLog.findUnique({
          where: { id },
        });

        if (!existingLog) {
          return reply.status(404).send({ error: "AI function log not found" });
        }

        const aiFunctionLog = await prisma.aiFunctionLog.update({
          where: { id },
          data: updateData,
        });

        return reply.status(200).send(aiFunctionLog);
      } catch (error) {
        return reply
          .status(400)
          .send({ error: "Failed to update AI function log" });
      }
    },
  );

  // Delete AiFunctionLog by ID
  fastify.delete(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["AiFunctionLog"],
        description: "Delete AI function log by ID",
        params: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
          },
          required: ["id"],
        },
        response: {
          500: { type: "object", properties: { error: { type: "string" } } },
          200: {
            type: "object",
            properties: {
              message: { type: "string" },
            },
          },
          404: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };

        const existingLog = await prisma.aiFunctionLog.findUnique({
          where: { id },
        });

        if (!existingLog) {
          return reply.status(404).send({ error: "AI function log not found" });
        }

        await prisma.aiFunctionLog.delete({
          where: { id },
        });

        return reply
          .status(200)
          .send({ message: "AI function log deleted successfully" });
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );
};

export default routes;
