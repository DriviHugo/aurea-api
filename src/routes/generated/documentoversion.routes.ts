import type { FastifyPluginAsync } from "fastify";
import type { PrismaClient } from "@prisma/client";

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // Schemas
  const documentoVersionSchema = {
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
  };

  const createDocumentoVersionSchema = {
    type: "object",
    required: ["documentoId", "version", "contenidoSnapshot", "usuarioId"],
    properties: {
      documentoId: { type: "string", format: "uuid" },
      version: { type: "integer", minimum: 1 },
      contenidoSnapshot: { type: "object" },
      seccionesSnapshot: { type: ["object", "null"] },
      descripcionCambio: { type: ["string", "null"], maxLength: 500 },
      usuarioId: { type: "string", format: "uuid" },
    },
  };

  const updateDocumentoVersionSchema = {
    type: "object",
    properties: {
      contenidoSnapshot: { type: "object" },
      seccionesSnapshot: { type: ["object", "null"] },
      descripcionCambio: { type: ["string", "null"], maxLength: 500 },
    },
  };

  const paginationSchema = {
    type: "object",
    properties: {
      page: { type: "integer", minimum: 1, default: 1 },
      limit: { type: "integer", minimum: 1, maximum: 100, default: 10 },
      documentoId: { type: "string", format: "uuid" },
    },
  };

  const idParamSchema = {
    type: "object",
    required: ["id"],
    properties: {
      id: { type: "string", format: "uuid" },
    },
  };

  // GET /documento-versions - List with pagination
  fastify.get(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["DocumentoVersion"],
        description: "Get paginated list of documento versions",
        querystring: paginationSchema,
        response: {
          200: {
            type: "object",
            properties: {
              data: { type: "array", items: documentoVersionSchema },
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
          documentoId,
        } = request.query as {
          page?: number;
          limit?: number;
          documentoId?: string;
        };

        const skip = (page - 1) * limit;

        const where = documentoId ? { documentoId } : {};

        const [documentoVersions, total] = await Promise.all([
          prisma.documentoVersion.findMany({
            where,
            skip,
            take: limit,
            orderBy: [{ documentoId: "asc" }, { version: "desc" }],
          }),
          prisma.documentoVersion.count({ where }),
        ]);

        const totalPages = Math.ceil(total / limit);

        return reply.status(200).send({
          data: documentoVersions,
          total,
          page,
          limit,
          totalPages,
        });
      } catch (error) {
        fastify.log.error(error);
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
        params: idParamSchema,
        response: {
          200: documentoVersionSchema,
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
        fastify.log.error(error);
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
        body: createDocumentoVersionSchema,
        response: {
          201: documentoVersionSchema,
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
          documentoId: string;
          version: number;
          contenidoSnapshot: any;
          seccionesSnapshot?: any;
          descripcionCambio?: string;
          usuarioId: string;
        };

        // Check if documento exists
        const documento = await prisma.documento.findUnique({
          where: { id: data.documentoId },
        });

        if (!documento) {
          return reply.status(400).send({ error: "Documento not found" });
        }

        // Check if version already exists for this documento
        const existingVersion = await prisma.documentoVersion.findUnique({
          where: {
            documentoId_version: {
              documentoId: data.documentoId,
              version: data.version,
            },
          },
        });

        if (existingVersion) {
          return reply.status(400).send({
            error: "Version already exists for this documento",
          });
        }

        const documentoVersion = await prisma.documentoVersion.create({
          data,
        });

        return reply.status(201).send(documentoVersion);
      } catch (error) {
        fastify.log.error(error);
        if (error.code === "P2002") {
          return reply.status(400).send({
            error: "Version already exists for this documento",
          });
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
        params: idParamSchema,
        body: updateDocumentoVersionSchema,
        response: {
          200: documentoVersionSchema,
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
        const data = request.body as {
          contenidoSnapshot?: any;
          seccionesSnapshot?: any;
          descripcionCambio?: string;
        };

        // Check if documento version exists
        const existingDocumentoVersion =
          await prisma.documentoVersion.findUnique({
            where: { id },
          });

        if (!existingDocumentoVersion) {
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
        fastify.log.error(error);
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
        params: idParamSchema,
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

        // Check if documento version exists
        const existingDocumentoVersion =
          await prisma.documentoVersion.findUnique({
            where: { id },
          });

        if (!existingDocumentoVersion) {
          return reply
            .status(404)
            .send({ error: "Documento version not found" });
        }

        await prisma.documentoVersion.delete({
          where: { id },
        });

        return reply.status(200).send({
          message: "Documento version deleted successfully",
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // GET /documento-versions/documento/:documentoId - Get versions by documento ID
  fastify.get(
    "/documento/:documentoId",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["DocumentoVersion"],
        description: "Get all versions for a specific documento",
        params: {
          type: "object",
          required: ["documentoId"],
          properties: {
            documentoId: { type: "string", format: "uuid" },
          },
        },
        querystring: {
          type: "object",
          properties: {
            page: { type: "integer", minimum: 1, default: 1 },
            limit: { type: "integer", minimum: 1, maximum: 100, default: 10 },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              data: { type: "array", items: documentoVersionSchema },
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
        const { documentoId } = request.params as { documentoId: string };
        const { page = 1, limit = 10 } = request.query as {
          page?: number;
          limit?: number;
        };

        const skip = (page - 1) * limit;

        const [documentoVersions, total] = await Promise.all([
          prisma.documentoVersion.findMany({
            where: { documentoId },
            skip,
            take: limit,
            orderBy: { version: "desc" },
          }),
          prisma.documentoVersion.count({
            where: { documentoId },
          }),
        ]);

        const totalPages = Math.ceil(total / limit);

        return reply.status(200).send({
          data: documentoVersions,
          total,
          page,
          limit,
          totalPages,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );
};

export default routes;
