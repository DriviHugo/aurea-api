import type { FastifyPluginAsync } from "fastify";
import type { PrismaClient } from "@prisma/client";

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // Validation schemas
  const createDocumentoEvidenciaSchema = {
    type: "object",
    required: ["documentoId", "evidenciaId"],
    properties: {
      documentoId: { type: "string", format: "uuid" },
      evidenciaId: { type: "string", format: "uuid" },
    },
    additionalProperties: false,
  };

  const updateDocumentoEvidenciaSchema = {
    type: "object",
    properties: {
      documentoId: { type: "string", format: "uuid" },
      evidenciaId: { type: "string", format: "uuid" },
    },
    additionalProperties: false,
  };

  const queryParamsSchema = {
    type: "object",
    properties: {
      page: { type: "integer", minimum: 1, default: 1 },
      limit: { type: "integer", minimum: 1, maximum: 100, default: 10 },
      documentoId: { type: "string", format: "uuid" },
      evidenciaId: { type: "string", format: "uuid" },
    },
    additionalProperties: false,
  };

  const paramsSchema = {
    type: "object",
    required: ["id"],
    properties: {
      id: { type: "string", format: "uuid" },
    },
    additionalProperties: false,
  };

  // GET /documentos-evidencias - List all documento-evidencia relationships
  fastify.get(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["DocumentoEvidencia"],
        description:
          "Get all documento-evidencia relationships with pagination",
        querystring: queryParamsSchema,
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
                    evidenciaId: { type: "string", format: "uuid" },
                    createdAt: { type: "string", format: "date-time" },
                    documento: {
                      type: "object",
                      properties: {
                        id: { type: "string", format: "uuid" },
                        nombre: { type: "string" },
                      },
                    },
                    evidencia: {
                      type: "object",
                      properties: {
                        id: { type: "string", format: "uuid" },
                        nombre: { type: "string" },
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
        const {
          page = 1,
          limit = 10,
          documentoId,
          evidenciaId,
        } = request.query as any;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (documentoId) where.documentoId = documentoId;
        if (evidenciaId) where.evidenciaId = evidenciaId;

        const [documentosEvidencias, total] = await Promise.all([
          prisma.documentoEvidencia.findMany({
            where,
            skip,
            take: limit,
            include: {
              documento: {
                select: {
                  id: true,
                  nombre: true,
                },
              },
              evidencia: {
                select: {
                  id: true,
                  nombre: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
          }),
          prisma.documentoEvidencia.count({ where }),
        ]);

        const totalPages = Math.ceil(total / limit);

        return reply.status(200).send({
          data: documentosEvidencias,
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

  // GET /documentos-evidencias/:id - Get specific documento-evidencia relationship
  fastify.get(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["DocumentoEvidencia"],
        description: "Get a specific documento-evidencia relationship by ID",
        params: paramsSchema,
        response: {
          200: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              documentoId: { type: "string", format: "uuid" },
              evidenciaId: { type: "string", format: "uuid" },
              createdAt: { type: "string", format: "date-time" },
              documento: {
                type: "object",
                properties: {
                  id: { type: "string", format: "uuid" },
                  nombre: { type: "string" },
                },
              },
              evidencia: {
                type: "object",
                properties: {
                  id: { type: "string", format: "uuid" },
                  nombre: { type: "string" },
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
              },
            },
            evidencia: {
              select: {
                id: true,
                nombre: true,
              },
            },
          },
        });

        if (!documentoEvidencia) {
          return reply
            .status(404)
            .send({ error: "Documento-evidencia relationship not found" });
        }

        return reply.status(200).send(documentoEvidencia);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // POST /documentos-evidencias - Create new documento-evidencia relationship
  fastify.post(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["DocumentoEvidencia"],
        description: "Create a new documento-evidencia relationship",
        body: createDocumentoEvidenciaSchema,
        response: {
          201: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              documentoId: { type: "string", format: "uuid" },
              evidenciaId: { type: "string", format: "uuid" },
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
        const { documentoId, evidenciaId } = request.body as {
          documentoId: string;
          evidenciaId: string;
        };

        // Verify that documento and evidencia exist
        const [documento, evidencia] = await Promise.all([
          prisma.documento.findUnique({ where: { id: documentoId } }),
          prisma.evidencia.findUnique({ where: { id: evidenciaId } }),
        ]);

        if (!documento) {
          return reply.status(400).send({ error: "Documento not found" });
        }

        if (!evidencia) {
          return reply.status(400).send({ error: "Evidencia not found" });
        }

        const documentoEvidencia = await prisma.documentoEvidencia.create({
          data: {
            documentoId,
            evidenciaId,
          },
        });

        return reply.status(201).send(documentoEvidencia);
      } catch (error: any) {
        fastify.log.error(error);

        // Handle unique constraint violation
        if (error.code === "P2002") {
          return reply.status(400).send({
            error: "Documento-evidencia relationship already exists",
          });
        }

        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // PUT /documentos-evidencias/:id - Update documento-evidencia relationship
  fastify.put(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["DocumentoEvidencia"],
        description: "Update a documento-evidencia relationship",
        params: paramsSchema,
        body: updateDocumentoEvidenciaSchema,
        response: {
          200: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              documentoId: { type: "string", format: "uuid" },
              evidenciaId: { type: "string", format: "uuid" },
              createdAt: { type: "string", format: "date-time" },
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

        // Check if relationship exists
        const existingRelation = await prisma.documentoEvidencia.findUnique({
          where: { id },
        });

        if (!existingRelation) {
          return reply
            .status(404)
            .send({ error: "Documento-evidencia relationship not found" });
        }

        // Verify that documento and evidencia exist if they are being updated
        if (updateData.documentoId || updateData.evidenciaId) {
          const checks = [];

          if (updateData.documentoId) {
            checks.push(
              prisma.documento
                .findUnique({ where: { id: updateData.documentoId } })
                .then((doc) => ({ type: "documento", exists: !!doc })),
            );
          }

          if (updateData.evidenciaId) {
            checks.push(
              prisma.evidencia
                .findUnique({ where: { id: updateData.evidenciaId } })
                .then((ev) => ({ type: "evidencia", exists: !!ev })),
            );
          }

          const results = await Promise.all(checks);

          for (const result of results) {
            if (!result.exists) {
              return reply.status(400).send({
                error: `${result.type.charAt(0).toUpperCase() + result.type.slice(1)} not found`,
              });
            }
          }
        }

        const updatedRelation = await prisma.documentoEvidencia.update({
          where: { id },
          data: updateData,
        });

        return reply.status(200).send(updatedRelation);
      } catch (error: any) {
        fastify.log.error(error);

        // Handle unique constraint violation
        if (error.code === "P2002") {
          return reply.status(400).send({
            error: "Documento-evidencia relationship already exists",
          });
        }

        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // DELETE /documentos-evidencias/:id - Delete documento-evidencia relationship
  fastify.delete(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["DocumentoEvidencia"],
        description: "Delete a documento-evidencia relationship",
        params: paramsSchema,
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

        // Check if relationship exists
        const existingRelation = await prisma.documentoEvidencia.findUnique({
          where: { id },
        });

        if (!existingRelation) {
          return reply
            .status(404)
            .send({ error: "Documento-evidencia relationship not found" });
        }

        await prisma.documentoEvidencia.delete({
          where: { id },
        });

        return reply.status(200).send({
          message: "Documento-evidencia relationship deleted successfully",
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );
};

export default routes;
