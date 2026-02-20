import type { FastifyPluginAsync } from "fastify";
import type { PrismaClient } from "@prisma/client";

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // List DocumentoGeneracion with pagination
  fastify.get(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["DocumentoGeneracion"],
        description: "Get paginated list of DocumentoGeneracion",
        querystring: {
          type: "object",
          properties: {
            page: { type: "integer", minimum: 1, default: 1 },
            limit: { type: "integer", minimum: 1, maximum: 100, default: 10 },
            documentId: { type: "string", format: "uuid" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string", format: "uuid" },
                    documentId: { type: "string", format: "uuid" },
                    version: { type: "integer" },
                    plan: { type: "object" },
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
        const { page = 1, limit = 10, documentId } = request.query as any;
        const skip = (page - 1) * limit;

        const where = documentId ? { documentId } : {};

        const [data, total] = await Promise.all([
          prisma.documentGeneration.findMany({
            where,
            skip,
            take: limit,
            orderBy: { version: "desc" },
          }),
          prisma.documentGeneration.count({ where }),
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

  // Get DocumentoGeneracion by ID
  fastify.get(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["DocumentoGeneracion"],
        description: "Get DocumentoGeneracion by ID",
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", format: "uuid" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              documentId: { type: "string", format: "uuid" },
              version: { type: "integer" },
              plan: { type: "object" },
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

        const documentGeneration = await prisma.documentGeneration.findUnique({
          where: { id },
        });

        if (!documentGeneration) {
          return reply
            .status(404)
            .send({ error: "DocumentGeneration not found" });
        }

        return reply.status(200).send(documentGeneration);
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // Create DocumentoGeneracion
  fastify.post(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["DocumentoGeneracion"],
        description: "Create new DocumentoGeneracion",
        // No body validation - handle arrays and objects in handler
        response: {
          201: {
            type: "object",
            additionalProperties: true,
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
        // Handle both array and object body (Supabase compatibility)
        const rawBody = request.body as any;
        const body = Array.isArray(rawBody) ? rawBody[0] : rawBody;

        fastify.log.info(
          { rawBody, processedBody: body },
          "POST /document-generation - received data",
        );

        if (!body?.documentId || !body.userId) {
          return reply.status(400).send({
            error: "Missing required fields: documentId, userId",
          });
        }

        const documentGeneration = await prisma.documentGeneration.create({
          data: {
            documentId: body.documentId,
            userId: body.userId,
            version: body.version || 1,
            plan: body.plan || {},
            status: body.status || "planning",
            currentSection: body.currentSection || 0,
            totalSections: body.totalSections,
          },
        });

        fastify.log.info(
          { id: documentGeneration.id },
          "DocumentGeneration created",
        );
        return reply.status(201).send(documentGeneration);
      } catch (error) {
        fastify.log.error(
          { error, body: request.body },
          "POST /document-generation - error",
        );
        if (error.code === "P2002") {
          return reply
            .status(400)
            .send({ error: "DocumentGeneration already exists" });
        }
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // Update DocumentoGeneracion
  fastify.put(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["DocumentoGeneracion"],
        description: "Update DocumentoGeneracion by ID",
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
            documentId: { type: "string", format: "uuid" },
            version: { type: "integer", minimum: 1 },
            plan: { type: "object" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              documentId: { type: "string", format: "uuid" },
              version: { type: "integer" },
              plan: { type: "object" },
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
        const updateData = request.body as any;

        const existingDocumentGeneration =
          await prisma.documentGeneration.findUnique({
            where: { id },
          });

        if (!existingDocumentGeneration) {
          return reply
            .status(404)
            .send({ error: "DocumentGeneration not found" });
        }

        const documentGeneration = await prisma.documentGeneration.update({
          where: { id },
          data: updateData,
        });

        return reply.status(200).send(documentGeneration);
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // Delete DocumentoGeneracion
  fastify.delete(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["DocumentoGeneracion"],
        description: "Delete DocumentoGeneracion by ID",
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", format: "uuid" },
          },
        },
        response: {
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

        const existingDocumentGeneration =
          await prisma.documentGeneration.findUnique({
            where: { id },
          });

        if (!existingDocumentGeneration) {
          return reply
            .status(404)
            .send({ error: "DocumentGeneration not found" });
        }

        await prisma.documentGeneration.delete({
          where: { id },
        });

        return reply
          .status(200)
          .send({ message: "DocumentGeneration deleted successfully" });
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );
};

export default routes;
