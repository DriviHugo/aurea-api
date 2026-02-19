import type { FastifyPluginAsync } from "fastify";
import type { PrismaClient } from "@prisma/client";

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // GET /reglas - List reglas with pagination
  fastify.get(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Reglas"],
        description: "Get paginated list of reglas",
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
                    id: { type: "string" },
                    codigo: { type: "string" },
                    nombre: { type: "string" },
                    descripcion: { type: "string" },
                    severidad: { type: "string" },
                    evidenciaId: { type: ["string", "null"] },
                    condicion: { type: "string" },
                    mensaje: { type: "string" },
                    version: { type: "integer" },
                    estado: { type: "string" },
                    aprobadorId: { type: ["string", "null"] },
                    aprobadorRol: { type: ["string", "null"] },
                    fechaAprobacion: { type: ["string", "null"] },
                    createdAt: { type: "string" },
                    updatedAt: { type: "string" },
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

        const [reglas, total] = await Promise.all([
          prisma.rule.findMany({
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
          }),
          prisma.rule.count(),
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
              id: { type: "string" },
              codigo: { type: "string" },
              nombre: { type: "string" },
              descripcion: { type: "string" },
              severidad: { type: "string" },
              evidenciaId: { type: ["string", "null"] },
              condicion: { type: "string" },
              mensaje: { type: "string" },
              version: { type: "integer" },
              estado: { type: "string" },
              aprobadorId: { type: ["string", "null"] },
              aprobadorRol: { type: ["string", "null"] },
              fechaAprobacion: { type: ["string", "null"] },
              createdAt: { type: "string" },
              updatedAt: { type: "string" },
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

        const regla = await prisma.rule.findUnique({
          where: { id },
        });

        if (!regla) {
          return reply.status(404).send({ error: "Regla not found" });
        }

        return reply.status(200).send(regla);
      } catch (error) {
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
        body: {
          type: "object",
          properties: {
            codigo: { type: "string", minLength: 1 },
            nombre: { type: "string", minLength: 1 },
            descripcion: { type: "string", minLength: 1 },
            severidad: {
              type: "string",
              enum: ["BAJA", "MEDIA", "ALTA", "CRITICA"],
            },
            evidenciaId: { type: "string", format: "uuid" },
            condicion: { type: "string", minLength: 1 },
            mensaje: { type: "string", minLength: 1 },
            version: { type: "integer", minimum: 1 },
            estado: { type: "string" },
            aprobadorId: { type: "string", format: "uuid" },
            aprobadorRol: {
              type: "string",
              enum: ["ADMIN", "AUDITOR", "USUARIO"],
            },
            fechaAprobacion: { type: "string", format: "date-time" },
          },
          required: [
            "codigo",
            "nombre",
            "descripcion",
            "severidad",
            "condicion",
            "mensaje",
          ],
        },
        response: {
          201: {
            type: "object",
            properties: {
              id: { type: "string" },
              codigo: { type: "string" },
              nombre: { type: "string" },
              descripcion: { type: "string" },
              severidad: { type: "string" },
              evidenciaId: { type: ["string", "null"] },
              condicion: { type: "string" },
              mensaje: { type: "string" },
              version: { type: "integer" },
              estado: { type: "string" },
              aprobadorId: { type: ["string", "null"] },
              aprobadorRol: { type: ["string", "null"] },
              fechaAprobacion: { type: ["string", "null"] },
              createdAt: { type: "string" },
              updatedAt: { type: "string" },
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
        const data = request.body as {
          codigo: string;
          nombre: string;
          descripcion: string;
          severidad: string;
          evidenciaId?: string;
          condicion: string;
          mensaje: string;
          version?: number;
          estado?: string;
          aprobadorId?: string;
          aprobadorRol?: string;
          fechaAprobacion?: string;
        };

        const regla = await prisma.rule.create({
          data: {
            codigo: data.codigo,
            nombre: data.nombre,
            descripcion: data.descripcion,
            severidad: data.severidad as any,
            evidenciaId: data.evidenciaId,
            condicion: data.condicion,
            mensaje: data.mensaje,
            version: data.version,
            estado: data.estado,
            aprobadorId: data.aprobadorId,
            aprobadorRol: data.aprobadorRol as any,
            fechaAprobacion: data.fechaAprobacion
              ? new Date(data.fechaAprobacion)
              : null,
          },
        });

        return reply.status(201).send(regla);
      } catch (error: any) {
        if (error.code === "P2002") {
          return reply.status(400).send({ error: "Codigo already exists" });
        }
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
            codigo: { type: "string", minLength: 1 },
            nombre: { type: "string", minLength: 1 },
            descripcion: { type: "string", minLength: 1 },
            severidad: {
              type: "string",
              enum: ["BAJA", "MEDIA", "ALTA", "CRITICA"],
            },
            evidenciaId: { type: ["string", "null"], format: "uuid" },
            condicion: { type: "string", minLength: 1 },
            mensaje: { type: "string", minLength: 1 },
            version: { type: "integer", minimum: 1 },
            estado: { type: "string" },
            aprobadorId: { type: ["string", "null"], format: "uuid" },
            aprobadorRol: {
              type: ["string", "null"],
              enum: ["ADMIN", "AUDITOR", "USUARIO"],
            },
            fechaAprobacion: { type: ["string", "null"], format: "date-time" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              id: { type: "string" },
              codigo: { type: "string" },
              nombre: { type: "string" },
              descripcion: { type: "string" },
              severidad: { type: "string" },
              evidenciaId: { type: ["string", "null"] },
              condicion: { type: "string" },
              mensaje: { type: "string" },
              version: { type: "integer" },
              estado: { type: "string" },
              aprobadorId: { type: ["string", "null"] },
              aprobadorRol: { type: ["string", "null"] },
              fechaAprobacion: { type: ["string", "null"] },
              createdAt: { type: "string" },
              updatedAt: { type: "string" },
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
        const data = request.body as {
          codigo?: string;
          nombre?: string;
          descripcion?: string;
          severidad?: string;
          evidenciaId?: string | null;
          condicion?: string;
          mensaje?: string;
          version?: number;
          estado?: string;
          aprobadorId?: string | null;
          aprobadorRol?: string | null;
          fechaAprobacion?: string | null;
        };

        const existingRegla = await prisma.rule.findUnique({
          where: { id },
        });

        if (!existingRegla) {
          return reply.status(404).send({ error: "Regla not found" });
        }

        const regla = await prisma.rule.update({
          where: { id },
          data: {
            codigo: data.codigo,
            nombre: data.nombre,
            descripcion: data.descripcion,
            severidad: data.severidad as any,
            evidenciaId: data.evidenciaId,
            condicion: data.condicion,
            mensaje: data.mensaje,
            version: data.version,
            estado: data.estado,
            aprobadorId: data.aprobadorId,
            aprobadorRol: data.aprobadorRol as any,
            fechaAprobacion: data.fechaAprobacion
              ? new Date(data.fechaAprobacion)
              : null,
          },
        });

        return reply.status(200).send(regla);
      } catch (error: any) {
        if (error.code === "P2002") {
          return reply.status(400).send({ error: "Codigo already exists" });
        }
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

        const existingRegla = await prisma.rule.findUnique({
          where: { id },
        });

        if (!existingRegla) {
          return reply.status(404).send({ error: "Regla not found" });
        }

        await prisma.rule.delete({
          where: { id },
        });

        return reply
          .status(200)
          .send({ message: "Regla deleted successfully" });
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );
};

export default routes;
