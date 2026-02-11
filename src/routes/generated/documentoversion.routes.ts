import type { FastifyPluginAsync } from "fastify";
import type { PrismaClient } from "@prisma/client";

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // GET /documento-versions - List with pagination
  fastify.get(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["DocumentoVersion"],
        description: "Get paginated list of documento versions",
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
                    contenidoSnapshot: { type: "object" },
                    seccionesSnapshot: { type: ["object", "null"] },
                    descripcionCambio: { type: ["string", "null"] },
                    usuarioId: { type: "string", format: "uuid" },
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
        const { page = 1, limit = 10, documentoId } = request.query as any;
        const skip = (page - 1) * limit;

        const where = documentoId ? { documentoId } : {};

        const [data, total] = await Promise.all([
          prisma.documentoVersion.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
          }),
          prisma.documentoVersion.count({ where }),
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

  // GET /documento-versions/:id - Get by ID
  fastify.get(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["DocumentoVersion"],
        description: "Get documento version by ID",
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
              contenidoSnapshot: { type: "object" },
              seccionesSnapshot: { type: ["object", "null"] },
              descripcionCambio: { type: ["string", "null"] },
              usuarioId: { type: "string", format: "uuid" },
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

        const documentoVersion = await prisma.documentoVersion.findUnique({
          where: { id },
        });

        if (!documentoVersion) {
          return reply
            .status(404)
            .send({ error: "Documento version not found" });
        }

        return reply.status(200).send(documentoVersion);
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // POST /documento-versions - Create
  fastify.post(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["DocumentoVersion"],
        description: "Create new documento version",
        body: {
          type: "object",
          required: [
            "documentoId",
            "version",
            "contenidoSnapshot",
            "usuarioId",
          ],
          properties: {
            documentoId: { type: "string", format: "uuid" },
            version: { type: "integer", minimum: 1 },
            contenidoSnapshot: { type: "object" },
            seccionesSnapshot: { type: ["object", "null"] },
            descripcionCambio: { type: ["string", "null"] },
            usuarioId: { type: "string", format: "uuid" },
          },
        },
        response: {
          201: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              documentoId: { type: "string", format: "uuid" },
              version: { type: "integer" },
              contenidoSnapshot: { type: "object" },
              seccionesSnapshot: { type: ["object", "null"] },
              descripcionCambio: { type: ["string", "null"] },
              usuarioId: { type: "string", format: "uuid" },
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

        const documentoVersion = await prisma.documentoVersion.create({
          data,
        });

        return reply.status(201).send(documentoVersion);
      } catch (error: any) {
        if (error.code === "P2002") {
          return reply
            .status(400)
            .send({ error: "Version already exists for this documento" });
        }
        if (error.code === "P2003") {
          return reply
            .status(400)
            .send({ error: "Referenced documento or usuario does not exist" });
        }
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // PUT /documento-versions/:id - Update
  fastify.put(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["DocumentoVersion"],
        description: "Update documento version by ID",
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
            contenidoSnapshot: { type: "object" },
            seccionesSnapshot: { type: ["object", "null"] },
            descripcionCambio: { type: ["string", "null"] },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              documentoId: { type: "string", format: "uuid" },
              version: { type: "integer" },
              contenidoSnapshot: { type: "object" },
              seccionesSnapshot: { type: ["object", "null"] },
              descripcionCambio: { type: ["string", "null"] },
              usuarioId: { type: "string", format: "uuid" },
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

        const existingVersion = await prisma.documentoVersion.findUnique({
          where: { id },
        });

        if (!existingVersion) {
          return reply
            .status(404)
            .send({ error: "Documento version not found" });
        }

        const documentoVersion = await prisma.documentoVersion.update({
          where: { id },
          data,
        });

        return reply.status(200).send(documentoVersion);
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // DELETE /documento-versions/:id - Delete
  fastify.delete(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["DocumentoVersion"],
        description: "Delete documento version by ID",
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

        const existingVersion = await prisma.documentoVersion.findUnique({
          where: { id },
        });

        if (!existingVersion) {
          return reply
            .status(404)
            .send({ error: "Documento version not found" });
        }

        await prisma.documentoVersion.delete({
          where: { id },
        });

        return reply
          .status(200)
          .send({ message: "Documento version deleted successfully" });
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );
};

export default routes;
