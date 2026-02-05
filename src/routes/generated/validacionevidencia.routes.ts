import type { FastifyPluginAsync } from "fastify";
import type { PrismaClient } from "@prisma/client";

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // Schemas
  const validacionEvidenciaSchema = {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      validacionId: { type: "string", format: "uuid" },
      evidenciaId: { type: "string", format: "uuid" },
      createdAt: { type: "string", format: "date-time" },
    },
  };

  const createValidacionEvidenciaSchema = {
    type: "object",
    required: ["validacionId", "evidenciaId"],
    properties: {
      validacionId: { type: "string", format: "uuid" },
      evidenciaId: { type: "string", format: "uuid" },
    },
    additionalProperties: false,
  };

  const updateValidacionEvidenciaSchema = {
    type: "object",
    properties: {
      validacionId: { type: "string", format: "uuid" },
      evidenciaId: { type: "string", format: "uuid" },
    },
    additionalProperties: false,
  };

  const paginationSchema = {
    type: "object",
    properties: {
      page: { type: "integer", minimum: 1, default: 1 },
      limit: { type: "integer", minimum: 1, maximum: 100, default: 10 },
    },
  };

  const paramsSchema = {
    type: "object",
    required: ["id"],
    properties: {
      id: { type: "string", format: "uuid" },
    },
  };

  // GET /validaciones-evidencias - List with pagination
  fastify.get(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["ValidacionEvidencia"],
        description: "Get paginated list of validacion evidencias",
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
                    ...validacionEvidenciaSchema.properties,
                    validacion: {
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
        const { page = 1, limit = 10 } = request.query as {
          page?: number;
          limit?: number;
        };
        const skip = (page - 1) * limit;

        const [data, total] = await Promise.all([
          prisma.validacionEvidencia.findMany({
            skip,
            take: limit,
            include: {
              validacion: {
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
            orderBy: {
              createdAt: "desc",
            },
          }),
          prisma.validacionEvidencia.count(),
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

  // GET /validaciones-evidencias/:id - Get by ID
  fastify.get(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["ValidacionEvidencia"],
        description: "Get validacion evidencia by ID",
        params: paramsSchema,
        response: {
          200: {
            type: "object",
            properties: {
              ...validacionEvidenciaSchema.properties,
              validacion: {
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

        const validacionEvidencia = await prisma.validacionEvidencia.findUnique(
          {
            where: { id },
            include: {
              validacion: {
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
          },
        );

        if (!validacionEvidencia) {
          return reply
            .status(404)
            .send({ error: "Validacion evidencia not found" });
        }

        return reply.status(200).send(validacionEvidencia);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // POST /validaciones-evidencias - Create
  fastify.post(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["ValidacionEvidencia"],
        description: "Create new validacion evidencia",
        body: createValidacionEvidenciaSchema,
        response: {
          201: validacionEvidenciaSchema,
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
        const { validacionId, evidenciaId } = request.body as {
          validacionId: string;
          evidenciaId: string;
        };

        // Check if validacion exists
        const validacionExists = await prisma.validacion.findUnique({
          where: { id: validacionId },
        });

        if (!validacionExists) {
          return reply.status(400).send({ error: "Validacion not found" });
        }

        // Check if evidencia exists
        const evidenciaExists = await prisma.evidencia.findUnique({
          where: { id: evidenciaId },
        });

        if (!evidenciaExists) {
          return reply.status(400).send({ error: "Evidencia not found" });
        }

        // Check if relationship already exists
        const existingRelation = await prisma.validacionEvidencia.findUnique({
          where: {
            validacionId_evidenciaId: {
              validacionId,
              evidenciaId,
            },
          },
        });

        if (existingRelation) {
          return reply.status(400).send({
            error: "Validacion evidencia relationship already exists",
          });
        }

        const validacionEvidencia = await prisma.validacionEvidencia.create({
          data: {
            validacionId,
            evidenciaId,
          },
        });

        return reply.status(201).send(validacionEvidencia);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // PUT /validaciones-evidencias/:id - Update
  fastify.put(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["ValidacionEvidencia"],
        description: "Update validacion evidencia by ID",
        params: paramsSchema,
        body: updateValidacionEvidenciaSchema,
        response: {
          200: validacionEvidenciaSchema,
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
          validacionId?: string;
          evidenciaId?: string;
        };

        // Check if validacion evidencia exists
        const existingValidacionEvidencia =
          await prisma.validacionEvidencia.findUnique({
            where: { id },
          });

        if (!existingValidacionEvidencia) {
          return reply
            .status(404)
            .send({ error: "Validacion evidencia not found" });
        }

        // Validate referenced entities if provided
        if (updateData.validacionId) {
          const validacionExists = await prisma.validacion.findUnique({
            where: { id: updateData.validacionId },
          });

          if (!validacionExists) {
            return reply.status(400).send({ error: "Validacion not found" });
          }
        }

        if (updateData.evidenciaId) {
          const evidenciaExists = await prisma.evidencia.findUnique({
            where: { id: updateData.evidenciaId },
          });

          if (!evidenciaExists) {
            return reply.status(400).send({ error: "Evidencia not found" });
          }
        }

        // Check for duplicate relationship if both IDs are being updated
        const newValidacionId =
          updateData.validacionId || existingValidacionEvidencia.validacionId;
        const newEvidenciaId =
          updateData.evidenciaId || existingValidacionEvidencia.evidenciaId;

        if (
          newValidacionId !== existingValidacionEvidencia.validacionId ||
          newEvidenciaId !== existingValidacionEvidencia.evidenciaId
        ) {
          const duplicateCheck = await prisma.validacionEvidencia.findUnique({
            where: {
              validacionId_evidenciaId: {
                validacionId: newValidacionId,
                evidenciaId: newEvidenciaId,
              },
            },
          });

          if (duplicateCheck && duplicateCheck.id !== id) {
            return reply.status(400).send({
              error: "Validacion evidencia relationship already exists",
            });
          }
        }

        const validacionEvidencia = await prisma.validacionEvidencia.update({
          where: { id },
          data: updateData,
        });

        return reply.status(200).send(validacionEvidencia);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // DELETE /validaciones-evidencias/:id - Delete
  fastify.delete(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["ValidacionEvidencia"],
        description: "Delete validacion evidencia by ID",
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

        // Check if validacion evidencia exists
        const existingValidacionEvidencia =
          await prisma.validacionEvidencia.findUnique({
            where: { id },
          });

        if (!existingValidacionEvidencia) {
          return reply
            .status(404)
            .send({ error: "Validacion evidencia not found" });
        }

        await prisma.validacionEvidencia.delete({
          where: { id },
        });

        return reply
          .status(200)
          .send({ message: "Validacion evidencia deleted successfully" });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );
};

export default routes;
