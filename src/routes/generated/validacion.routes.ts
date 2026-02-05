import type { FastifyPluginAsync } from "fastify";
import type { PrismaClient } from "@prisma/client";

const validacionBodySchema = {
  type: "object",
  required: ["expedienteId", "reglaId", "passed", "explicacion", "usuarioId"],
  properties: {
    expedienteId: { type: "string", format: "uuid" },
    documentoId: { type: "string", format: "uuid", nullable: true },
    reglaId: { type: "string", format: "uuid" },
    passed: { type: "boolean" },
    valorEncontrado: { type: "string", nullable: true },
    explicacion: { type: "string", minLength: 1 },
    puntuacionEstructura: { type: "integer", minimum: 0, nullable: true },
    puntuacionContenido: { type: "integer", minimum: 0, nullable: true },
    usuarioId: { type: "string", format: "uuid" },
  },
  additionalProperties: false,
};

const validacionUpdateSchema = {
  type: "object",
  properties: {
    expedienteId: { type: "string", format: "uuid" },
    documentoId: { type: "string", format: "uuid", nullable: true },
    reglaId: { type: "string", format: "uuid" },
    passed: { type: "boolean" },
    valorEncontrado: { type: "string", nullable: true },
    explicacion: { type: "string", minLength: 1 },
    puntuacionEstructura: { type: "integer", minimum: 0, nullable: true },
    puntuacionContenido: { type: "integer", minimum: 0, nullable: true },
    usuarioId: { type: "string", format: "uuid" },
  },
  additionalProperties: false,
};

const validacionResponseSchema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    expedienteId: { type: "string", format: "uuid" },
    documentoId: { type: "string", format: "uuid", nullable: true },
    reglaId: { type: "string", format: "uuid" },
    passed: { type: "boolean" },
    valorEncontrado: { type: "string", nullable: true },
    explicacion: { type: "string" },
    puntuacionEstructura: { type: "integer", nullable: true },
    puntuacionContenido: { type: "integer", nullable: true },
    usuarioId: { type: "string", format: "uuid" },
    createdAt: { type: "string", format: "date-time" },
    expediente: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        nombre: { type: "string" },
      },
    },
    documento: {
      type: "object",
      nullable: true,
      properties: {
        id: { type: "string", format: "uuid" },
        nombre: { type: "string" },
      },
    },
    regla: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        nombre: { type: "string" },
      },
    },
    usuario: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        nombre: { type: "string" },
      },
    },
  },
};

const paginatedValidacionesSchema = {
  type: "object",
  properties: {
    data: {
      type: "array",
      items: validacionResponseSchema,
    },
    total: { type: "integer" },
    page: { type: "integer" },
    limit: { type: "integer" },
    totalPages: { type: "integer" },
  },
};

const queryStringSchema = {
  type: "object",
  properties: {
    page: { type: "integer", minimum: 1, default: 1 },
    limit: { type: "integer", minimum: 1, maximum: 100, default: 10 },
    expedienteId: { type: "string", format: "uuid" },
    documentoId: { type: "string", format: "uuid" },
    reglaId: { type: "string", format: "uuid" },
    passed: { type: "boolean" },
    usuarioId: { type: "string", format: "uuid" },
  },
};

const paramsSchema = {
  type: "object",
  required: ["id"],
  properties: {
    id: { type: "string", format: "uuid" },
  },
};

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // GET /validaciones - List validaciones with pagination and filters
  fastify.get(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Validaciones"],
        description: "Get paginated list of validaciones with optional filters",
        querystring: queryStringSchema,
        response: {
          200: paginatedValidacionesSchema,
          500: { type: "object", properties: { error: { type: "string" } } },
        },
      },
    },
    async (request, reply) => {
      try {
        const {
          page = 1,
          limit = 10,
          expedienteId,
          documentoId,
          reglaId,
          passed,
          usuarioId,
        } = request.query as any;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (expedienteId) where.expedienteId = expedienteId;
        if (documentoId) where.documentoId = documentoId;
        if (reglaId) where.reglaId = reglaId;
        if (passed !== undefined) where.passed = passed;
        if (usuarioId) where.usuarioId = usuarioId;

        const [validaciones, total] = await Promise.all([
          prisma.validacion.findMany({
            where,
            skip,
            take: limit,
            include: {
              expediente: {
                select: { id: true, nombre: true },
              },
              documento: {
                select: { id: true, nombre: true },
              },
              regla: {
                select: { id: true, nombre: true },
              },
              usuario: {
                select: { id: true, nombre: true },
              },
            },
            orderBy: { createdAt: "desc" },
          }),
          prisma.validacion.count({ where }),
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
        fastify.log.error(error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // GET /validaciones/:id - Get single validacion
  fastify.get(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Validaciones"],
        description: "Get a single validacion by ID",
        params: paramsSchema,
        response: {
          200: validacionResponseSchema,
          404: { type: "object", properties: { error: { type: "string" } } },
          500: { type: "object", properties: { error: { type: "string" } } },
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };

        const validacion = await prisma.validacion.findUnique({
          where: { id },
          include: {
            expediente: {
              select: { id: true, nombre: true },
            },
            documento: {
              select: { id: true, nombre: true },
            },
            regla: {
              select: { id: true, nombre: true },
            },
            usuario: {
              select: { id: true, nombre: true },
            },
          },
        });

        if (!validacion) {
          return reply.status(404).send({ error: "Validacion not found" });
        }

        return reply.status(200).send(validacion);
      } catch (error) {
        fastify.log.error(error);
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
        description: "Create a new validacion",
        body: validacionBodySchema,
        response: {
          201: validacionResponseSchema,
          400: { type: "object", properties: { error: { type: "string" } } },
          500: { type: "object", properties: { error: { type: "string" } } },
        },
      },
    },
    async (request, reply) => {
      try {
        const validacionData = request.body as any;

        // Verify related entities exist
        const [expediente, documento, regla, usuario] = await Promise.all([
          prisma.expediente.findUnique({
            where: { id: validacionData.expedienteId },
          }),
          validacionData.documentoId
            ? prisma.documento.findUnique({
                where: { id: validacionData.documentoId },
              })
            : null,
          prisma.regla.findUnique({ where: { id: validacionData.reglaId } }),
          prisma.profile.findUnique({
            where: { id: validacionData.usuarioId },
          }),
        ]);

        if (!expediente) {
          return reply.status(400).send({ error: "Expediente not found" });
        }

        if (validacionData.documentoId && !documento) {
          return reply.status(400).send({ error: "Documento not found" });
        }

        if (!regla) {
          return reply.status(400).send({ error: "Regla not found" });
        }

        if (!usuario) {
          return reply.status(400).send({ error: "Usuario not found" });
        }

        const validacion = await prisma.validacion.create({
          data: validacionData,
          include: {
            expediente: {
              select: { id: true, nombre: true },
            },
            documento: {
              select: { id: true, nombre: true },
            },
            regla: {
              select: { id: true, nombre: true },
            },
            usuario: {
              select: { id: true, nombre: true },
            },
          },
        });

        return reply.status(201).send(validacion);
      } catch (error) {
        fastify.log.error(error);
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
        description: "Update a validacion",
        params: paramsSchema,
        body: validacionUpdateSchema,
        response: {
          200: validacionResponseSchema,
          400: { type: "object", properties: { error: { type: "string" } } },
          404: { type: "object", properties: { error: { type: "string" } } },
          500: { type: "object", properties: { error: { type: "string" } } },
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const updateData = request.body as any;

        // Check if validacion exists
        const existingValidacion = await prisma.validacion.findUnique({
          where: { id },
        });

        if (!existingValidacion) {
          return reply.status(404).send({ error: "Validacion not found" });
        }

        // Verify related entities exist if they are being updated
        if (updateData.expedienteId) {
          const expediente = await prisma.expediente.findUnique({
            where: { id: updateData.expedienteId },
          });
          if (!expediente) {
            return reply.status(400).send({ error: "Expediente not found" });
          }
        }

        if (updateData.documentoId) {
          const documento = await prisma.documento.findUnique({
            where: { id: updateData.documentoId },
          });
          if (!documento) {
            return reply.status(400).send({ error: "Documento not found" });
          }
        }

        if (updateData.reglaId) {
          const regla = await prisma.regla.findUnique({
            where: { id: updateData.reglaId },
          });
          if (!regla) {
            return reply.status(400).send({ error: "Regla not found" });
          }
        }

        if (updateData.usuarioId) {
          const usuario = await prisma.profile.findUnique({
            where: { id: updateData.usuarioId },
          });
          if (!usuario) {
            return reply.status(400).send({ error: "Usuario not found" });
          }
        }

        const validacion = await prisma.validacion.update({
          where: { id },
          data: updateData,
          include: {
            expediente: {
              select: { id: true, nombre: true },
            },
            documento: {
              select: { id: true, nombre: true },
            },
            regla: {
              select: { id: true, nombre: true },
            },
            usuario: {
              select: { id: true, nombre: true },
            },
          },
        });

        return reply.status(200).send(validacion);
      } catch (error) {
        fastify.log.error(error);
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
        description: "Delete a validacion",
        params: paramsSchema,
        response: {
          200: { type: "object", properties: { message: { type: "string" } } },
          404: { type: "object", properties: { error: { type: "string" } } },
          500: { type: "object", properties: { error: { type: "string" } } },
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };

        const validacion = await prisma.validacion.findUnique({
          where: { id },
        });

        if (!validacion) {
          return reply.status(404).send({ error: "Validacion not found" });
        }

        await prisma.validacion.delete({
          where: { id },
        });

        return reply
          .status(200)
          .send({ message: "Validacion deleted successfully" });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );
};

export default routes;
