import type { FastifyPluginAsync } from "fastify";
import type { PrismaClient } from "@prisma/client";

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // GET /validaciones - List validaciones with pagination
  fastify.get(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Validaciones"],
        description: "Get paginated list of validaciones",
        querystring: {
          type: "object",
          properties: {
            page: { type: "integer", minimum: 1, default: 1 },
            limit: { type: "integer", minimum: 1, maximum: 100, default: 10 },
            expedienteId: { type: "string", format: "uuid" },
            reglaId: { type: "string", format: "uuid" },
            passed: { type: "boolean" },
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
                    expedienteId: { type: "string", format: "uuid" },
                    documentoId: { type: ["string", "null"], format: "uuid" },
                    reglaId: { type: "string", format: "uuid" },
                    passed: { type: "boolean" },
                    valorEncontrado: { type: ["string", "null"] },
                    explicacion: { type: "string" },
                    puntuacionEstructura: { type: ["integer", "null"] },
                    puntuacionContenido: { type: ["integer", "null"] },
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
        const {
          page = 1,
          limit = 10,
          expedienteId,
          reglaId,
          passed,
        } = request.query as any;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (expedienteId) where.expedienteId = expedienteId;
        if (reglaId) where.reglaId = reglaId;
        if (passed !== undefined) where.passed = passed;

        const [validaciones, total] = await Promise.all([
          prisma.validation.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
          }),
          prisma.validation.count({ where }),
        ]);

        const totalPages = Math.ceil(total / limit);

        return reply.status(200).send({
          data: validaciones,
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

  // GET /validaciones/:id - Get validacion by ID
  fastify.get(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Validaciones"],
        description: "Get validacion by ID",
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
              expedienteId: { type: "string", format: "uuid" },
              documentoId: { type: ["string", "null"], format: "uuid" },
              reglaId: { type: "string", format: "uuid" },
              passed: { type: "boolean" },
              valorEncontrado: { type: ["string", "null"] },
              explicacion: { type: "string" },
              puntuacionEstructura: { type: ["integer", "null"] },
              puntuacionContenido: { type: ["integer", "null"] },
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

        const validacion = await prisma.validation.findUnique({
          where: { id },
        });

        if (!validacion) {
          return reply.status(404).send({ error: "Validacion not found" });
        }

        return reply.status(200).send(validacion);
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // POST /validaciones - Create new validacion
  fastify.post(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Validaciones"],
        description: "Create new validacion",
        body: {
          type: "object",
          required: [
            "expedienteId",
            "reglaId",
            "passed",
            "explicacion",
            "usuarioId",
          ],
          properties: {
            expedienteId: { type: "string", format: "uuid" },
            documentoId: { type: ["string", "null"], format: "uuid" },
            reglaId: { type: "string", format: "uuid" },
            passed: { type: "boolean" },
            valorEncontrado: { type: ["string", "null"] },
            explicacion: { type: "string", minLength: 1 },
            puntuacionEstructura: {
              type: ["integer", "null"],
              minimum: 0,
              maximum: 100,
            },
            puntuacionContenido: {
              type: ["integer", "null"],
              minimum: 0,
              maximum: 100,
            },
            usuarioId: { type: "string", format: "uuid" },
          },
        },
        response: {
          201: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              expedienteId: { type: "string", format: "uuid" },
              documentoId: { type: ["string", "null"], format: "uuid" },
              reglaId: { type: "string", format: "uuid" },
              passed: { type: "boolean" },
              valorEncontrado: { type: ["string", "null"] },
              explicacion: { type: "string" },
              puntuacionEstructura: { type: ["integer", "null"] },
              puntuacionContenido: { type: ["integer", "null"] },
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

        // Verify related entities exist
        const [expediente, regla, usuario, documento] = await Promise.all([
          prisma.case.findUnique({ where: { id: data.expedienteId } }),
          prisma.rule.findUnique({ where: { id: data.reglaId } }),
          prisma.profile.findUnique({ where: { id: data.usuarioId } }),
          data.documentoId
            ? prisma.document.findUnique({ where: { id: data.documentoId } })
            : null,
        ]);

        if (!expediente) {
          return reply.status(400).send({ error: "Expediente not found" });
        }
        if (!regla) {
          return reply.status(400).send({ error: "Regla not found" });
        }
        if (!usuario) {
          return reply.status(400).send({ error: "Usuario not found" });
        }
        if (data.documentoId && !documento) {
          return reply.status(400).send({ error: "Documento not found" });
        }

        const validacion = await prisma.validation.create({
          data: {
            expedienteId: data.expedienteId,
            documentoId: data.documentoId,
            reglaId: data.reglaId,
            passed: data.passed,
            valorEncontrado: data.valorEncontrado,
            explicacion: data.explicacion,
            puntuacionEstructura: data.puntuacionEstructura,
            puntuacionContenido: data.puntuacionContenido,
            usuarioId: data.usuarioId,
          },
        });

        return reply.status(201).send(validacion);
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // PUT /validaciones/:id - Update validacion
  fastify.put(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Validaciones"],
        description: "Update validacion by ID",
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
            expedienteId: { type: "string", format: "uuid" },
            documentoId: { type: ["string", "null"], format: "uuid" },
            reglaId: { type: "string", format: "uuid" },
            passed: { type: "boolean" },
            valorEncontrado: { type: ["string", "null"] },
            explicacion: { type: "string", minLength: 1 },
            puntuacionEstructura: {
              type: ["integer", "null"],
              minimum: 0,
              maximum: 100,
            },
            puntuacionContenido: {
              type: ["integer", "null"],
              minimum: 0,
              maximum: 100,
            },
            usuarioId: { type: "string", format: "uuid" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              expedienteId: { type: "string", format: "uuid" },
              documentoId: { type: ["string", "null"], format: "uuid" },
              reglaId: { type: "string", format: "uuid" },
              passed: { type: "boolean" },
              valorEncontrado: { type: ["string", "null"] },
              explicacion: { type: "string" },
              puntuacionEstructura: { type: ["integer", "null"] },
              puntuacionContenido: { type: ["integer", "null"] },
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

        const existingValidacion = await prisma.validation.findUnique({
          where: { id },
        });

        if (!existingValidacion) {
          return reply.status(404).send({ error: "Validacion not found" });
        }

        // Verify related entities exist if they are being updated
        const verifications = [];
        if (data.expedienteId) {
          verifications.push(
            prisma.case
              .findUnique({ where: { id: data.expedienteId } })
              .then((result) => ({ type: "expediente", result })),
          );
        }
        if (data.reglaId) {
          verifications.push(
            prisma.rule
              .findUnique({ where: { id: data.reglaId } })
              .then((result) => ({ type: "regla", result })),
          );
        }
        if (data.usuarioId) {
          verifications.push(
            prisma.profile
              .findUnique({ where: { id: data.usuarioId } })
              .then((result) => ({ type: "usuario", result })),
          );
        }
        if (data.documentoId) {
          verifications.push(
            prisma.document
              .findUnique({ where: { id: data.documentoId } })
              .then((result) => ({ type: "documento", result })),
          );
        }

        const results = await Promise.all(verifications);
        for (const { type, result } of results) {
          if (!result) {
            return reply.status(400).send({
              error: `${type.charAt(0).toUpperCase() + type.slice(1)} not found`,
            });
          }
        }

        const validacion = await prisma.validation.update({
          where: { id },
          data: {
            ...(data.expedienteId && { expedienteId: data.expedienteId }),
            ...(data.documentoId !== undefined && {
              documentoId: data.documentoId,
            }),
            ...(data.reglaId && { reglaId: data.reglaId }),
            ...(data.passed !== undefined && { passed: data.passed }),
            ...(data.valorEncontrado !== undefined && {
              valorEncontrado: data.valorEncontrado,
            }),
            ...(data.explicacion && { explicacion: data.explicacion }),
            ...(data.puntuacionEstructura !== undefined && {
              puntuacionEstructura: data.puntuacionEstructura,
            }),
            ...(data.puntuacionContenido !== undefined && {
              puntuacionContenido: data.puntuacionContenido,
            }),
            ...(data.usuarioId && { usuarioId: data.usuarioId }),
          },
        });

        return reply.status(200).send(validacion);
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // DELETE /validaciones/:id - Delete validacion
  fastify.delete(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Validaciones"],
        description: "Delete validacion by ID",
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

        const existingValidacion = await prisma.validation.findUnique({
          where: { id },
        });

        if (!existingValidacion) {
          return reply.status(404).send({ error: "Validacion not found" });
        }

        await prisma.validation.delete({
          where: { id },
        });

        return reply
          .status(200)
          .send({ message: "Validacion deleted successfully" });
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );
};

export default routes;
