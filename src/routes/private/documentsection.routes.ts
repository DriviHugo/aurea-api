import type { FastifyPluginAsync } from "fastify";
import type { PrismaClient } from "@prisma/client";

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // GET /document-sections - List with pagination
  fastify.get(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["DocumentSection"],
        description: "Get paginated list of document sections",
        querystring: {
          type: "object",
          properties: {
            page: { type: "integer", minimum: 1, default: 1 },
            limit: { type: "integer", minimum: 1, maximum: 100, default: 10 },
            documentId: { type: "string", format: "uuid" },
            status: { type: "string" },
          },
        },
        response: {
          400: { type: "object", properties: { error: { type: "string" } } },
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
                    documentId: { type: "string" },
                    order: { type: "integer" },
                    title: { type: "string" },
                    description: { type: "string", nullable: true },
                    content: { type: "string", nullable: true },
                    status: { type: "string" },
                    tokensUsed: { type: "integer", nullable: true },
                    generationTimeMs: { type: "integer", nullable: true },
                    aiProvider: { type: "string", nullable: true },
                    aiModel: { type: "string", nullable: true },
                    lcspArticles: { type: "array", items: { type: "string" } },
                    createdAt: { type: "string", format: "date-time" },
                    updatedAt: { type: "string", format: "date-time" },
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
          documentId,
          status,
        } = request.query as any;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (documentId) where.documentId = documentId;
        if (status) where.status = status;

        const [data, total] = await Promise.all([
          prisma.documentSection.findMany({
            where,
            skip,
            take: limit,
            orderBy: [{ documentId: "asc" }, { order: "asc" }],
          }),
          prisma.documentSection.count({ where }),
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

  // GET /document-sections/:id - Get by ID
  fastify.get(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["DocumentSection"],
        description: "Get document section by ID",
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", format: "uuid" },
          },
        },
        response: {
          400: { type: "object", properties: { error: { type: "string" } } },
          500: { type: "object", properties: { error: { type: "string" } } },
          200: {
            type: "object",
            properties: {
              id: { type: "string" },
              documentId: { type: "string" },
              order: { type: "integer" },
              title: { type: "string" },
              description: { type: "string", nullable: true },
              content: { type: "string", nullable: true },
              status: { type: "string" },
              tokensUsed: { type: "integer", nullable: true },
              generationTimeMs: { type: "integer", nullable: true },
              aiProvider: { type: "string", nullable: true },
              aiModel: { type: "string", nullable: true },
              lcspArticles: { type: "array", items: { type: "string" } },
              createdAt: { type: "string", format: "date-time" },
              updatedAt: { type: "string", format: "date-time" },
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

        const documentSection = await prisma.documentSection.findUnique({
          where: { id },
        });

        if (!documentSection) {
          return reply.status(404).send({ error: "DocumentSection not found" });
        }

        return reply.status(200).send(documentSection);
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // POST /document-sections - Create (handles array for batch insert)
  fastify.post(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["DocumentSection"],
        description: "Create new document section(s)",
        // No body validation - handle arrays in handler
        response: {
          404: { type: "object", properties: { error: { type: "string" } } },
          500: { type: "object", properties: { error: { type: "string" } } },
          201: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: true,
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
        const rawBody = request.body as any;

        // Handle both array and single object
        const items = Array.isArray(rawBody) ? rawBody : [rawBody];

        fastify.log.info(
          { count: items.length, firstItem: items[0] },
          "POST /document-sections - creating sections",
        );

        const created = [];
        for (const data of items) {
          const documentSection = await prisma.documentSection.create({
            data: {
              documentId: data.documentId,
              order: data.order,
              title: data.title,
              description: data.description,
              content: data.content,
              status: data.status || "pending",
              tokensUsed: data.tokensUsed,
              generationTimeMs: data.generationTimeMs,
              lcspArticles: data.lcspArticles || [],
            },
          });
          created.push(documentSection);
        }

        fastify.log.info({ count: created.length }, "DocumentSections created");
        return reply.status(201).send(created);
      } catch (error: any) {
        fastify.log.error({ error }, "POST /documento-seccion - error");
        if (error.code === "P2002") {
          return reply.status(400).send({
            error:
              "DocumentSection with this document and order already exists",
          });
        }
        if (error.code === "P2003") {
          return reply
            .status(400)
            .send({ error: "Referenced document does not exist" });
        }
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // PUT /document-sections/:id - Update
  fastify.put(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["DocumentSection"],
        description: "Update document section by ID",
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
            order: { type: "integer", minimum: 1 },
            title: { type: "string", minLength: 1 },
            description: { type: "string" },
            content: { type: "string" },
            status: { type: "string" },
            tokensUsed: { type: "integer", minimum: 0 },
            generationTimeMs: { type: "integer", minimum: 0 },
            aiProvider: { type: "string" },
            aiModel: { type: "string" },
            lcspArticles: { type: "array", items: { type: "string" } },
          },
        },
        response: {
          400: { type: "object", properties: { error: { type: "string" } } },
          500: { type: "object", properties: { error: { type: "string" } } },
          200: {
            type: "object",
            properties: {
              id: { type: "string" },
              documentId: { type: "string" },
              order: { type: "integer" },
              title: { type: "string" },
              description: { type: "string", nullable: true },
              content: { type: "string", nullable: true },
              status: { type: "string" },
              tokensUsed: { type: "integer", nullable: true },
              generationTimeMs: { type: "integer", nullable: true },
              aiProvider: { type: "string", nullable: true },
              aiModel: { type: "string", nullable: true },
              lcspArticles: { type: "array", items: { type: "string" } },
              createdAt: { type: "string", format: "date-time" },
              updatedAt: { type: "string", format: "date-time" },
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

        fastify.log.info({
          msg: "PUT document-section received",
          id,
          dataKeys: Object.keys(data),
          hasAiProvider: !!data.aiProvider,
          aiProvider: data.aiProvider,
          aiModel: data.aiModel,
        });

        const existingDocumentSection = await prisma.documentSection.findUnique(
          {
            where: { id },
          },
        );

        if (!existingDocumentSection) {
          return reply.status(404).send({ error: "DocumentSection not found" });
        }

        const updateData: any = {};
        if (data.order !== undefined) updateData.order = data.order;
        if (data.title !== undefined) updateData.title = data.title;
        if (data.description !== undefined)
          updateData.description = data.description;
        if (data.content !== undefined) updateData.content = data.content;
        if (data.status !== undefined) updateData.status = data.status;
        if (data.tokensUsed !== undefined)
          updateData.tokensUsed = data.tokensUsed;
        if (data.generationTimeMs !== undefined)
          updateData.generationTimeMs = data.generationTimeMs;
        if (data.aiProvider !== undefined)
          updateData.aiProvider = data.aiProvider;
        if (data.aiModel !== undefined) updateData.aiModel = data.aiModel;
        if (data.lcspArticles !== undefined)
          updateData.lcspArticles = data.lcspArticles;

        fastify.log.info({
          msg: "About to update DocumentSection",
          updateData,
        });

        const documentSection = await prisma.documentSection.update({
          where: { id },
          data: updateData,
        });

        return reply.status(200).send(documentSection);
      } catch (error: any) {
        fastify.log.error({
          msg: "DocumentSection update error",
          error: error.message,
          code: error.code,
          stack: error.stack,
        });
        if (error.code === "P2002") {
          return reply.status(400).send({
            error:
              "DocumentSection with this document and order already exists",
          });
        }
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // DELETE /document-sections/:id - Delete
  fastify.delete(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["DocumentSection"],
        description: "Delete document section by ID",
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", format: "uuid" },
          },
        },
        response: {
          400: { type: "object", properties: { error: { type: "string" } } },
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

        const existingDocumentSection = await prisma.documentSection.findUnique(
          {
            where: { id },
          },
        );

        if (!existingDocumentSection) {
          return reply.status(404).send({ error: "DocumentSection not found" });
        }

        await prisma.documentSection.delete({
          where: { id },
        });

        return reply
          .status(200)
          .send({ message: "DocumentSection deleted successfully" });
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );
};

export default routes;
