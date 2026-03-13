import type { FastifyPluginAsync } from "fastify";
import type { PrismaClient } from "@prisma/client";

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // GET /ai-function-versions - List with pagination
  fastify.get(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["AI Function Versions"],
        description: "Get paginated list of AI function versions",
        querystring: {
          type: "object",
          properties: {
            page: { type: "integer", minimum: 1, default: 1 },
            limit: { type: "integer", minimum: 1, maximum: 100, default: 10 },
            functionId: { type: "string", format: "uuid" },
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
                    id: { type: "string", format: "uuid" },
                    functionId: { type: "string", format: "uuid" },
                    version: { type: "integer" },
                    systemPrompt: { type: "string" },
                    userPromptTemplate: { type: "string", nullable: true },
                    toolSchema: { type: "object", nullable: true },
                    parametros: { type: "object", nullable: true },
                    model: { type: "string" },
                    providerId: {
                      type: "string",
                      nullable: true,
                      format: "uuid",
                    },
                    motivoCambio: { type: "string", nullable: true },
                    creadoPor: {
                      type: "string",
                      nullable: true,
                      format: "uuid",
                    },
                    createdAt: { type: "string", format: "date-time" },
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
        const { page = 1, limit = 10, functionId } = request.query as any;
        const skip = (page - 1) * limit;

        const where = functionId ? { functionId } : {};

        const [data, total] = await Promise.all([
          prisma.aiFunctionVersion.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
          }),
          prisma.aiFunctionVersion.count({ where }),
        ]);

        const totalPages = Math.ceil(total / limit);

        return reply.status(200).send({
          data,
          total,
          page,
          limit,
          totalPages,
        });
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // GET /ai-function-versions/:id - Get by ID
  fastify.get(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["AI Function Versions"],
        description: "Get AI function version by ID",
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", format: "uuid" },
          },
        },
        response: {
          500: { type: "object", properties: { error: { type: "string" } } },
          200: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              functionId: { type: "string", format: "uuid" },
              version: { type: "integer" },
              systemPrompt: { type: "string" },
              userPromptTemplate: { type: "string", nullable: true },
              toolSchema: { type: "object", nullable: true },
              parametros: { type: "object", nullable: true },
              model: { type: "string" },
              providerId: { type: "string", nullable: true, format: "uuid" },
              motivoCambio: { type: "string", nullable: true },
              creadoPor: { type: "string", nullable: true, format: "uuid" },
              createdAt: { type: "string", format: "date-time" },
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

        const aiFunctionVersion = await prisma.aiFunctionVersion.findUnique({
          where: { id },
        });

        if (!aiFunctionVersion) {
          return reply
            .status(404)
            .send({ error: "AI function version not found" });
        }

        return reply.status(200).send(aiFunctionVersion);
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // POST /ai-function-versions - Create new
  fastify.post(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["AI Function Versions"],
        description: "Create new AI function version",
        body: {
          type: "object",
          required: ["functionId", "version", "systemPrompt", "model"],
          properties: {
            functionId: { type: "string", format: "uuid" },
            version: { type: "integer", minimum: 1 },
            systemPrompt: { type: "string", minLength: 1 },
            userPromptTemplate: { type: "string", nullable: true },
            toolSchema: { type: "object", nullable: true },
            parametros: { type: "object", nullable: true },
            model: { type: "string", minLength: 1 },
            providerId: { type: "string", nullable: true, format: "uuid" },
            motivoCambio: { type: "string", nullable: true },
            creadoPor: { type: "string", nullable: true, format: "uuid" },
          },
        },
        response: {
          500: { type: "object", properties: { error: { type: "string" } } },
          201: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              functionId: { type: "string", format: "uuid" },
              version: { type: "integer" },
              systemPrompt: { type: "string" },
              userPromptTemplate: { type: "string", nullable: true },
              toolSchema: { type: "object", nullable: true },
              parametros: { type: "object", nullable: true },
              model: { type: "string" },
              providerId: { type: "string", nullable: true, format: "uuid" },
              motivoCambio: { type: "string", nullable: true },
              creadoPor: { type: "string", nullable: true, format: "uuid" },
              createdAt: { type: "string", format: "date-time" },
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
        const data = request.body as any;

        const aiFunctionVersion = await prisma.aiFunctionVersion.create({
          data,
        });

        return reply.status(201).send(aiFunctionVersion);
      } catch (error: any) {
        if (error.code === "P2002") {
          return reply
            .status(400)
            .send({ error: "Version already exists for this function" });
        }
        if (error.code === "P2003") {
          return reply
            .status(400)
            .send({ error: "Invalid foreign key reference" });
        }
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // PUT /ai-function-versions/:id - Update by ID
  fastify.put(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["AI Function Versions"],
        description: "Update AI function version by ID",
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", format: "uuid" },
          },
        },
        body: {
          type: "object",
          properties: {
            systemPrompt: { type: "string", minLength: 1 },
            userPromptTemplate: { type: "string", nullable: true },
            toolSchema: { type: "object", nullable: true },
            parametros: { type: "object", nullable: true },
            model: { type: "string", minLength: 1 },
            providerId: { type: "string", nullable: true, format: "uuid" },
            motivoCambio: { type: "string", nullable: true },
            creadoPor: { type: "string", nullable: true, format: "uuid" },
          },
        },
        response: {
          400: { type: "object", properties: { error: { type: "string" } } },
          500: { type: "object", properties: { error: { type: "string" } } },
          200: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              functionId: { type: "string", format: "uuid" },
              version: { type: "integer" },
              systemPrompt: { type: "string" },
              userPromptTemplate: { type: "string", nullable: true },
              toolSchema: { type: "object", nullable: true },
              parametros: { type: "object", nullable: true },
              model: { type: "string" },
              providerId: { type: "string", nullable: true, format: "uuid" },
              motivoCambio: { type: "string", nullable: true },
              creadoPor: { type: "string", nullable: true, format: "uuid" },
              createdAt: { type: "string", format: "date-time" },
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
        const data = request.body as any;

        const existingVersion = await prisma.aiFunctionVersion.findUnique({
          where: { id },
        });

        if (!existingVersion) {
          return reply
            .status(404)
            .send({ error: "AI function version not found" });
        }

        const updatedVersion = await prisma.aiFunctionVersion.update({
          where: { id },
          data,
        });

        return reply.status(200).send(updatedVersion);
      } catch (error: any) {
        if (error.code === "P2003") {
          return reply
            .status(400)
            .send({ error: "Invalid foreign key reference" });
        }
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // DELETE /ai-function-versions/:id - Delete by ID
  fastify.delete(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["AI Function Versions"],
        description: "Delete AI function version by ID",
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", format: "uuid" },
          },
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

        const existingVersion = await prisma.aiFunctionVersion.findUnique({
          where: { id },
        });

        if (!existingVersion) {
          return reply
            .status(404)
            .send({ error: "AI function version not found" });
        }

        await prisma.aiFunctionVersion.delete({
          where: { id },
        });

        return reply
          .status(200)
          .send({ message: "AI function version deleted successfully" });
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );
};

export default routes;
