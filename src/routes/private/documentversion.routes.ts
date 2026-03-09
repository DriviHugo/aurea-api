import type { FastifyPluginAsync } from "fastify";
import type { PrismaClient } from "@prisma/client";

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // GET /document-versions - List with pagination
  fastify.get(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["DocumentVersion"],
        description: "Get paginated list of document versions",
        querystring: {
          type: "object",
          properties: {
            page: { type: "integer", minimum: 1, default: 1 },
            limit: { type: "integer", minimum: 1, maximum: 100, default: 10 },
            documentId: { type: "string", format: "uuid" },
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
                    documentId: { type: "string", format: "uuid" },
                    version: { type: "integer" },
                    contentSnapshot: { type: "object" },
                    sectionsSnapshot: { type: "object", nullable: true },
                    changeDescription: { type: "string", nullable: true },
                    userId: { type: "string", format: "uuid" },
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
        const { page = 1, limit = 10, documentId } = request.query as any;
        const skip = (page - 1) * limit;

        const where = documentId ? { documentId } : {};

        const [data, total] = await Promise.all([
          prisma.documentVersion.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
          }),
          prisma.documentVersion.count({ where }),
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

  // GET /document-versions/:id - Get by ID
  fastify.get(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["DocumentVersion"],
        description: "Get document version by ID",
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
              documentId: { type: "string", format: "uuid" },
              version: { type: "integer" },
              contentSnapshot: { type: "object" },
              sectionsSnapshot: { type: "object", nullable: true },
              changeDescription: { type: "string", nullable: true },
              userId: { type: "string", format: "uuid" },
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

        const documentVersion = await prisma.documentVersion.findUnique({
          where: { id },
        });

        if (!documentVersion) {
          return reply
            .status(404)
            .send({ error: "Document version not found" });
        }

        return reply.status(200).send(documentVersion);
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // POST /document-versions - Create
  fastify.post(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["DocumentVersion"],
        description: "Create new document version",
        body: {
          type: "object",
          required: ["documentId", "version", "contentSnapshot", "userId"],
          properties: {
            documentId: { type: "string", format: "uuid" },
            version: { type: "integer", minimum: 1 },
            contentSnapshot: { type: "object" },
            sectionsSnapshot: { type: "object", nullable: true },
            changeDescription: { type: "string", nullable: true },
            userId: { type: "string", format: "uuid" },
          },
        },
        response: {
          500: { type: "object", properties: { error: { type: "string" } } },
          201: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              documentId: { type: "string", format: "uuid" },
              version: { type: "integer" },
              contentSnapshot: { type: "object" },
              sectionsSnapshot: { type: "object", nullable: true },
              changeDescription: { type: "string", nullable: true },
              userId: { type: "string", format: "uuid" },
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

        const documentVersion = await prisma.documentVersion.create({
          data,
        });

        return reply.status(201).send(documentVersion);
      } catch (error: any) {
        if (error.code === "P2002") {
          return reply
            .status(400)
            .send({ error: "Version already exists for this document" });
        }
        if (error.code === "P2003") {
          return reply
            .status(400)
            .send({ error: "Referenced document or user does not exist" });
        }
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // PUT /document-versions/:id - Update
  fastify.put(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["DocumentVersion"],
        description: "Update document version by ID",
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
            contentSnapshot: { type: "object" },
            sectionsSnapshot: { type: "object", nullable: true },
            changeDescription: { type: "string", nullable: true },
          },
        },
        response: {
          500: { type: "object", properties: { error: { type: "string" } } },
          200: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              documentId: { type: "string", format: "uuid" },
              version: { type: "integer" },
              contentSnapshot: { type: "object" },
              sectionsSnapshot: { type: "object", nullable: true },
              changeDescription: { type: "string", nullable: true },
              userId: { type: "string", format: "uuid" },
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

        const existingVersion = await prisma.documentVersion.findUnique({
          where: { id },
        });

        if (!existingVersion) {
          return reply
            .status(404)
            .send({ error: "Document version not found" });
        }

        const documentVersion = await prisma.documentVersion.update({
          where: { id },
          data,
        });

        return reply.status(200).send(documentVersion);
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // DELETE /document-versions/:id - Delete
  fastify.delete(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["DocumentVersion"],
        description: "Delete document version by ID",
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

        const existingVersion = await prisma.documentVersion.findUnique({
          where: { id },
        });

        if (!existingVersion) {
          return reply
            .status(404)
            .send({ error: "Document version not found" });
        }

        await prisma.documentVersion.delete({
          where: { id },
        });

        return reply
          .status(200)
          .send({ message: "Document version deleted successfully" });
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );
};

export default routes;
