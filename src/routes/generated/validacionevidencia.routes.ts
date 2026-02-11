import type { FastifyPluginAsync } from 'fastify';
import type { PrismaClient } from '@prisma/client';

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // List ValidacionEvidencia with pagination
  fastify.get('/', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['ValidacionEvidencia'],
      description: 'Get paginated list of validacion evidencias',
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
          validacionId: { type: 'string', format: 'uuid' },
          evidenciaId: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  validacionId: { type: 'string', format: 'uuid' },
                  evidenciaId: { type: 'string', format: 'uuid' },
                  createdAt: { type: 'string', format: 'date-time' }
                }
              }
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
      const { page = 1, limit = 10, validacionId, evidenciaId } = request.query as any;
      const skip = (page - 1) * limit;

      const where: any = {};
      if (validacionId) where.validacionId = validacionId;
      if (evidenciaId) where.evidenciaId = evidenciaId;

      const [data, total] = await Promise.all([
        prisma.validacionEvidencia.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.validacionEvidencia.count({ where })
      ]);

      const totalPages = Math.ceil(total / limit);

      return reply.status(200).send({
        data,
        total,
        page,
        limit,
        totalPages
      });
    } catch (error) {
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Get ValidacionEvidencia by ID
  fastify.get('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['ValidacionEvidencia'],
      description: 'Get validacion evidencia by ID',
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            validacionId: { type: 'string', format: 'uuid' },
            evidenciaId: { type: 'string', format: 'uuid' },
            createdAt: { type: 'string', format: 'date-time' }
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

      const validacionEvidencia = await prisma.validacionEvidencia.findUnique({
        where: { id }
      });

      if (!validacionEvidencia) {
        return reply.status(404).send({ error: 'ValidacionEvidencia not found' });
      }

      return reply.status(200).send(validacionEvidencia);
    } catch (error) {
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Create ValidacionEvidencia
  fastify.post('/', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['ValidacionEvidencia'],
      description: 'Create new validacion evidencia',
      body: {
        type: 'object',
        required: ['validacionId', 'evidenciaId'],
        properties: {
          validacionId: { type: 'string', format: 'uuid' },
          evidenciaId: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            validacionId: { type: 'string', format: 'uuid' },
            evidenciaId: { type: 'string', format: 'uuid' },
            createdAt: { type: 'string', format: 'date-time' }
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
      const { validacionId, evidenciaId } = request.body as {
        validacionId: string;
        evidenciaId: string;
      };

      // Check if validacion exists
      const validacion = await prisma.validacion.findUnique({
        where: { id: validacionId }
      });
      if (!validacion) {
        return reply.status(400).send({ error: 'Validacion not found' });
      }

      // Check if evidencia exists
      const evidencia = await prisma.evidencia.findUnique({
        where: { id: evidenciaId }
      });
      if (!evidencia) {
        return reply.status(400).send({ error: 'Evidencia not found' });
      }

      const validacionEvidencia = await prisma.validacionEvidencia.create({
        data: {
          validacionId,
          evidenciaId
        }
      });

      return reply.status(201).send(validacionEvidencia);
    } catch (error: any) {
      if (error.code === 'P2002') {
        return reply.status(400).send({ error: 'ValidacionEvidencia already exists' });
      }
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Update ValidacionEvidencia
  fastify.put('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['ValidacionEvidencia'],
      description: 'Update validacion evidencia by ID',
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      },
      body: {
        type: 'object',
        properties: {
          validacionId: { type: 'string', format: 'uuid' },
          evidenciaId: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            validacionId: { type: 'string', format: 'uuid' },
            evidenciaId: { type: 'string', format: 'uuid' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
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
      const { validacionId, evidenciaId } = request.body as {
        validacionId?: string;
        evidenciaId?: string;
      };

      const existingValidacionEvidencia = await prisma.validacionEvidencia.findUnique({
        where: { id }
      });

      if (!existingValidacionEvidencia) {
        return reply.status(404).send({ error: 'ValidacionEvidencia not found' });
      }

      const updateData: any = {};

      if (validacionId) {
        const validacion = await prisma.validacion.findUnique({
          where: { id: validacionId }
        });
        if (!validacion) {
          return reply.status(400).send({ error: 'Validacion not found' });
        }
        updateData.validacionId = validacionId;
      }

      if (evidenciaId) {
        const evidencia = await prisma.evidencia.findUnique({
          where: { id: evidenciaId }
        });
        if (!evidencia) {
          return reply.status(400).send({ error: 'Evidencia not found' });
        }
        updateData.evidenciaId = evidenciaId;
      }

      const validacionEvidencia = await prisma.validacionEvidencia.update({
        where: { id },
        data: updateData
      });

      return reply.status(200).send(validacionEvidencia);
    } catch (error: any) {
      if (error.code === 'P2002') {
        return reply.status(400).send({ error: 'ValidacionEvidencia already exists' });
      }
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Delete ValidacionEvidencia
  fastify.delete('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['ValidacionEvidencia'],
      description: 'Delete validacion evidencia by ID',
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
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

      const validacionEvidencia = await prisma.validacionEvidencia.findUnique({
        where: { id }
      });

      if (!validacionEvidencia) {
        return reply.status(404).send({ error: 'ValidacionEvidencia not found' });
      }

      await prisma.validacionEvidencia.delete({
        where: { id }
      });

      return reply.status(200).send({ message: 'ValidacionEvidencia deleted successfully' });
    } catch (error) {
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
};

export default routes;