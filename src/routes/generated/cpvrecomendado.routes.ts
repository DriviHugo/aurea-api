import type { FastifyPluginAsync } from 'fastify';
import type { PrismaClient } from '@prisma/client';

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // List CPV Recomendados with pagination
  fastify.get('/', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['CPV Recomendados'],
      description: 'Get paginated list of CPV Recomendados',
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
          expedienteId: { type: 'string', format: 'uuid' }
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
                  expedienteId: { type: 'string', format: 'uuid' },
                  codigo: { type: 'string' },
                  descripcion: { type: 'string' },
                  puntuacion: { type: ['integer', 'null'] },
                  justificacion: { type: ['string', 'null'] },
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
      const { page = 1, limit = 10, expedienteId } = request.query as any;
      const skip = (page - 1) * limit;

      const where = expedienteId ? { expedienteId } : {};

      const [data, total] = await Promise.all([
        prisma.cpvRecomendado.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.cpvRecomendado.count({ where })
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

  // Get CPV Recomendado by ID
  fastify.get('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['CPV Recomendados'],
      description: 'Get CPV Recomendado by ID',
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
            expedienteId: { type: 'string', format: 'uuid' },
            codigo: { type: 'string' },
            descripcion: { type: 'string' },
            puntuacion: { type: ['integer', 'null'] },
            justificacion: { type: ['string', 'null'] },
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

      const cpvRecomendado = await prisma.cpvRecomendado.findUnique({
        where: { id }
      });

      if (!cpvRecomendado) {
        return reply.status(404).send({ error: 'CPV Recomendado not found' });
      }

      return reply.status(200).send(cpvRecomendado);
    } catch (error) {
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Create CPV Recomendado
  fastify.post('/', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['CPV Recomendados'],
      description: 'Create new CPV Recomendado',
      body: {
        type: 'object',
        required: ['expedienteId', 'codigo', 'descripcion'],
        properties: {
          expedienteId: { type: 'string', format: 'uuid' },
          codigo: { type: 'string', minLength: 1 },
          descripcion: { type: 'string', minLength: 1 },
          puntuacion: { type: ['integer', 'null'] },
          justificacion: { type: ['string', 'null'] }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            expedienteId: { type: 'string', format: 'uuid' },
            codigo: { type: 'string' },
            descripcion: { type: 'string' },
            puntuacion: { type: ['integer', 'null'] },
            justificacion: { type: ['string', 'null'] },
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
      const data = request.body as {
        expedienteId: string;
        codigo: string;
        descripcion: string;
        puntuacion?: number | null;
        justificacion?: string | null;
      };

      // Verify expediente exists
      const expediente = await prisma.expediente.findUnique({
        where: { id: data.expedienteId }
      });

      if (!expediente) {
        return reply.status(400).send({ error: 'Expediente not found' });
      }

      const cpvRecomendado = await prisma.cpvRecomendado.create({
        data
      });

      return reply.status(201).send(cpvRecomendado);
    } catch (error) {
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Update CPV Recomendado
  fastify.put('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['CPV Recomendados'],
      description: 'Update CPV Recomendado by ID',
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
          expedienteId: { type: 'string', format: 'uuid' },
          codigo: { type: 'string', minLength: 1 },
          descripcion: { type: 'string', minLength: 1 },
          puntuacion: { type: ['integer', 'null'] },
          justificacion: { type: ['string', 'null'] }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            expedienteId: { type: 'string', format: 'uuid' },
            codigo: { type: 'string' },
            descripcion: { type: 'string' },
            puntuacion: { type: ['integer', 'null'] },
            justificacion: { type: ['string', 'null'] },
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
      const data = request.body as {
        expedienteId?: string;
        codigo?: string;
        descripcion?: string;
        puntuacion?: number | null;
        justificacion?: string | null;
      };

      const existingCpvRecomendado = await prisma.cpvRecomendado.findUnique({
        where: { id }
      });

      if (!existingCpvRecomendado) {
        return reply.status(404).send({ error: 'CPV Recomendado not found' });
      }

      // Verify expediente exists if expedienteId is being updated
      if (data.expedienteId) {
        const expediente = await prisma.expediente.findUnique({
          where: { id: data.expedienteId }
        });

        if (!expediente) {
          return reply.status(400).send({ error: 'Expediente not found' });
        }
      }

      const cpvRecomendado = await prisma.cpvRecomendado.update({
        where: { id },
        data
      });

      return reply.status(200).send(cpvRecomendado);
    } catch (error) {
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Delete CPV Recomendado
  fastify.delete('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['CPV Recomendados'],
      description: 'Delete CPV Recomendado by ID',
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

      const existingCpvRecomendado = await prisma.cpvRecomendado.findUnique({
        where: { id }
      });

      if (!existingCpvRecomendado) {
        return reply.status(404).send({ error: 'CPV Recomendado not found' });
      }

      await prisma.cpvRecomendado.delete({
        where: { id }
      });

      return reply.status(200).send({ message: 'CPV Recomendado deleted successfully' });
    } catch (error) {
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
};

export default routes;