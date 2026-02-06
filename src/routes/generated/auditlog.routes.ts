import type { FastifyPluginAsync } from 'fastify';
import type { PrismaClient } from '@prisma/client';

const auditLogSchema = {
  type: 'object',
  properties: {
    expedienteId: { type: 'string', format: 'uuid', nullable: true },
    usuarioId: { type: 'string', format: 'uuid', nullable: true },
    accion: { type: 'string', minLength: 1 },
    entidad: { type: 'string', minLength: 1 },
    entidadId: { type: 'string', format: 'uuid', nullable: true },
    datosAnteriores: { type: 'object', nullable: true },
    datosNuevos: { type: 'object', nullable: true },
    ipAddress: { type: 'string', nullable: true }
  },
  required: ['accion', 'entidad']
};

const auditLogResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    expedienteId: { type: 'string', format: 'uuid', nullable: true },
    usuarioId: { type: 'string', format: 'uuid', nullable: true },
    accion: { type: 'string' },
    entidad: { type: 'string' },
    entidadId: { type: 'string', format: 'uuid', nullable: true },
    datosAnteriores: { type: 'object', nullable: true },
    datosNuevos: { type: 'object', nullable: true },
    ipAddress: { type: 'string', nullable: true },
    createdAt: { type: 'string', format: 'date-time' }
  }
};

const paginationQuerySchema = {
  type: 'object',
  properties: {
    page: { type: 'integer', minimum: 1, default: 1 },
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 }
  }
};

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // GET /audit-logs - List audit logs with pagination
  fastify.get('/', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['AuditLog'],
      description: 'Get paginated list of audit logs',
      querystring: paginationQuerySchema,
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: auditLogResponseSchema
            },
            total: { type: 'integer' },
            page: { type: 'integer' },
            limit: { type: 'integer' },
            totalPages: { type: 'integer' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { page = 1, limit = 10 } = request.query as { page?: number; limit?: number };
      const skip = (page - 1) * limit;

      const [auditLogs, total] = await Promise.all([
        prisma.auditLog.findMany({
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            expediente: true,
            usuario: true
          }
        }),
        prisma.auditLog.count()
      ]);

      const totalPages = Math.ceil(total / limit);

      return reply.status(200).send({
        data: auditLogs,
        total,
        page,
        limit,
        totalPages
      });
    } catch (error) {
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // GET /audit-logs/:id - Get audit log by ID
  fastify.get('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['AuditLog'],
      description: 'Get audit log by ID',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      response: {
        200: auditLogResponseSchema,
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const auditLog = await prisma.auditLog.findUnique({
        where: { id },
        include: {
          expediente: true,
          usuario: true
        }
      });

      if (!auditLog) {
        return reply.status(404).send({ error: 'Audit log not found' });
      }

      return reply.status(200).send(auditLog);
    } catch (error) {
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // POST /audit-logs - Create new audit log
  fastify.post('/', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['AuditLog'],
      description: 'Create new audit log',
      body: auditLogSchema,
      response: {
        201: auditLogResponseSchema,
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const data = request.body as {
        expedienteId?: string;
        usuarioId?: string;
        accion: string;
        entidad: string;
        entidadId?: string;
        datosAnteriores?: any;
        datosNuevos?: any;
        ipAddress?: string;
      };

      const auditLog = await prisma.auditLog.create({
        data,
        include: {
          expediente: true,
          usuario: true
        }
      });

      return reply.status(201).send(auditLog);
    } catch (error) {
      return reply.status(400).send({ error: 'Failed to create audit log' });
    }
  });

  // PUT /audit-logs/:id - Update audit log
  fastify.put('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['AuditLog'],
      description: 'Update audit log by ID',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      body: auditLogSchema,
      response: {
        200: auditLogResponseSchema,
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = request.body as {
        expedienteId?: string;
        usuarioId?: string;
        accion: string;
        entidad: string;
        entidadId?: string;
        datosAnteriores?: any;
        datosNuevos?: any;
        ipAddress?: string;
      };

      const existingAuditLog = await prisma.auditLog.findUnique({
        where: { id }
      });

      if (!existingAuditLog) {
        return reply.status(404).send({ error: 'Audit log not found' });
      }

      const auditLog = await prisma.auditLog.update({
        where: { id },
        data,
        include: {
          expediente: true,
          usuario: true
        }
      });

      return reply.status(200).send(auditLog);
    } catch (error) {
      return reply.status(400).send({ error: 'Failed to update audit log' });
    }
  });

  // DELETE /audit-logs/:id - Delete audit log
  fastify.delete('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['AuditLog'],
      description: 'Delete audit log by ID',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' }
          }
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const existingAuditLog = await prisma.auditLog.findUnique({
        where: { id }
      });

      if (!existingAuditLog) {
        return reply.status(404).send({ error: 'Audit log not found' });
      }

      await prisma.auditLog.delete({
        where: { id }
      });

      return reply.status(200).send({ message: 'Audit log deleted successfully' });
    } catch (error) {
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
};

export default routes;