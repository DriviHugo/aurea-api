import type { FastifyPluginAsync } from "fastify";
import type { PrismaClient } from "@prisma/client";

const documentoEvidenciaSchema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    documentoId: { type: "string", format: "uuid" },
    evidenciaId: { type: "string", format: "uuid" },
    createdAt: { type: "string", format: "date-time" },
  },
};

const createDocumentoEvidenciaSchema = {
  type: "object",
  required: ["documentoId", "evidenciaId"],
  properties: {
    documentoId: { type: "string", format: "uuid" },
    evidenciaId: { type: "string", format: "uuid" },
  },
};

const updateDocumentoEvidenciaSchema = {
  type: "object",
  properties: {
    documentoId: { type: "string", format: "uuid" },
    evidenciaId: { type: "string", format: "uuid" },
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

  // GET /documento-evidencia - List all documento-evidencia relationships with pagination
  fastify.get(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["DocumentoEvidencia"],
        description: "Get all documento-evidencia relationships",
        querystring: paginationSchema,
        response: {
          200: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    ...documentoEvidenciaSchema.properties,
                    documento: {
                      type: "object",
                      properties: {
                        id: { type: "string", format: "uuid" },
                        nombre: { type: "string" },
                        descripcion: { type: "string" },
                      },
                    },
                    evidencia: {
                      type: "object",
                      properties: {
                        id: { type: "string", format: "uuid" },
                        nombre: { type: "string" },
                        descripcion: { type: "string" },
                      },
                    },
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
        const { page = 1, limit = 10 } = request.query as {
          page?: number;
          limit?: number;
        };
        const skip = (page - 1) * limit;

        const [data, total] = await Promise.all([
          prisma.documentoEvidencia.findMany({
            skip,
            take: limit,
            include: {
              documento: {
                select: {
                  id: true,
                  nombre: true,
                  descripcion: true,
                },
              },
              evidencia: {
                select: {
                  id: true,
                  nombre: true,
                  descripcion: true,
                },
              },
            },
            orderBy: {
              createdAt: "desc",
            },
          }),
          prisma.documentoEvidencia.count(),
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
        fastify.log.error(error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // GET /documento-evidencia/:id - Get documento-evidencia relationship by ID
  fastify.get(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["DocumentoEvidencia"],
        description: "Get documento-evidencia relationship by ID",
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
              ...documentoEvidenciaSchema.properties,
              documento: {
                type: "object",
                properties: {
                  id: { type: "string", format: "uuid" },
                  nombre: { type: "string" },
                  descripcion: { type: "string" },
                },
              },
              evidencia: {
                type: "object",
                properties: {
                  id: { type: "string", format: "uuid" },
                  nombre: { type: "string" },
                  descripcion: { type: "string" },
                },
              },
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

        const documentoEvidencia = await prisma.documentoEvidencia.findUnique({
          where: { id },
          include: {
            documento: {
              select: {
                id: true,
                nombre: true,
                descripcion: true,
              },
            },
            evidencia: {
              select: {
                id: true,
                nombre: true,
                descripcion: true,
              },
            },
          },
        });

        if (!documentoEvidencia) {
          return reply
            .status(404)
            .send({ error: "DocumentoEvidencia not found" });
        }

        return reply.status(200).send(documentoEvidencia);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // POST /documento-evidencia - Create new documento-evidencia relationship
  fastify.post(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["DocumentoEvidencia"],
        description: "Create new documento-evidencia relationship",
        body: createDocumentoEvidenciaSchema,
        response: {
          201: {
            type: "object",
            properties: {
              ...documentoEvidenciaSchema.properties,
              documento: {
                type: "object",
                properties: {
                  id: { type: "string", format: "uuid" },
                  nombre: { type: "string" },
                  descripcion: { type: "string" },
                },
              },
              evidencia: {
                type: "object",
                properties: {
                  id: { type: "string", format: "uuid" },
                  nombre: { type: "string" },
                  descripcion: { type: "string" },
                },
              },
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
        const { documentoId, evidenciaId } = request.body as {
          documentoId: string;
          evidenciaId: string;
        };

        // Check if documento exists
        const documento = await prisma.documento.findUnique({
          where: { id: documentoId },
        });

        if (!documento) {
          return reply.status(400).send({ error: "Documento not found" });
        }

        // Check if evidencia exists
        const evidencia = await prisma.evidencia.findUnique({
          where: { id: evidenciaId },
        });

        if (!evidencia) {
          return reply.status(400).send({ error: "Evidencia not found" });
        }

        // Check if relationship already exists
        const existingRelation = await prisma.documentoEvidencia.findUnique({
          where: {
            documentoId_evidenciaId: {
              documentoId,
              evidenciaId,
            },
          },
        });

        if (existingRelation) {
          return reply
            .status(400)
            .send({ error: "DocumentoEvidencia relationship already exists" });
        }

        const documentoEvidencia = await prisma.documentoEvidencia.create({
          data: {
            documentoId,
            evidenciaId,
          },
          include: {
            documento: {
              select: {
                id: true,
                nombre: true,
                descripcion: true,
              },
            },
            evidencia: {
              select: {
                id: true,
                nombre: true,
                descripcion: true,
              },
            },
          },
        });

        return reply.status(201).send(documentoEvidencia);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // PUT /documento-evidencia/:id - Update documento-evidencia relationship
  fastify.put(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["DocumentoEvidencia"],
        description: "Update documento-evidencia relationship",
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", format: "uuid" },
          },
        },
        body: updateDocumentoEvidenciaSchema,
        response: {
          200: {
            type: "object",
            properties: {
              ...documentoEvidenciaSchema.properties,
              documento: {
                type: "object",
                properties: {
                  id: { type: "string", format: "uuid" },
                  nombre: { type: "string" },
                  descripcion: { type: "string" },
                },
              },
              evidencia: {
                type: "object",
                properties: {
                  id: { type: "string", format: "uuid" },
                  nombre: { type: "string" },
                  descripcion: { type: "string" },
                },
              },
            },
          },
          400: {
            type: "object",
            properties: {
              error: { type: "string" },
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
          documentoId?: string;
          evidenciaId?: string;
        };

        // Check if documento-evidencia relationship exists
        const existingDocumentoEvidencia =
          await prisma.documentoEvidencia.findUnique({
            where: { id },
          });

        if (!existingDocumentoEvidencia) {
          return reply
            .status(404)
            .send({ error: "DocumentoEvidencia not found" });
        }

        // Validate documento if provided
        if (updateData.documentoId) {
          const documento = await prisma.documento.findUnique({
            where: { id: updateData.documentoId },
          });

          if (!documento) {
            return reply.status(400).send({ error: "Documento not found" });
          }
        }

        // Validate evidencia if provided
        if (updateData.evidenciaId) {
          const evidencia = await prisma.evidencia.findUnique({
            where: { id: updateData.evidenciaId },
          });

          if (!evidencia) {
            return reply.status(400).send({ error: "Evidencia not found" });
          }
        }

        // Check for duplicate relationship if updating IDs
        if (updateData.documentoId || updateData.evidenciaId) {
          const documentoId =
            updateData.documentoId || existingDocumentoEvidencia.documentoId;
          const evidenciaId =
            updateData.evidenciaId || existingDocumentoEvidencia.evidenciaId;

          const duplicateRelation = await prisma.documentoEvidencia.findFirst({
            where: {
              documentoId,
              evidenciaId,
              NOT: { id },
            },
          });

          if (duplicateRelation) {
            return reply.status(400).send({
              error: "DocumentoEvidencia relationship already exists",
            });
          }
        }

        const documentoEvidencia = await prisma.documentoEvidencia.update({
          where: { id },
          data: updateData,
          include: {
            documento: {
              select: {
                id: true,
                nombre: true,
                descripcion: true,
              },
            },
            evidencia: {
              select: {
                id: true,
                nombre: true,
                descripcion: true,
              },
            },
          },
        });

        return reply.status(200).send(documentoEvidencia);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // DELETE /documento-evidencia/:id - Delete documento-evidencia relationship
  fastify.delete(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["DocumentoEvidencia"],
        description: "Delete documento-evidencia relationship",
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

        const documentoEvidencia = await prisma.documentoEvidencia.findUnique({
          where: { id },
        });

        if (!documentoEvidencia) {
          return reply
            .status(404)
            .send({ error: "DocumentoEvidencia not found" });
        }

        await prisma.documentoEvidencia.delete({
          where: { id },
        });

        return reply
          .status(200)
          .send({ message: "DocumentoEvidencia deleted successfully" });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );
};

export default routes;
