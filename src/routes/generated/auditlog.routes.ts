import type { FastifyPluginAsync } from "fastify";
import type { PrismaClient } from "@prisma/client";

const auditLogBodySchema = {
  type: "object",
  properties: {
    expedienteId: { type: "string", format: "uuid", nullable: true },
    usuarioId: { type: "string", format: "uuid", nullable: true },
    accion: { type: "string", minLength: 1, maxLength: 255 },
    entidad: { type: "string", minLength: 1, maxLength: 255 },
    entidadId: { type: "string", format: "uuid", nullable: true },
    datosAnteriores: { type: "object", nullable: true },
    datosNuevos: { type: "object", nullable: true },
    ipAddress: { type: "string", nullable: true },
  },
  required: ["accion", "entidad"],
  additionalProperties: false,
};

const auditLogResponseSchema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    expedienteId: { type: "string", format: "uuid", nullable: true },
    usuarioId: { type: "string", format: "uuid", nullable: true },
    accion: { type: "string" },
    entidad: { type: "string" },
    entidadId: { type: "string", format: "uuid", nullable: true },
    datosAnteriores: { type: "object", nullable: true },
    datosNuevos: { type: "object", nullable: true },
    ipAddress: { type: "string", nullable: true },
    createdAt: { type: "string", format: "date-time" },
  },
};

const paginationQuerySchema = {
  type: "object",
  properties: {
    page: { type: "integer", minimum: 1, default: 1 },
    limit: { type: "integer", minimum: 1, maximum: 100, default: 10 },
    expedienteId: { type: "string", format: "uuid" },
    usuarioId: { type: "string", format: "uuid" },
    accion: { type: "string" },
    entidad: { type: "string" },
  },
  additionalProperties: false,
};

const idParamsSchema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
  },
  required: ["id"],
  additionalProperties: false,
};

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // GET /audit-logs - List audit logs with pagination and filters
  fastify.get(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Audit Logs"],
        description: "Get paginated list of audit logs with optional filters",
        querystring: paginationQuerySchema,
        response: {
          200: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: auditLogResponseSchema,
              },
              total: { type: "integer" },
              page: { type: "integer" },
              limit: { type: "integer" },
              totalPages: { type: "integer" },
            },
          },
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
        const {
          page = 1,
          limit = 10,
          expedienteId,
          usuarioId,
          accion,
          entidad,
        } = request.query as any;

        const skip = (page - 1) * limit;

        const where: any = {};
        if (expedienteId) where.expedienteId = expedienteId;
        if (usuarioId) where.usuarioId = usuarioId;
        if (accion) where.accion = { contains: accion, mode: "insensitive" };
        if (entidad) where.entidad = { contains: entidad, mode: "insensitive" };

        const [auditLogs, total] = await Promise.all([
          prisma.auditLog.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
            include: {
              expediente: {
                select: {
                  id: true,
                  numero: true,
                },
              },
            },
          }),
          prisma.auditLog.count({ where }),
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
        params: idParamsSchema,
        response: {
          200: auditLogResponseSchema,
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
                numero: true,
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
        description: "Create a new audit log",
        body: auditLogBodySchema,
        response: {
          201: auditLogResponseSchema,
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
        const data = request.body as any;

        // Validate expediente exists if expedienteId is provided
        if (data.expedienteId) {
          const expediente = await prisma.expediente.findUnique({
            where: { id: data.expedienteId },
          });
          if (!expediente) {
            return reply.status(400).send({ error: "Expediente not found" });
          }
        }

        const auditLog = await prisma.auditLog.create({
          data: {
            expedienteId: data.expedienteId,
            usuarioId: data.usuarioId,
            accion: data.accion,
            entidad: data.entidad,
            entidadId: data.entidadId,
            datosAnteriores: data.datosAnteriores,
            datosNuevos: data.datosNuevos,
            ipAddress: data.ipAddress || request.ip,
          },
          include: {
            expediente: {
              select: {
                id: true,
                numero: true,
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
        params: idParamsSchema,
        body: {
          type: "object",
          properties: {
            expedienteId: { type: "string", format: "uuid", nullable: true },
            usuarioId: { type: "string", format: "uuid", nullable: true },
            accion: { type: "string", minLength: 1, maxLength: 255 },
            entidad: { type: "string", minLength: 1, maxLength: 255 },
            entidadId: { type: "string", format: "uuid", nullable: true },
            datosAnteriores: { type: "object", nullable: true },
            datosNuevos: { type: "object", nullable: true },
            ipAddress: { type: "string", nullable: true },
          },
          additionalProperties: false,
        },
        response: {
          200: auditLogResponseSchema,
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
        const data = request.body as any;

        // Check if audit log exists
        const existingAuditLog = await prisma.auditLog.findUnique({
          where: { id },
        });

        if (!existingAuditLog) {
          return reply.status(404).send({ error: "Audit log not found" });
        }

        // Validate expediente exists if expedienteId is provided
        if (data.expedienteId) {
          const expediente = await prisma.expediente.findUnique({
            where: { id: data.expedienteId },
          });
          if (!expediente) {
            return reply.status(400).send({ error: "Expediente not found" });
          }
        }

        const auditLog = await prisma.auditLog.update({
          where: { id },
          data: {
            expedienteId: data.expedienteId,
            usuarioId: data.usuarioId,
            accion: data.accion,
            entidad: data.entidad,
            entidadId: data.entidadId,
            datosAnteriores: data.datosAnteriores,
            datosNuevos: data.datosNuevos,
            ipAddress: data.ipAddress,
          },
          include: {
            expediente: {
              select: {
                id: true,
                numero: true,
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
