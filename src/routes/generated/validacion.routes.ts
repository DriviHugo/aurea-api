import type { FastifyPluginAsync } from 'fastify';
import type { PrismaClient } from '@prisma/client';

const validacionSchema = {
  type: 'object',
  properties: {
    expedienteId: { type: 'string', format: 'uuid' },
    documentoId: { type: 'string', format: 'uuid', nullable: true },
    reglaId: { type: 'string', format: 'uuid' },
    passed: { type: 'boolean' },
    valorEncontrado: { type: 'string', nullable: true },
    explicacion: { type: 'string' },
    puntuacionEstructura: { type: 'integer', nullable: true },
    puntuacionContenido: { type: 'integer', nullable: true },
    usuarioId: { type: 'string', format: 'uuid' }
  },
  required: ['expedienteId', 'reglaId', 'passed', 'explicacion', 'usuarioId']
};

const validacionResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    expedienteId: { type: 'string', format: 'uuid' },
    documentoId: { type: 'string', format: 'uuid', nullable: true },
    reglaId: { type: 'string', format: 'uuid' },
    passed: { type: 'boolean' },
    valorEncontrado: { type: 'string', nullable: true },
    explicacion: { type: 'string' },
    puntuacionEstructura: { type: 'integer', nullable: true },
    puntuacionContenido: { type: 'integer', nullable: true },
    usuarioId: { type: 'string', format: 'uuid' },
    createdAt: { type: 'string', format: 'date-time' }
  }
};

const paginationQuerySchema = {
  type: 'object',
  properties: {
    page: { type: 'integer', minimum: 1, default: 1 },
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
    expedienteId: { type: 'string', format: 'uuid' },
    documentoId: { type: 'string', format: 'uuid' },
    reglaId: { type: 'string', format: 'uuid' },
    passed: { type: 'boolean' }
  }
};

const idParamSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' }
  },
  required: ['id']
};

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // GET /validaciones - List validaciones with pagination and filters
  fastify.get('/', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['Validaciones'],
      description: 'Get paginated list of validaciones with optional filters',
      querystring: paginationQuerySchema,
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: validacionResponseSchema
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
      const { page = 1, limit = 10, expedienteId, documentoId, reglaId, passed } = request.query as any;
      const skip = (page - 1) * limit;

      const where: any = {};
      if (expedienteId) where.expedienteId = expedienteId;
      if (documentoId) where.documentoId = documentoId;
      if (reglaId) where.reglaId = reglaId;
      if (passed !== undefined) where.passed = passed;

      const [validaciones, total] = await Promise.all([
        prisma.validacion.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            expediente: {
              select: { id: true, numero: true }
            },
            documento: {
              select: { id: true, nombre: true }
            },
            regla: {
              select: { id: true, nombre: true, descripcion: true }
            }
          }
        }),
        prisma.validacion.count({ where })
      ]);

      const totalPages = Math.ceil(total / limit);

      return reply.status(200).send({
        data: validaciones,
        total,
        page,
        limit,
        totalPages
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // GET /validaciones/:id - Get single validacion
  fastify.get('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['Validaciones'],
      description: 'Get a single validacion by ID',
      params: idParamSchema,
      response: {
        200: validacionResponseSchema,
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

      const validacion = await prisma.validacion.findUnique({
        where: { id },
        include: {
          expediente: {
            select: { id: true, numero: true }
          },
          documento: {
            select: { id: true, nombre: true }
          },
          regla: {
            select: { id: true, nombre: true, descripcion: true }
          },
          validacionesEvidencias: {
            include: {
              evidencia: {
                select: { id: true, nombre: true, tipo: true }
              }
            }
          }
        }
      });

      if (!validacion) {
        return reply.status(404).send({ error: 'Validacion not found' });
      }

      return reply.status(200).send(validacion);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // POST /validaciones - Create new validacion
  fastify.post('/', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['Validaciones'],
      description: 'Create a new validacion',
      body: validacionSchema,
      response: {
        201: validacionResponseSchema,
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
      const data = request.body as any;

      // Validate that referenced entities exist
      const [expediente, documento, regla] = await Promise.all([
        prisma.expediente.findUnique({ where: { id: data.expedienteId } }),
        data.documentoId ? prisma.documento.findUnique({ where: { id: data.documentoId } }) : null,
        prisma.regla.findUnique({ where: { id: data.reglaId } })
      ]);

      if (!expediente) {
        return reply.status(400).send({ error: 'Expediente not found' });
      }

      if (data.documentoId && !documento) {
        return reply.status(400).send({ error: 'Documento not found' });
      }

      if (!regla) {
        return reply.status(400).send({ error: 'Regla not found' });
      }

      const validacion = await prisma.validacion.create({
        data,
        include: {
          expediente: {
            select: { id: true, numero: true }
          },
          documento: {
            select: { id: true, nombre: true }
          },
          regla: {
            select: { id: true, nombre: true, descripcion: true }
          }
        }
      });

      return reply.status(201).send(validacion);
    } catch (error) {
      fastify.log.error(error);
      if (error.code === 'P2002') {
        return reply.status(400).send({ error: 'Validation constraint violation' });
      }
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // PUT /validaciones/:id - Update validacion
  fastify.put('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['Validaciones'],
      description: 'Update an existing validacion',
      params: idParamSchema,
      body: {
        type: 'object',
        properties: {
          expedienteId: { type: 'string', format: 'uuid' },
          documentoId: { type: 'string', format: 'uuid', nullable: true },
          reglaId: { type: 'string', format: 'uuid' },
          passed: { type: 'boolean' },
          valorEncontrado: { type: 'string', nullable: true },
          explicacion: { type: 'string' },
          puntuacionEstructura: { type: 'integer', nullable: true },
          puntuacionContenido: { type: 'integer', nullable: true },
          usuarioId: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        200: validacionResponseSchema,
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
      const data = request.body as any;

      // Check if validacion exists
      const existingValidacion = await prisma.validacion.findUnique({
        where: { id }
      });

      if (!existingValidacion) {
        return reply.status(404).send({ error: 'Validacion not found' });
      }

      // Validate referenced entities if they are being updated
      if (data.expedienteId) {
        const expediente = await prisma.expediente.findUnique({
          where: { id: data.expedienteId }
        });
        if (!expediente) {
          return reply.status(400).send({ error: 'Expediente not found' });
        }
      }

      if (data.documentoId) {
        const documento = await prisma.documento.findUnique({
          where: { id: data.documentoId }
        });
        if (!documento) {
          return reply.status(400).send({ error: 'Documento not found' });
        }
      }

      if (data.reglaId) {
        const regla = await prisma.regla.findUnique({
          where: { id: data.reglaId }
        });
        if (!regla) {
          return reply.status(400).send({ error: 'Regla not found' });
        }
      }

      const validacion = await prisma.validacion.update({
        where: { id },
        data,
        include: {
          expediente: {
            select: { id: true, numero: true }
          },
          documento: {
            select: { id: true, nombre: true }
          },
          regla: {
            select: { id: true, nombre: true, descripcion: true }
          }
        }
      });

      return reply.status(200).send(validacion);
    } catch (error) {
      fastify.log.error(error);
      if (error.code === 'P2002') {
        return reply.status(400).send({ error: 'Validation constraint violation' });
      }
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // DELETE /validaciones/:id - Delete validacion
  fastify.delete('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['Validaciones'],
      description: 'Delete a validacion',
      params: idParamSchema,
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

      // Check if validacion exists
      const existingValidacion = await prisma.validacion.findUnique({
        where: { id }
      });

      if (!existingValidacion) {
        return reply.status(404).send({ error: 'Validacion not found' });
      }

      await prisma.validacion.delete({
        where: { id }
      });

      return reply.status(200).send({ message: 'Validacion deleted successfully' });
    } catch (error) {
      fastify.log.error(error);
      if (error.code === 'P2003') {
        return reply.status(400).send({ error: 'Cannot delete validacion due to existing references' });
      }
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // GET /validaciones/expediente/:expedienteId - Get validaciones by expediente
  fastify.get('/expediente/:expedienteId', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['Validaciones'],
      description: 'Get all validaciones for a specific expediente',
      params: {
        type: 'object',
        properties: {
          expedienteId: { type: 'string', format: 'uuid' }
        },
        required: ['expedienteId']
      },
      querystring: {
        type: 'object',
        properties: {
          passed: { type: 'boolean' },
          reglaId: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        200: {
          type: 'array',
          items: validacionResponseSchema
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { expedienteId } = request.params as { expedienteId: string };
      const { passed, reglaId } = request.query as any;

      const where: any = { expedienteId };
      if (passed !== undefined) where.passed = passed;
      if (reglaId) where.reglaId = reglaId;

      const validaciones = await prisma.validacion.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          documento: {
            select: { id: true, nombre: true }
          },
          regla: {
            select: { id: true, nombre: true, descripcion: true, categoria: true }
          }
        }
      });

      return reply.status(200).send(validaciones);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
};

export default routes;