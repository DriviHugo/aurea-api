import type { FastifyPluginAsync } from "fastify";
import type { PrismaClient } from "@prisma/client";

const incidenciaSchema = {
  type: "object",
  properties: {
    usuarioId: { type: "string", format: "uuid" },
    ubicacion: { type: "string", minLength: 1 },
    funcionalidad: { type: "string", minLength: 1 },
    descripcion: { type: "string", minLength: 1 },
    comportamientoEsperado: { type: "string", minLength: 1 },
    screenshotUrl: { type: "string", nullable: true },
    estado: {
      type: "string",
      enum: ["pendiente", "en_proceso", "resuelto", "cerrado"],
    },
  },
  required: [
    "usuarioId",
    "ubicacion",
    "funcionalidad",
    "descripcion",
    "comportamientoEsperado",
  ],
};

const incidenciaResponseSchema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    usuarioId: { type: "string", format: "uuid" },
    ubicacion: { type: "string" },
    funcionalidad: { type: "string" },
    descripcion: { type: "string" },
    comportamientoEsperado: { type: "string" },
    screenshotUrl: { type: "string", nullable: true },
    estado: { type: "string" },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
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

  // GET /incidencias - List with pagination
  fastify.get(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Incidencias"],
        description: "Get all incidencias with pagination",
        querystring: paginationQuerySchema,
        response: {
          200: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: incidenciaResponseSchema,
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

        const [incidencias, total] = await Promise.all([
          prisma.issue.findMany({
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
          }),
          prisma.issue.count(),
        ]);

        const totalPages = Math.ceil(total / limit);

        return reply.status(200).send({
          data: incidencias,
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

  // GET /incidencias/:id - Get by ID
  fastify.get(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Incidencias"],
        description: "Get incidencia by ID",
        params: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
          },
          required: ["id"],
        },
        response: {
          200: incidenciaResponseSchema,
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

        const incidencia = await prisma.issue.findUnique({
          where: { id },
        });

        if (!incidencia) {
          return reply.status(404).send({ error: "Incidencia not found" });
        }

        return reply.status(200).send(incidencia);
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // POST /incidencias - Create
  fastify.post(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Incidencias"],
        description: "Create new incidencia",
        body: incidenciaSchema,
        response: {
          201: incidenciaResponseSchema,
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
          usuarioId: string;
          ubicacion: string;
          funcionalidad: string;
          descripcion: string;
          comportamientoEsperado: string;
          screenshotUrl?: string;
          estado?: string;
        };

        // Verify user exists
        const userExists = await prisma.profile.findUnique({
          where: { id: data.usuarioId },
        });

        if (!userExists) {
          return reply.status(400).send({ error: "User not found" });
        }

        const incidencia = await prisma.issue.create({
          data: {
            ...data,
            estado: data.estado || "pendiente",
          },
        });

        return reply.status(201).send(incidencia);
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // PUT /incidencias/:id - Update
  fastify.put(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Incidencias"],
        description: "Update incidencia by ID",
        params: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
          },
          required: ["id"],
        },
        body: {
          type: "object",
          properties: {
            ubicacion: { type: "string", minLength: 1 },
            funcionalidad: { type: "string", minLength: 1 },
            descripcion: { type: "string", minLength: 1 },
            comportamientoEsperado: { type: "string", minLength: 1 },
            screenshotUrl: { type: "string", nullable: true },
            estado: {
              type: "string",
              enum: ["pendiente", "en_proceso", "resuelto", "cerrado"],
            },
          },
        },
        response: {
          200: incidenciaResponseSchema,
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
          ubicacion?: string;
          funcionalidad?: string;
          descripcion?: string;
          comportamientoEsperado?: string;
          screenshotUrl?: string;
          estado?: string;
        };

        const existingIncidencia = await prisma.issue.findUnique({
          where: { id },
        });

        if (!existingIncidencia) {
          return reply.status(404).send({ error: "Incidencia not found" });
        }

        const incidencia = await prisma.issue.update({
          where: { id },
          data,
        });

        return reply.status(200).send(incidencia);
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // DELETE /incidencias/:id - Delete
  fastify.delete(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Incidencias"],
        description: "Delete incidencia by ID",
        params: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
          },
          required: ["id"],
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

        const existingIncidencia = await prisma.issue.findUnique({
          where: { id },
        });

        if (!existingIncidencia) {
          return reply.status(404).send({ error: "Incidencia not found" });
        }

        await prisma.issue.delete({
          where: { id },
        });

        return reply
          .status(200)
          .send({ message: "Incidencia deleted successfully" });
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );
};

export default routes;
