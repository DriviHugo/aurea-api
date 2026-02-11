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
            documentoId: { type: "string", format: "uuid" },
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
                    documentoId: { type: "string", format: "uuid" },
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
        const { page = 1, limit = 10, documentoId } = request.query as any;
        const skip = (page - 1) * limit;

        const where = documentoId ? { documentoId } : {};

        const [data, total] = await Promise.all([
          prisma.documentoGeneracion.findMany({
            where,
            skip,
            take: limit,
            orderBy: { version: "desc" },
          }),
          prisma.documentoGeneracion.count({ where }),
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
              documentoId: { type: "string", format: "uuid" },
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

        const documentoGeneracion = await prisma.documentoGeneracion.findUnique(
          {
            where: { id },
          },
        );

        if (!documentoGeneracion) {
          return reply
            .status(404)
            .send({ error: "DocumentoGeneracion not found" });
        }

        return reply.status(200).send(documentoGeneracion);
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
        body: {
          type: "object",
          required: ["documentoId"],
          properties: {
            documentoId: { type: "string", format: "uuid" },
            version: { type: "integer", minimum: 1 },
            plan: { type: "object" },
          },
        },
        response: {
          201: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              documentoId: { type: "string", format: "uuid" },
              version: { type: "integer" },
              plan: { type: "object" },
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
        const { documentoId, version = 1, plan = {} } = request.body as any;

        const documentoGeneracion = await prisma.documentoGeneracion.create({
          data: {
            documentoId,
            version,
            plan,
          },
        });

        return reply.status(201).send(documentoGeneracion);
      } catch (error) {
        if (error.code === "P2002") {
          return reply
            .status(400)
            .send({ error: "DocumentoGeneracion already exists" });
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
            documentoId: { type: "string", format: "uuid" },
            version: { type: "integer", minimum: 1 },
            plan: { type: "object" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              documentoId: { type: "string", format: "uuid" },
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

        const existingDocumentoGeneracion =
          await prisma.documentoGeneracion.findUnique({
            where: { id },
          });

        if (!existingDocumentoGeneracion) {
          return reply
            .status(404)
            .send({ error: "DocumentoGeneracion not found" });
        }

        const documentoGeneracion = await prisma.documentoGeneracion.update({
          where: { id },
          data: updateData,
        });

        return reply.status(200).send(documentoGeneracion);
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

        const existingDocumentoGeneracion =
          await prisma.documentoGeneracion.findUnique({
            where: { id },
          });

        if (!existingDocumentoGeneracion) {
          return reply
            .status(404)
            .send({ error: "DocumentoGeneracion not found" });
        }

        await prisma.documentoGeneracion.delete({
          where: { id },
        });

        return reply
          .status(200)
          .send({ message: "DocumentoGeneracion deleted successfully" });
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );
};

export default routes;
