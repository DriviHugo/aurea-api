import type { FastifyPluginAsync } from "fastify";
import type { PrismaClient } from "@prisma/client";

const auditLogSchema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    expedienteId: { type: ["string", "null"], format: "uuid" },
    usuarioId: { type: ["string", "null"], format: "uuid" },
    accion: { type: "string", minLength: 1, maxLength: 255 },
    entidad: { type: "string", minLength: 1, maxLength: 255 },
    entidadId: { type: ["string", "null"], format: "uuid" },
    datosAnteriores: { type: ["object", "null"] },
    datosNuevos: { type: ["object", "null"] },
    ipAddress: { type: ["string", "null"], maxLength: 45 },
    createdAt: { type: "string", format: "date-time" },
  },
};

const createAuditLogSchema = {
  type: "object",
  required: ["accion", "entidad"],
  properties: {
    expedienteId: { type: ["string", "null"], format: "uuid" },
    usuarioId: { type: ["string", "null"], format: "uuid" },
    accion: { type: "string", minLength: 1, maxLength: 255 },
    entidad: { type: "string", minLength: 1, maxLength: 255 },
    entidadId: { type: ["string", "null"], format: "uuid" },
    datosAnteriores: { type: ["object", "null"] },
    datosNuevos: { type: ["object", "null"] },
    ipAddress: { type: ["string", "null"], maxLength: 45 },
  },
  additionalProperties: false,
};

const updateAuditLogSchema = {
  type: "object",
  properties: {
    expedienteId: { type: ["string", "null"], format: "uuid" },
    usuarioId: { type: ["string", "null"], format: "uuid" },
    accion: { type: "string", minLength: 1, maxLength: 255 },
    entidad: { type: "string", minLength: 1, maxLength: 255 },
    entidadId: { type: ["string", "null"], format: "uuid" },
    datosAnteriores: { type: ["object", "null"] },
    datosNuevos: { type: ["object", "null"] },
    ipAddress: { type: ["string", "null"], maxLength: 45 },
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

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // GET /audit-logs - List audit logs with pagination
  fastify.get(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Audit Logs"],
        description: "Get paginated list of audit logs",
        querystring: paginationSchema,
        response: {
          200: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: auditLogSchema,
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

        const [auditLogs, total] = await Promise.all([
          prisma.auditLog.findMany({
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
            include: {
              expediente: {
                select: {
                  id: true,
                  numeroExpediente: true,
                },
              },
              usuario: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          }),
          prisma.auditLog.count(),
        ]);

        const totalPages = Math.ceil(total / limit);

        return reply.status(200).send({
          data: auditLogs,
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

  // GET /audit-logs/:id - Get audit log by ID
  fastify.get(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Audit Logs"],
        description: "Get audit log by ID",
        params: paramsSchema,
        response: {
          200: auditLogSchema,
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

        const auditLog = await prisma.auditLog.findUnique({
          where: { id },
          include: {
            expediente: {
              select: {
                id: true,
                numeroExpediente: true,
              },
            },
            usuario: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        });

        if (!auditLog) {
          return reply.status(404).send({ error: "Audit log not found" });
        }

        return reply.status(200).send(auditLog);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // POST /audit-logs - Create new audit log
  fastify.post(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Audit Logs"],
        description: "Create new audit log",
        body: createAuditLogSchema,
        response: {
          201: auditLogSchema,
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
        const data = request.body as {
          expedienteId?: string | null;
          usuarioId?: string | null;
          accion: string;
          entidad: string;
          entidadId?: string | null;
          datosAnteriores?: any;
          datosNuevos?: any;
          ipAddress?: string | null;
        };

        // Validate foreign key references if provided
        if (data.expedienteId) {
          const expediente = await prisma.expediente.findUnique({
            where: { id: data.expedienteId },
          });
          if (!expediente) {
            return reply.status(400).send({ error: "Expediente not found" });
          }
        }

        if (data.usuarioId) {
          const usuario = await prisma.profile.findUnique({
            where: { id: data.usuarioId },
          });
          if (!usuario) {
            return reply.status(400).send({ error: "Usuario not found" });
          }
        }

        const auditLog = await prisma.auditLog.create({
          data,
          include: {
            expediente: {
              select: {
                id: true,
                numeroExpediente: true,
              },
            },
            usuario: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        });

        return reply.status(201).send(auditLog);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // PUT /audit-logs/:id - Update audit log
  fastify.put(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Audit Logs"],
        description: "Update audit log by ID",
        params: paramsSchema,
        body: updateAuditLogSchema,
        response: {
          200: auditLogSchema,
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
        const data = request.body as {
          expedienteId?: string | null;
          usuarioId?: string | null;
          accion?: string;
          entidad?: string;
          entidadId?: string | null;
          datosAnteriores?: any;
          datosNuevos?: any;
          ipAddress?: string | null;
        };

        // Check if audit log exists
        const existingAuditLog = await prisma.auditLog.findUnique({
          where: { id },
        });

        if (!existingAuditLog) {
          return reply.status(404).send({ error: "Audit log not found" });
        }

        // Validate foreign key references if provided
        if (data.expedienteId) {
          const expediente = await prisma.expediente.findUnique({
            where: { id: data.expedienteId },
          });
          if (!expediente) {
            return reply.status(400).send({ error: "Expediente not found" });
          }
        }

        if (data.usuarioId) {
          const usuario = await prisma.profile.findUnique({
            where: { id: data.usuarioId },
          });
          if (!usuario) {
            return reply.status(400).send({ error: "Usuario not found" });
          }
        }

        const auditLog = await prisma.auditLog.update({
          where: { id },
          data,
          include: {
            expediente: {
              select: {
                id: true,
                numeroExpediente: true,
              },
            },
            usuario: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        });

        return reply.status(200).send(auditLog);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // DELETE /audit-logs/:id - Delete audit log
  fastify.delete(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Audit Logs"],
        description: "Delete audit log by ID",
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

        // Check if audit log exists
        const existingAuditLog = await prisma.auditLog.findUnique({
          where: { id },
        });

        if (!existingAuditLog) {
          return reply.status(404).send({ error: "Audit log not found" });
        }

        await prisma.auditLog.delete({
          where: { id },
        });

        return reply
          .status(200)
          .send({ message: "Audit log deleted successfully" });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );
};

export default routes;
