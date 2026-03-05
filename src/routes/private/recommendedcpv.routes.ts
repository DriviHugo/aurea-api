import type { FastifyPluginAsync } from "fastify";
import type { PrismaClient } from "@prisma/client";

const cpvRecomendadoSchema = {
  type: "object",
  properties: {
    expedienteId: { type: "string", format: "uuid" },
    codigo: { type: "string" },
    descripcion: { type: "string" },
    puntuacion: { type: "integer", nullable: true },
    justificacion: { type: "string", nullable: true },
  },
  required: ["expedienteId", "codigo", "descripcion"],
};

const cpvRecomendadoResponseSchema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    expedienteId: { type: "string", format: "uuid" },
    codigo: { type: "string" },
    descripcion: { type: "string" },
    puntuacion: { type: "integer", nullable: true },
    justificacion: { type: "string", nullable: true },
    createdAt: { type: "string", format: "date-time" },
  },
};

const paginationQuerySchema = {
  type: "object",
  properties: {
    page: { type: "integer", minimum: 1, default: 1 },
    limit: { type: "integer", minimum: 1, maximum: 100, default: 10 },
  },
};

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // GET /cpv-recomendados - List with pagination
  fastify.get(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["CpvRecomendado"],
        description: "Get paginated list of CPV recomendados",
        querystring: paginationQuerySchema,
        response: {
          400: { type: "object", properties: { error: { type: "string" } } },
          404: { type: "object", properties: { error: { type: "string" } } },
          500: { type: "object", properties: { error: { type: "string" } } },
          200: {
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
          prisma.recommendedCpv.findMany({
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
          }),
          prisma.recommendedCpv.count(),
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

  // GET /cpv-recomendados/:id - Get by ID
  fastify.get(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["CpvRecomendado"],
        description: "Get CPV recomendado by ID",
        params: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
          },
          required: ["id"],
        },
        response: {
          400: { type: "object", properties: { error: { type: "string" } } },
          500: { type: "object", properties: { error: { type: "string" } } },
          200: cpvRecomendadoResponseSchema,
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

        const cpvRecomendado = await prisma.recommendedCpv.findUnique({
          where: { id },
        });

        if (!cpvRecomendado) {
          return reply.status(404).send({ error: "CPV recomendado not found" });
        }

        return reply.status(200).send(cpvRecomendado);
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // POST /cpv-recomendados - Create
  fastify.post(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["CpvRecomendado"],
        description: "Create new CPV recomendado",
        body: cpvRecomendadoSchema,
        response: {
          404: { type: "object", properties: { error: { type: "string" } } },
          500: { type: "object", properties: { error: { type: "string" } } },
          201: cpvRecomendadoResponseSchema,
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
          expedienteId: string;
          codigo: string;
          descripcion: string;
          puntuacion?: number;
          justificacion?: string;
        };

        // Verify expediente exists
        const expediente = await prisma.case.findUnique({
          where: { id: data.expedienteId },
        });

        if (!expediente) {
          return reply.status(400).send({ error: "Expediente not found" });
        }

        const cpvRecomendado = await prisma.recommendedCpv.create({
          data: {
            caseId: data.expedienteId,
            code: data.codigo,
            description: data.descripcion,
            ...(data.puntuacion !== undefined && { score: data.puntuacion }),
            ...(data.justificacion !== undefined && { justification: data.justificacion }),
          },
        });

        return reply.status(201).send(cpvRecomendado);
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // PUT /cpv-recomendados/:id - Update
  fastify.put(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["CpvRecomendado"],
        description: "Update CPV recomendado by ID",
        params: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
          },
          required: ["id"],
        },
        body: cpvRecomendadoSchema,
        response: {
          500: { type: "object", properties: { error: { type: "string" } } },
          200: cpvRecomendadoResponseSchema,
          404: {
            type: "object",
            properties: {
              error: { type: "string" },
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
        const { id } = request.params as { id: string };
        const data = request.body as {
          expedienteId: string;
          codigo: string;
          descripcion: string;
          puntuacion?: number;
          justificacion?: string;
        };

        // Check if CPV recomendado exists
        const existingCpvRecomendado = await prisma.recommendedCpv.findUnique({
          where: { id },
        });

        if (!existingCpvRecomendado) {
          return reply.status(404).send({ error: "CPV recomendado not found" });
        }

        // Verify expediente exists
        const expediente = await prisma.case.findUnique({
          where: { id: data.expedienteId },
        });

        if (!expediente) {
          return reply.status(400).send({ error: "Expediente not found" });
        }

        const cpvRecomendado = await prisma.recommendedCpv.update({
          where: { id },
          data: {
            caseId: data.expedienteId,
            code: data.codigo,
            description: data.descripcion,
            ...(data.puntuacion !== undefined && { score: data.puntuacion }),
            ...(data.justificacion !== undefined && { justification: data.justificacion }),
          },
        });

        return reply.status(200).send(cpvRecomendado);
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // DELETE /cpv-recomendados/:id - Delete
  fastify.delete(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["CpvRecomendado"],
        description: "Delete CPV recomendado by ID",
        params: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
          },
          required: ["id"],
        },
        response: {
          400: { type: "object", properties: { error: { type: "string" } } },
          500: { type: "object", properties: { error: { type: "string" } } },
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

        // Check if CPV recomendado exists
        const existingCpvRecomendado = await prisma.recommendedCpv.findUnique({
          where: { id },
        });

        if (!existingCpvRecomendado) {
          return reply.status(404).send({ error: "CPV recomendado not found" });
        }

        await prisma.recommendedCpv.delete({
          where: { id },
        });

        return reply
          .status(200)
          .send({ message: "CPV recomendado deleted successfully" });
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );
};

export default routes;
