import type { FastifyPluginAsync } from 'fastify';
import type { PrismaClient } from '@prisma/client';

const validacionEvidenciaSchema = {
  type: 'object',
  properties: {
    validacionId: { type: 'string', format: 'uuid' },
    evidenciaId: { type: 'string', format: 'uuid' }
  },
  required: ['validacionId', 'evidenciaId'],
  additionalProperties: false
};

const paginationSchema = {
  type: 'object',
  properties: {
    page: { type: 'integer', minimum: 1, default: 1 },
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 }
  }
};

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // GET /validaciones-evidencias - List all with pagination
  fastify.get('/', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['ValidacionEvidencia'],
      description: 'Get all validacion evidencias with pagination',
      querystring: paginationSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  validacionId: { type: 'string' },
                  evidenciaId: { type: 'string' },
                  createdAt: { type: 'string', format: 'date-time' },
                  validacion: { type: 'object' },
                  evidencia: { type: 'object' }
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
      const { page = 1, limit = 10 } = request.query as { page?: number; limit?: number };
      const skip = (page - 1) * limit;

      const [data, total] = await Promise.all([
        prisma.validacionEvidencia.findMany({
          skip,
          take: limit,
          include: {
            validacion: true,
            evidencia: true
          },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.validacionEvidencia.count()
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

  // GET /validaciones-evidencias/:id - Get by ID
  fastify.get('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['ValidacionEvidencia'],
      description: 'Get validacion evidencia by ID',
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
            id: { type: 'string' },
            validacionId: { type: 'string' },
            evidenciaId: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            validacion: { type: 'object' },
            evidencia: { type: 'object' }
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
        where: { id },
        include: {
          validacion: true,
          evidencia: true
        }
      });

      if (!validacionEvidencia) {
        return reply.status(404).send({ error: 'ValidacionEvidencia not found' });
      }

      return reply.status(200).send(validacionEvidencia);
    } catch (error) {
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // POST /validaciones-evidencias - Create new
  fastify.post('/', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['ValidacionEvidencia'],
      description: 'Create new validacion evidencia',
      body: validacionEvidenciaSchema,
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            validacionId: { type: 'string' },
            evidenciaId: { type: 'string' },
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

  // PUT /validaciones-evidencias/:id - Update
  fastify.put('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['ValidacionEvidencia'],
      description: 'Update validacion evidencia by ID',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      body: validacionEvidenciaSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            validacionId: { type: 'string' },
            evidenciaId: { type: 'string' },
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
        validacionId: string;
        evidenciaId: string;
      };

      const existingValidacionEvidencia = await prisma.validacionEvidencia.findUnique({
        where: { id }
      });

      if (!existingValidacionEvidencia) {
        return reply.status(404).send({ error: 'ValidacionEvidencia not found' });
      }

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

      const validacionEvidencia = await prisma.validacionEvidencia.update({
        where: { id },
        data: {
          validacionId,
          evidenciaId
        }
      });

      return reply.status(200).send(validacionEvidencia);
    } catch (error: any) {
      if (error.code === 'P2002') {
        return reply.status(400).send({ error: 'ValidacionEvidencia already exists' });
      }
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // DELETE /validaciones-evidencias/:id - Delete
  fastify.delete('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['ValidacionEvidencia'],
      description: 'Delete validacion evidencia by ID',
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