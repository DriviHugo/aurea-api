import type { FastifyPluginAsync } from "fastify";
import type { PrismaClient } from "@prisma/client";

const aiProviderSchema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    name: { type: "string" },
    type: { type: "string", enum: ["openai", "anthropic", "google", "custom"] },
    baseUrl: { type: "string", format: "uri" },
    apiKeySecretName: { type: "string", nullable: true },
    availableModels: { type: "array", items: { type: "string" } },
    defaultParams: { type: "object" },
  },
};

const createAiProviderSchema = {
  type: "object",
  required: ["name", "baseUrl", "availableModels"],
  properties: {
    name: { type: "string", minLength: 1 },
    type: { type: "string", enum: ["openai", "anthropic", "google", "custom"] },
    baseUrl: { type: "string", format: "uri" },
    apiKeySecretName: { type: "string" },
    availableModels: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
    },
    defaultParams: { type: "object" },
  },
};

const updateAiProviderSchema = {
  type: "object",
  properties: {
    name: { type: "string", minLength: 1 },
    type: { type: "string", enum: ["openai", "anthropic", "google", "custom"] },
    baseUrl: { type: "string", format: "uri" },
    apiKeySecretName: { type: "string" },
    availableModels: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
    },
    defaultParams: { type: "object" },
  },
};

const paginationSchema = {
  type: "object",
  properties: {
    page: { type: "integer", minimum: 1, default: 1 },
    limit: { type: "integer", minimum: 1, maximum: 100, default: 10 },
  },
};

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // GET /ai-providers - List all AI providers with pagination
  fastify.get(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["AI Providers"],
        description: "Get all AI providers with pagination",
        querystring: paginationSchema,
        response: {
          404: { type: "object", properties: { error: { type: "string" } } },
          500: { type: "object", properties: { error: { type: "string" } } },
          200: {
            type: "object",
            properties: {
              data: { type: "array", items: aiProviderSchema },
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
        const { page = 1, limit = 10 } = request.query as {
          page?: number;
          limit?: number;
        };
        const skip = (page - 1) * limit;

        const [aiProviders, total] = await Promise.all([
          prisma.aiProvider.findMany({
            skip,
            take: limit,
            orderBy: { name: "asc" },
          }),
          prisma.aiProvider.count(),
        ]);

        const totalPages = Math.ceil(total / limit);

        return reply.status(200).send({
          data: aiProviders,
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

  // GET /ai-providers/:id - Get AI provider by ID
  fastify.get(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["AI Providers"],
        description: "Get AI provider by ID",
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", format: "uuid" },
          },
        },
        response: {
          500: { type: "object", properties: { error: { type: "string" } } },
          200: aiProviderSchema,
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

        const aiProvider = await prisma.aiProvider.findUnique({
          where: { id },
        });

        if (!aiProvider) {
          return reply.status(404).send({ error: "AI Provider not found" });
        }

        return reply.status(200).send(aiProvider);
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // POST /ai-providers - Create new AI provider
  fastify.post(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["AI Providers"],
        description: "Create new AI provider",
        body: createAiProviderSchema,
        response: {
          404: { type: "object", properties: { error: { type: "string" } } },
          500: { type: "object", properties: { error: { type: "string" } } },
          201: aiProviderSchema,
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
        const data = request.body as {
          name: string;
          type?: "openai" | "anthropic" | "google" | "custom";
          baseUrl: string;
          apiKeySecretName?: string;
          availableModels: string[];
          defaultParams?: any;
        };

        const aiProvider = await prisma.aiProvider.create({
          data: {
            name: data.name,
            type: (data.type || "custom") as any,
            baseUrl: data.baseUrl,
            availableModels: data.availableModels,
            defaultParams: data.defaultParams || { temperature: 0.3 },
            ...(data.apiKeySecretName !== undefined && {
              apiKeySecretName: data.apiKeySecretName,
            }),
          },
        });

        return reply.status(201).send(aiProvider);
      } catch (error: any) {
        if (error.code === "P2002") {
          return reply
            .status(400)
            .send({ error: "AI Provider name already exists" });
        }
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // PUT /ai-providers/:id - Update AI provider
  fastify.put(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["AI Providers"],
        description: "Update AI provider",
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", format: "uuid" },
          },
        },
        body: updateAiProviderSchema,
        response: {
          500: { type: "object", properties: { error: { type: "string" } } },
          200: aiProviderSchema,
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
        const data = request.body as {
          name?: string;
          type?: "openai" | "anthropic" | "google" | "custom";
          baseUrl?: string;
          apiKeySecretName?: string;
          availableModels?: string[];
          defaultParams?: any;
        };

        const existingAiProvider = await prisma.aiProvider.findUnique({
          where: { id },
        });

        if (!existingAiProvider) {
          return reply.status(404).send({ error: "AI Provider not found" });
        }

        const aiProvider = await prisma.aiProvider.update({
          where: { id },
          data: data as any,
        });

        return reply.status(200).send(aiProvider);
      } catch (error: any) {
        if (error.code === "P2002") {
          return reply
            .status(400)
            .send({ error: "AI Provider name already exists" });
        }
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // DELETE /ai-providers/:id - Delete AI provider
  fastify.delete(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["AI Providers"],
        description: "Delete AI provider",
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

        const existingAiProvider = await prisma.aiProvider.findUnique({
          where: { id },
        });

        if (!existingAiProvider) {
          return reply.status(404).send({ error: "AI Provider not found" });
        }

        await prisma.aiProvider.delete({
          where: { id },
        });

        return reply
          .status(200)
          .send({ message: "AI Provider deleted successfully" });
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );
};

export default routes;
