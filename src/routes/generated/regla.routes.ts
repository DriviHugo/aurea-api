import type { FastifyPluginAsync } from "fastify";
import type { PrismaClient } from "@prisma/client";

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // Schema definitions
  const reglaSchema = {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      codigo: { type: "string" },
      nombre: { type: "string" },
      descripcion: { type: "string" },
      severidad: { type: "string", enum: ["BAJA", "MEDIA", "ALTA", "CRITICA"] },
      evidenciaId: { type: ["string", "null"], format: "uuid" },
      condicion: { type: "string" },
      mensaje: { type: "string" },
      version: { type: "integer" },
      estado: { type: "string" },
      aprobadorId: { type: ["string", "null"], format: "uuid" },
      aprobadorRol: {
        type: ["string", "null"],
        enum: ["ADMIN", "SUPERVISOR", "USUARIO"],
      },
      fechaAprobacion: { type: ["string", "null"], format: "date-time" },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
  };

  const createReglaSchema = {
    type: "object",
    required: [
      "codigo",
      "nombre",
      "descripcion",
      "severidad",
      "condicion",
      "mensaje",
    ],
    properties: {
      codigo: { type: "string", minLength: 1 },
      nombre: { type: "string", minLength: 1 },
      descripcion: { type: "string", minLength: 1 },
      severidad: { type: "string", enum: ["BAJA", "MEDIA", "ALTA", "CRITICA"] },
      evidenciaId: { type: ["string", "null"], format: "uuid" },
      condicion: { type: "string", minLength: 1 },
      mensaje: { type: "string", minLength: 1 },
      estado: { type: "string" },
      aprobadorId: { type: ["string", "null"], format: "uuid" },
      aprobadorRol: {
        type: ["string", "null"],
        enum: ["ADMIN", "SUPERVISOR", "USUARIO"],
      },
    },
    additionalProperties: false,
  };

  const updateReglaSchema = {
    type: "object",
    properties: {
      codigo: { type: "string", minLength: 1 },
      nombre: { type: "string", minLength: 1 },
      descripcion: { type: "string", minLength: 1 },
      severidad: { type: "string", enum: ["BAJA", "MEDIA", "ALTA", "CRITICA"] },
      evidenciaId: { type: ["string", "null"], format: "uuid" },
      condicion: { type: "string", minLength: 1 },
      mensaje: { type: "string", minLength: 1 },
      estado: { type: "string" },
      aprobadorId: { type: ["string", "null"], format: "uuid" },
      aprobadorRol: {
        type: ["string", "null"],
        enum: ["ADMIN", "SUPERVISOR", "USUARIO"],
      },
      fechaAprobacion: { type: ["string", "null"], format: "date-time" },
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

  const idParamSchema = {
    type: "object",
    required: ["id"],
    properties: {
      id: { type: "string", format: "uuid" },
    },
  };

  // GET /reglas - List reglas with pagination
  fastify.get(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Reglas"],
        description: "Get paginated list of reglas",
        querystring: paginationSchema,
        response: {
          200: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: reglaSchema,
              },
              total: { type: "integer" },
              page: { type: "integer" },
              limit: { type: "integer" },
              totalPages: { type: "integer" },
            },
          },
          500: {
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
        const { page = 1, limit = 10 } = request.query as {
          page?: number;
          limit?: number;
        };
        const skip = (page - 1) * limit;

        const [reglas, total] = await Promise.all([
          prisma.regla.findMany({
            skip,
            take: limit,
            include: {
              evidencia: true,
            },
            orderBy: {
              createdAt: "desc",
            },
          }),
          prisma.regla.count(),
        ]);

        const totalPages = Math.ceil(total / limit);

        return reply.status(200).send({
          data: reglas,
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

  // GET /reglas/:id - Get regla by ID
  fastify.get(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Reglas"],
        description: "Get regla by ID",
        params: idParamSchema,
        response: {
          200: reglaSchema,
          404: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
          500: {
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

        const regla = await prisma.regla.findUnique({
          where: { id },
          include: {
            evidencia: true,
            validaciones: true,
          },
        });

        if (!regla) {
          return reply.status(404).send({ error: "Regla not found" });
        }

        return reply.status(200).send(regla);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // POST /reglas - Create new regla
  fastify.post(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Reglas"],
        description: "Create new regla",
        body: createReglaSchema,
        response: {
          201: reglaSchema,
          400: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
          500: {
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
        const reglaData = request.body as {
          codigo: string;
          nombre: string;
          descripcion: string;
          severidad: "BAJA" | "MEDIA" | "ALTA" | "CRITICA";
          evidenciaId?: string;
          condicion: string;
          mensaje: string;
          estado?: string;
          aprobadorId?: string;
          aprobadorRol?: "ADMIN" | "SUPERVISOR" | "USUARIO";
        };

        // Check if codigo already exists
        const existingRegla = await prisma.regla.findUnique({
          where: { codigo: reglaData.codigo },
        });

        if (existingRegla) {
          return reply
            .status(400)
            .send({ error: "Regla with this codigo already exists" });
        }

        // Validate evidenciaId if provided
        if (reglaData.evidenciaId) {
          const evidencia = await prisma.evidencia.findUnique({
            where: { id: reglaData.evidenciaId },
          });

          if (!evidencia) {
            return reply.status(400).send({ error: "Evidencia not found" });
          }
        }

        const regla = await prisma.regla.create({
          data: reglaData,
          include: {
            evidencia: true,
          },
        });

        return reply.status(201).send(regla);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // PUT /reglas/:id - Update regla
  fastify.put(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Reglas"],
        description: "Update regla by ID",
        params: idParamSchema,
        body: updateReglaSchema,
        response: {
          200: reglaSchema,
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
          500: {
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
          codigo?: string;
          nombre?: string;
          descripcion?: string;
          severidad?: "BAJA" | "MEDIA" | "ALTA" | "CRITICA";
          evidenciaId?: string | null;
          condicion?: string;
          mensaje?: string;
          estado?: string;
          aprobadorId?: string | null;
          aprobadorRol?: "ADMIN" | "SUPERVISOR" | "USUARIO" | null;
          fechaAprobacion?: string | null;
        };

        // Check if regla exists
        const existingRegla = await prisma.regla.findUnique({
          where: { id },
        });

        if (!existingRegla) {
          return reply.status(404).send({ error: "Regla not found" });
        }

        // Check if codigo is being updated and already exists
        if (updateData.codigo && updateData.codigo !== existingRegla.codigo) {
          const reglaWithCodigo = await prisma.regla.findUnique({
            where: { codigo: updateData.codigo },
          });

          if (reglaWithCodigo) {
            return reply
              .status(400)
              .send({ error: "Regla with this codigo already exists" });
          }
        }

        // Validate evidenciaId if provided
        if (updateData.evidenciaId) {
          const evidencia = await prisma.evidencia.findUnique({
            where: { id: updateData.evidenciaId },
          });

          if (!evidencia) {
            return reply.status(400).send({ error: "Evidencia not found" });
          }
        }

        const regla = await prisma.regla.update({
          where: { id },
          data: updateData,
          include: {
            evidencia: true,
          },
        });

        return reply.status(200).send(regla);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // DELETE /reglas/:id - Delete regla
  fastify.delete(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Reglas"],
        description: "Delete regla by ID",
        params: idParamSchema,
        response: {
          200: {
            type: "object",
            properties: {
              message: { type: "string" },
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
          500: {
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

        // Check if regla exists
        const existingRegla = await prisma.regla.findUnique({
          where: { id },
          include: {
            validaciones: true,
          },
        });

        if (!existingRegla) {
          return reply.status(404).send({ error: "Regla not found" });
        }

        // Check if regla has associated validaciones
        if (existingRegla.validaciones.length > 0) {
          return reply.status(400).send({
            error: "Cannot delete regla with associated validaciones",
          });
        }

        await prisma.regla.delete({
          where: { id },
        });

        return reply
          .status(200)
          .send({ message: "Regla deleted successfully" });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );
};

export default routes;
