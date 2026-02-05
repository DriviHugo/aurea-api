import type { FastifyPluginAsync } from "fastify";
import type { PrismaClient } from "@prisma/client";

interface CpvRecomendadoBody {
  expedienteId: string;
  codigo: string;
  descripcion: string;
  puntuacion?: number;
  justificacion?: string;
}

interface CpvRecomendadoUpdate {
  codigo?: string;
  descripcion?: string;
  puntuacion?: number;
  justificacion?: string;
}

interface QueryParams {
  page?: number;
  limit?: number;
  expedienteId?: string;
}

const cpvRecomendadoBodySchema = {
  type: "object",
  required: ["expedienteId", "codigo", "descripcion"],
  properties: {
    expedienteId: { type: "string", format: "uuid" },
    codigo: { type: "string", minLength: 1 },
    descripcion: { type: "string", minLength: 1 },
    puntuacion: { type: "integer", minimum: 0 },
    justificacion: { type: "string" },
  },
  additionalProperties: false,
};

const cpvRecomendadoUpdateSchema = {
  type: "object",
  properties: {
    codigo: { type: "string", minLength: 1 },
    descripcion: { type: "string", minLength: 1 },
    puntuacion: { type: "integer", minimum: 0 },
    justificacion: { type: "string" },
  },
  additionalProperties: false,
};

const cpvRecomendadoResponseSchema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    expedienteId: { type: "string", format: "uuid" },
    codigo: { type: "string" },
    descripcion: { type: "string" },
    puntuacion: { type: ["integer", "null"] },
    justificacion: { type: ["string", "null"] },
    createdAt: { type: "string", format: "date-time" },
  },
};

const paginatedResponseSchema = {
  type: "object",
  properties: {
    data: {
      type: "array",
      items: cpvRecomendadoResponseSchema,
    },
    total: { type: "integer" },
    page: { type: "integer" },
    limit: { type: "integer" },
    totalPages: { type: "integer" },
  },
};

const queryParamsSchema = {
  type: "object",
  properties: {
    page: { type: "integer", minimum: 1, default: 1 },
    limit: { type: "integer", minimum: 1, maximum: 100, default: 10 },
    expedienteId: { type: "string", format: "uuid" },
  },
};

const idParamsSchema = {
  type: "object",
  required: ["id"],
  properties: {
    id: { type: "string", format: "uuid" },
  },
};

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // GET /cpv-recomendados - List with pagination
  fastify.get<{
    Querystring: QueryParams;
  }>(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["CPV Recomendados"],
        description: "Get paginated list of CPV recomendados",
        querystring: queryParamsSchema,
        response: {
          200: paginatedResponseSchema,
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
        const { page = 1, limit = 10, expedienteId } = request.query;
        const skip = (page - 1) * limit;

        const where = expedienteId ? { expedienteId } : {};

        const [cpvRecomendados, total] = await Promise.all([
          prisma.cpvRecomendado.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
            include: {
              expediente: {
                select: {
                  id: true,
                  numero: true,
                  titulo: true,
                },
              },
            },
          }),
          prisma.cpvRecomendado.count({ where }),
        ]);

        const totalPages = Math.ceil(total / limit);

        return reply.status(200).send({
          data: cpvRecomendados,
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

  // GET /cpv-recomendados/:id - Get by ID
  fastify.get<{
    Params: { id: string };
  }>(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["CPV Recomendados"],
        description: "Get CPV recomendado by ID",
        params: idParamsSchema,
        response: {
          200: cpvRecomendadoResponseSchema,
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
        const { id } = request.params;

        const cpvRecomendado = await prisma.cpvRecomendado.findUnique({
          where: { id },
          include: {
            expediente: {
              select: {
                id: true,
                numero: true,
                titulo: true,
              },
            },
          },
        });

        if (!cpvRecomendado) {
          return reply.status(404).send({ error: "CPV recomendado not found" });
        }

        return reply.status(200).send(cpvRecomendado);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // POST /cpv-recomendados - Create
  fastify.post<{
    Body: CpvRecomendadoBody;
  }>(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["CPV Recomendados"],
        description: "Create new CPV recomendado",
        body: cpvRecomendadoBodySchema,
        response: {
          201: cpvRecomendadoResponseSchema,
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
        const { expedienteId, codigo, descripcion, puntuacion, justificacion } =
          request.body;

        // Verify expediente exists
        const expediente = await prisma.expediente.findUnique({
          where: { id: expedienteId },
        });

        if (!expediente) {
          return reply.status(400).send({ error: "Expediente not found" });
        }

        const cpvRecomendado = await prisma.cpvRecomendado.create({
          data: {
            expedienteId,
            codigo,
            descripcion,
            puntuacion,
            justificacion,
          },
          include: {
            expediente: {
              select: {
                id: true,
                numero: true,
                titulo: true,
              },
            },
          },
        });

        return reply.status(201).send(cpvRecomendado);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // PUT /cpv-recomendados/:id - Update
  fastify.put<{
    Params: { id: string };
    Body: CpvRecomendadoUpdate;
  }>(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["CPV Recomendados"],
        description: "Update CPV recomendado by ID",
        params: idParamsSchema,
        body: cpvRecomendadoUpdateSchema,
        response: {
          200: cpvRecomendadoResponseSchema,
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
        const { id } = request.params;
        const updateData = request.body;

        // Check if CPV recomendado exists
        const existingCpvRecomendado = await prisma.cpvRecomendado.findUnique({
          where: { id },
        });

        if (!existingCpvRecomendado) {
          return reply.status(404).send({ error: "CPV recomendado not found" });
        }

        const cpvRecomendado = await prisma.cpvRecomendado.update({
          where: { id },
          data: updateData,
          include: {
            expediente: {
              select: {
                id: true,
                numero: true,
                titulo: true,
              },
            },
          },
        });

        return reply.status(200).send(cpvRecomendado);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // DELETE /cpv-recomendados/:id - Delete
  fastify.delete<{
    Params: { id: string };
  }>(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["CPV Recomendados"],
        description: "Delete CPV recomendado by ID",
        params: idParamsSchema,
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
        const { id } = request.params;

        // Check if CPV recomendado exists
        const existingCpvRecomendado = await prisma.cpvRecomendado.findUnique({
          where: { id },
        });

        if (!existingCpvRecomendado) {
          return reply.status(404).send({ error: "CPV recomendado not found" });
        }

        await prisma.cpvRecomendado.delete({
          where: { id },
        });

        return reply
          .status(200)
          .send({ message: "CPV recomendado deleted successfully" });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );
};

export default routes;
