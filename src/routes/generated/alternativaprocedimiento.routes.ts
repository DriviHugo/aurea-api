import type { FastifyPluginAsync } from "fastify";
import type { PrismaClient } from "@prisma/client";

interface PaginationQuery {
  page?: number;
  limit?: number;
}

interface AlternativaProcedimientoBody {
  expedienteId: string;
  procedimiento: string;
  puntuacion?: number;
  justificacion: string;
}

interface AlternativaProcedimientoParams {
  id: string;
}

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // GET /alternativas-procedimiento - List with pagination
  fastify.get<{
    Querystring: PaginationQuery;
  }>(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["AlternativaProcedimiento"],
        description: "Get paginated list of alternativas procedimiento",
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
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string", format: "uuid" },
                    expedienteId: { type: "string", format: "uuid" },
                    procedimiento: { type: "string" },
                    puntuacion: { type: ["integer", "null"] },
                    justificacion: { type: "string" },
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
        const { page = 1, limit = 10 } = request.query;
        const skip = (page - 1) * limit;

        const [data, total] = await Promise.all([
          prisma.alternativaProcedimiento.findMany({
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
          }),
          prisma.alternativaProcedimiento.count(),
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

  // GET /alternativas-procedimiento/:id - Get by ID
  fastify.get<{
    Params: AlternativaProcedimientoParams;
  }>(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["AlternativaProcedimiento"],
        description: "Get alternativa procedimiento by ID",
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
              procedimiento: { type: "string" },
              puntuacion: { type: ["integer", "null"] },
              justificacion: { type: "string" },
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
        const { id } = request.params;

        const alternativaProcedimiento =
          await prisma.alternativaProcedimiento.findUnique({
            where: { id },
          });

        if (!alternativaProcedimiento) {
          return reply
            .status(404)
            .send({ error: "Alternativa procedimiento not found" });
        }

        return reply.status(200).send(alternativaProcedimiento);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // POST /alternativas-procedimiento - Create new
  fastify.post<{
    Body: AlternativaProcedimientoBody;
  }>(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["AlternativaProcedimiento"],
        description: "Create new alternativa procedimiento",
        body: {
          type: "object",
          required: ["expedienteId", "procedimiento", "justificacion"],
          properties: {
            expedienteId: { type: "string", format: "uuid" },
            procedimiento: {
              type: "string",
              enum: ["ORDINARIO", "ABREVIADO", "SUMARIO", "ESPECIAL"],
            },
            puntuacion: { type: "integer", minimum: 0 },
            justificacion: { type: "string", minLength: 1, maxLength: 1000 },
          },
        },
        response: {
          201: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              expedienteId: { type: "string", format: "uuid" },
              procedimiento: { type: "string" },
              puntuacion: { type: ["integer", "null"] },
              justificacion: { type: "string" },
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
        const { expedienteId, procedimiento, puntuacion, justificacion } =
          request.body;

        // Verify expediente exists
        const expediente = await prisma.expediente.findUnique({
          where: { id: expedienteId },
        });

        if (!expediente) {
          return reply.status(400).send({ error: "Expediente not found" });
        }

        const alternativaProcedimiento =
          await prisma.alternativaProcedimiento.create({
            data: {
              expedienteId,
              procedimiento: procedimiento as any,
              puntuacion,
              justificacion,
            },
          });

        return reply.status(201).send(alternativaProcedimiento);
      } catch (error) {
        fastify.log.error(error);
        if (error.code === "P2002") {
          return reply.status(400).send({ error: "Duplicate entry" });
        }
        if (error.code === "P2003") {
          return reply
            .status(400)
            .send({ error: "Foreign key constraint failed" });
        }
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // PUT /alternativas-procedimiento/:id - Update by ID
  fastify.put<{
    Params: AlternativaProcedimientoParams;
    Body: Partial<AlternativaProcedimientoBody>;
  }>(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["AlternativaProcedimiento"],
        description: "Update alternativa procedimiento by ID",
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
            procedimiento: {
              type: "string",
              enum: ["ORDINARIO", "ABREVIADO", "SUMARIO", "ESPECIAL"],
            },
            puntuacion: { type: ["integer", "null"], minimum: 0 },
            justificacion: { type: "string", minLength: 1, maxLength: 1000 },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              expedienteId: { type: "string", format: "uuid" },
              procedimiento: { type: "string" },
              puntuacion: { type: ["integer", "null"] },
              justificacion: { type: "string" },
              createdAt: { type: "string", format: "date-time" },
            },
          },
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
        const { id } = request.params;
        const updateData = request.body;

        // Check if alternativa procedimiento exists
        const existingAlternativaProcedimiento =
          await prisma.alternativaProcedimiento.findUnique({
            where: { id },
          });

        if (!existingAlternativaProcedimiento) {
          return reply
            .status(404)
            .send({ error: "Alternativa procedimiento not found" });
        }

        // If expedienteId is being updated, verify it exists
        if (updateData.expedienteId) {
          const expediente = await prisma.expediente.findUnique({
            where: { id: updateData.expedienteId },
          });

          if (!expediente) {
            return reply.status(400).send({ error: "Expediente not found" });
          }
        }

        const updatedAlternativaProcedimiento =
          await prisma.alternativaProcedimiento.update({
            where: { id },
            data: {
              ...updateData,
              procedimiento: updateData.procedimiento as any,
            },
          });

        return reply.status(200).send(updatedAlternativaProcedimiento);
      } catch (error) {
        fastify.log.error(error);
        if (error.code === "P2002") {
          return reply.status(400).send({ error: "Duplicate entry" });
        }
        if (error.code === "P2003") {
          return reply
            .status(400)
            .send({ error: "Foreign key constraint failed" });
        }
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // DELETE /alternativas-procedimiento/:id - Delete by ID
  fastify.delete<{
    Params: AlternativaProcedimientoParams;
  }>(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["AlternativaProcedimiento"],
        description: "Delete alternativa procedimiento by ID",
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
        const { id } = request.params;

        // Check if alternativa procedimiento exists
        const existingAlternativaProcedimiento =
          await prisma.alternativaProcedimiento.findUnique({
            where: { id },
          });

        if (!existingAlternativaProcedimiento) {
          return reply
            .status(404)
            .send({ error: "Alternativa procedimiento not found" });
        }

        await prisma.alternativaProcedimiento.delete({
          where: { id },
        });

        return reply
          .status(200)
          .send({ message: "Alternativa procedimiento deleted successfully" });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );
};

export default routes;
