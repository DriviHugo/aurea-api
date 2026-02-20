import type { FastifyPluginAsync } from "fastify";
import type { PrismaClient } from "@prisma/client";

const auditLogSchema = {
  type: "object",
  properties: {
    caseId: { type: "string", format: "uuid", nullable: true },
    userId: { type: "string", format: "uuid", nullable: true },
    action: { type: "string", minLength: 1 },
    entity: { type: "string", minLength: 1 },
    entityId: { type: "string", format: "uuid", nullable: true },
    previousData: { type: "object", nullable: true },
    newData: { type: "object", nullable: true },
    ipAddress: { type: "string", nullable: true },
  },
  required: ["action", "entity"],
};

const auditLogResponseSchema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    caseId: { type: "string", format: "uuid", nullable: true },
    userId: { type: "string", format: "uuid", nullable: true },
    action: { type: "string" },
    entity: { type: "string" },
    entityId: { type: "string", format: "uuid", nullable: true },
    previousData: { type: "object", nullable: true },
    newData: { type: "object", nullable: true },
    ipAddress: { type: "string", nullable: true },
    createdAt: { type: "string", format: "date-time" },
  },
};

const paginationQuerySchema = {
  type: "object",
  properties: {
    page: { type: "integer", minimum: 1, default: 1 },
    limit: { type: "integer", minimum: 1, maximum: 100, default: 10 },
    caseId: { type: "string", format: "uuid" },
    userId: { type: "string", format: "uuid" },
    entity: { type: "string" },
    action: { type: "string" },
  },
};

const idParamSchema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
  },
  required: ["id"],
};

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // GET /audit-logs - List audit logs with pagination and filters
  fastify.get(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["AuditLog"],
        description: "Get paginated list of audit logs",
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
        },
      },
    },
    async (request, reply) => {
      try {
        const {
          page = 1,
          limit = 10,
          caseId,
          userId,
          entity,
          action,
        } = request.query as any;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (caseId) where.caseId = caseId;
        if (userId) where.userId = userId;
        if (entity) where.entity = { contains: entity, mode: "insensitive" };
        if (action) where.action = { contains: action, mode: "insensitive" };

        const [auditLogs, total] = await Promise.all([
          prisma.auditLog.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
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
        tags: ["AuditLog"],
        description: "Get audit log by ID",
        params: idParamSchema,
        response: {
          200: auditLogResponseSchema,
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

        const auditLog = await prisma.auditLog.findUnique({
          where: { id },
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
        tags: ["AuditLog"],
        description: "Create new audit log",
        body: auditLogSchema,
        response: {
          201: auditLogResponseSchema,
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

        // Validate foreign key references if provided
        if (data.caseId) {
          const caseRecord = await prisma.case.findUnique({
            where: { id: data.caseId },
          });
          if (!caseRecord) {
            return reply.status(400).send({ error: "Case not found" });
          }
        }

        if (data.userId) {
          const user = await prisma.profile.findUnique({
            where: { id: data.userId },
          });
          if (!user) {
            return reply.status(400).send({ error: "User not found" });
          }
        }

        const auditLog = await prisma.auditLog.create({
          data,
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
        tags: ["AuditLog"],
        description: "Update audit log by ID",
        params: idParamSchema,
        body: {
          type: "object",
          properties: {
            caseId: { type: "string", format: "uuid", nullable: true },
            userId: { type: "string", format: "uuid", nullable: true },
            action: { type: "string", minLength: 1 },
            entity: { type: "string", minLength: 1 },
            entityId: { type: "string", format: "uuid", nullable: true },
            previousData: { type: "object", nullable: true },
            newData: { type: "object", nullable: true },
            ipAddress: { type: "string", nullable: true },
          },
        },
        response: {
          200: auditLogResponseSchema,
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
        const data = request.body as any;

        const existingAuditLog = await prisma.auditLog.findUnique({
          where: { id },
        });

        if (!existingAuditLog) {
          return reply.status(404).send({ error: "Audit log not found" });
        }

        // Validate foreign key references if provided
        if (data.caseId) {
          const caseRecord = await prisma.case.findUnique({
            where: { id: data.caseId },
          });
          if (!caseRecord) {
            return reply.status(400).send({ error: "Case not found" });
          }
        }

        if (data.userId) {
          const user = await prisma.profile.findUnique({
            where: { id: data.userId },
          });
          if (!user) {
            return reply.status(400).send({ error: "User not found" });
          }
        }

        const auditLog = await prisma.auditLog.update({
          where: { id },
          data,
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
        tags: ["AuditLog"],
        description: "Delete audit log by ID",
        params: idParamSchema,
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
