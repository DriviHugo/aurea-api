import type { FastifyPluginAsync } from 'fastify';
import type { PrismaClient } from '@prisma/client';

const cpvRecomendadoSchema = {
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
};

const createCpvRecomendadoSchema = {
  type: 'object',
  required: ['expedienteId', 'codigo', 'descripcion'],
  properties: {
    expedienteId: { type: 'string', format: 'uuid' },
    codigo: { type: 'string', minLength: 1 },
    descripcion: { type: 'string', minLength: 1 },
    puntuacion: { type: 'integer', minimum: 0 },
    justificacion: { type: 'string' }
  },
  additionalProperties: false
};

const updateCpvRecomendadoSchema = {
  type: 'object',
  properties: {
    expedienteId: { type: 'string', format: 'uuid' },
    codigo: { type: 'string', minLength: 1 },
    descripcion: { type: 'string', minLength: 1 },
    puntuacion: { type: 'integer', minimum: 0 },
    justificacion: { type: 'string' }
  },
  additionalProperties: false
};

const paginationSchema = {
  type: 'object',
  properties: {
    page: { type: 'integer', minimum: 1, default: 1 },
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 }
  }
};

const idParamsSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string', format: 'uuid' }
  }
};

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // GET /cpv-recomendados - List with pagination
  fastify.get('/', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['CPV Recomendados'],
      description: 'Get paginated list of CPV recomendados',
      querystring: paginationSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: cpvRecomendadoSchema
            },
            total: { type: 'integer' },
            page: { type: 'integer' },
            limit: { type: 'integer' },
            totalPages: { type: 'integer' }
          }
        },
        500: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { page = 1, limit = 10 } = request.query as { page?: number; limit?: number };
      const skip = (page - 1) * limit;

      const [data, total] = await Promise.all([
        prisma.cpvRecomendado.findMany({
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            expediente: {
              select: {
                id: true,
                numeroExpediente: true
              }
            }
          }
        }),
        prisma.cpvRecomendado.count()
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
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // GET /cpv-recomendados/:id - Get by ID
  fastify.get('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['CPV Recomendados'],
      description: 'Get CPV recomendado by ID',
      params: idParamsSchema,
      response: {
        200: cpvRecomendadoSchema,
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        },
        500: {
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
        where: { id },
        include: {
          expediente: {
            select: {
              id: true,
              numeroExpediente: true
            }
          }
        }
      });

      if (!cpvRecomendado) {
        return reply.status(404).send({ error: 'CPV recomendado not found' });
      }

      return reply.status(200).send(cpvRecomendado);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // POST /cpv-recomendados - Create
  fastify.post('/', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['CPV Recomendados'],
      description: 'Create new CPV recomendado',
      body: createCpvRecomendadoSchema,
      response: {
        201: cpvRecomendadoSchema,
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        },
        500: {
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
        puntuacion?: number;
        justificacion?: string;
      };

      // Verify expediente exists
      const expediente = await prisma.expediente.findUnique({
        where: { id: data.expedienteId }
      });

      if (!expediente) {
        return reply.status(400).send({ error: 'Expediente not found' });
      }

      const cpvRecomendado = await prisma.cpvRecomendado.create({
        data: {
          expedienteId: data.expedienteId,
          codigo: data.codigo,
          descripcion: data.descripcion,
          puntuacion: data.puntuacion,
          justificacion: data.justificacion
        },
        include: {
          expediente: {
            select: {
              id: true,
              numeroExpediente: true
            }
          }
        }
      });

      return reply.status(201).send(cpvRecomendado);
    } catch (error) {
      fastify.log.error(error);
      if (error.code === 'P2002') {
        return reply.status(400).send({ error: 'Duplicate entry' });
      }
      if (error.code === 'P2003') {
        return reply.status(400).send({ error: 'Foreign key constraint failed' });
      }
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // PUT /cpv-recomendados/:id - Update
  fastify.put('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['CPV Recomendados'],
      description: 'Update CPV recomendado by ID',
      params: idParamsSchema,
      body: updateCpvRecomendadoSchema,
      response: {
        200: cpvRecomendadoSchema,
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        },
        500: {
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
        puntuacion?: number;
        justificacion?: string;
      };

      // Check if CPV recomendado exists
      const existingCpvRecomendado = await prisma.cpvRecomendado.findUnique({
        where: { id }
      });

      if (!existingCpvRecomendado) {
        return reply.status(404).send({ error: 'CPV recomendado not found' });
      }

      // If expedienteId is being updated, verify it exists
      if (data.expedienteId && data.expedienteId !== existingCpvRecomendado.expedienteId) {
        const expediente = await prisma.expediente.findUnique({
          where: { id: data.expedienteId }
        });

        if (!expediente) {
          return reply.status(400).send({ error: 'Expediente not found' });
        }
      }

      const cpvRecomendado = await prisma.cpvRecomendado.update({
        where: { id },
        data: {
          ...(data.expedienteId && { expedienteId: data.expedienteId }),
          ...(data.codigo && { codigo: data.codigo }),
          ...(data.descripcion && { descripcion: data.descripcion }),
          ...(data.puntuacion !== undefined && { puntuacion: data.puntuacion }),
          ...(data.justificacion !== undefined && { justificacion: data.justificacion })
        },
        include: {
          expediente: {
            select: {
              id: true,
              numeroExpediente: true
            }
          }
        }
      });

      return reply.status(200).send(cpvRecomendado);
    } catch (error) {
      fastify.log.error(error);
      if (error.code === 'P2002') {
        return reply.status(400).send({ error: 'Duplicate entry' });
      }
      if (error.code === 'P2003') {
        return reply.status(400).send({ error: 'Foreign key constraint failed' });
      }
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // DELETE /cpv-recomendados/:id - Delete
  fastify.delete('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['CPV Recomendados'],
      description: 'Delete CPV recomendado by ID',
      params: idParamsSchema,
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
        },
        500: {
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

      // Check if CPV recomendado exists
      const existingCpvRecomendado = await prisma.cpvRecomendado.findUnique({
        where: { id }
      });

      if (!existingCpvRecomendado) {
        return reply.status(404).send({ error: 'CPV recomendado not found' });
      }

      await prisma.cpvRecomendado.delete({
        where: { id }
      });

      return reply.status(200).send({ message: 'CPV recomendado deleted successfully' });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
};

export default routes;