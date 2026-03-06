import type { FastifyPluginAsync } from "fastify";
import type { PrismaClient } from "@prisma/client";

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // List AI Functions with pagination
  fastify.get(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["AI Functions"],
        description: "Get paginated list of AI functions",
        querystring: {
          type: "object",
          properties: {
            page: { type: "integer", minimum: 1, default: 1 },
            limit: { type: "integer", minimum: 1, maximum: 100, default: 10 },
            category: { type: "string" },
            providerId: { type: "string", format: "uuid" },
          },
        },
        response: {
          404: { type: "object", properties: { error: { type: "string" } } },
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
                    code: { type: "string" },
                    name: { type: "string" },
                    description: { type: "string", nullable: true },
                    category: { type: "string" },
                    providerId: { type: "string", nullable: true },
                    model: { type: "string" },
                    systemPrompt: { type: "string" },
                    userPromptTemplate: { type: "string", nullable: true },
                    toolSchema: { type: "object", nullable: true },
                    params: { type: "object", nullable: true },
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
          category,
          providerId,
        } = request.query as any;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (category) where.category = category;
        if (providerId) where.providerId = providerId;

        const [data, total] = await Promise.all([
          prisma.aiFunction.findMany({
            where,
            skip,
            take: limit,
            orderBy: { name: "asc" },
          }),
          prisma.aiFunction.count({ where }),
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

  // Get AI Function by ID
  fastify.get(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["AI Functions"],
        description: "Get AI function by ID",
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
              id: { type: "string" },
              code: { type: "string" },
              name: { type: "string" },
              description: { type: "string", nullable: true },
              category: { type: "string" },
              providerId: { type: "string", nullable: true },
              model: { type: "string" },
              systemPrompt: { type: "string" },
              userPromptTemplate: { type: "string", nullable: true },
              toolSchema: { type: "object", nullable: true },
              params: { type: "object", nullable: true },
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

        const aiFunction = await prisma.aiFunction.findUnique({
          where: { id },
        });

        if (!aiFunction) {
          return reply.status(404).send({ error: "AI Function not found" });
        }

        return reply.status(200).send(aiFunction);
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // Create AI Function
  fastify.post(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["AI Functions"],
        description: "Create new AI function",
        body: {
          type: "object",
          required: ["code", "name", "category", "model", "systemPrompt"],
          properties: {
            code: { type: "string", minLength: 1 },
            name: { type: "string", minLength: 1 },
            description: { type: "string" },
            category: { type: "string", minLength: 1 },
            providerId: { type: "string", format: "uuid" },
            model: { type: "string", minLength: 1 },
            systemPrompt: { type: "string", minLength: 1 },
            userPromptTemplate: { type: "string" },
            toolSchema: { type: "object", nullable: true },
            params: { type: "object", default: { temperature: 0.3 } },
          },
        },
        response: {
          404: { type: "object", properties: { error: { type: "string" } } },
          500: { type: "object", properties: { error: { type: "string" } } },
          201: {
            type: "object",
            properties: {
              id: { type: "string" },
              code: { type: "string" },
              name: { type: "string" },
              description: { type: "string", nullable: true },
              category: { type: "string" },
              providerId: { type: "string", nullable: true },
              model: { type: "string" },
              systemPrompt: { type: "string" },
              userPromptTemplate: { type: "string", nullable: true },
              toolSchema: { type: "object", nullable: true },
              params: { type: "object", nullable: true },
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

        const aiFunction = await prisma.aiFunction.create({
          data: {
            ...data,
            params: data.params || { temperature: 0.3 },
          },
        });

        return reply.status(201).send(aiFunction);
      } catch (error: any) {
        if (error.code === "P2002") {
          return reply
            .status(400)
            .send({ error: "AI Function code already exists" });
        }
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // Update AI Function
  fastify.put(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["AI Functions"],
        description: "Update AI function by ID",
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
            code: { type: "string", minLength: 1 },
            name: { type: "string", minLength: 1 },
            description: { type: "string" },
            category: { type: "string", minLength: 1 },
            providerId: { type: "string", format: "uuid" },
            model: { type: "string", minLength: 1 },
            systemPrompt: { type: "string", minLength: 1 },
            userPromptTemplate: { type: "string" },
            toolSchema: { type: "object", nullable: true },
            params: { type: "object" },
          },
        },
        response: {
          500: { type: "object", properties: { error: { type: "string" } } },
          200: {
            type: "object",
            properties: {
              id: { type: "string" },
              code: { type: "string" },
              name: { type: "string" },
              description: { type: "string", nullable: true },
              category: { type: "string" },
              providerId: { type: "string", nullable: true },
              model: { type: "string" },
              systemPrompt: { type: "string" },
              userPromptTemplate: { type: "string", nullable: true },
              toolSchema: { type: "object", nullable: true },
              params: { type: "object", nullable: true },
            },
          },
          404: {
            type: "object",
            properties: {
              error: { type: "string" },
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
        const { id } = request.params as { id: string };
        const data = request.body as any;

        const existingFunction = await prisma.aiFunction.findUnique({
          where: { id },
        });

        if (!existingFunction) {
          return reply.status(404).send({ error: "AI Function not found" });
        }

        const aiFunction = await prisma.aiFunction.update({
          where: { id },
          data,
        });

        return reply.status(200).send(aiFunction);
      } catch (error: any) {
        if (error.code === "P2002") {
          return reply
            .status(400)
            .send({ error: "AI Function code already exists" });
        }
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // Delete AI Function
  fastify.delete(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["AI Functions"],
        description: "Delete AI function by ID",
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

        const existingFunction = await prisma.aiFunction.findUnique({
          where: { id },
        });

        if (!existingFunction) {
          return reply.status(404).send({ error: "AI Function not found" });
        }

        await prisma.aiFunction.delete({
          where: { id },
        });

        return reply
          .status(200)
          .send({ message: "AI Function deleted successfully" });
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );
};

export default routes;
