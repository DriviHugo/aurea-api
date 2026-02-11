import type { FastifyPluginAsync } from 'fastify';
import type { PrismaClient } from '@prisma/client';

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // GET /alternativas-procedimiento - List with pagination
  fastify.get('/', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['AlternativaProcedimiento'],
      description: 'Get list of alternativas procedimiento with pagination',
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
                  procedimiento: { type: 'string' },
                  puntuacion: { type: ['integer', 'null'] },
                  justificacion: { type: 'string' },
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
        prisma.alternativaProcedimiento.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.alternativaProcedimiento.count({ where })
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

  // GET /alternativas-procedimiento/:id - Get by ID
  fastify.get('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['AlternativaProcedimiento'],
      description: 'Get alternativa procedimiento by ID',
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
            procedimiento: { type: 'string' },
            puntuacion: { type: ['integer', 'null'] },
            justificacion: { type: 'string' },
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

      const alternativa = await prisma.alternativaProcedimiento.findUnique({
        where: { id }
      });

      if (!alternativa) {
        return reply.status(404).send({ error: 'Alternativa procedimiento not found' });
      }

      return reply.status(200).send(alternativa);
    } catch (error) {
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // POST /alternativas-procedimiento - Create
  fastify.post('/', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['AlternativaProcedimiento'],
      description: 'Create new alternativa procedimiento',
      body: {
        type: 'object',
        required: ['expedienteId', 'procedimiento', 'justificacion'],
        properties: {
          expedienteId: { type: 'string', format: 'uuid' },
          procedimiento: { type: 'string' },
          puntuacion: { type: ['integer', 'null'] },
          justificacion: { type: 'string', minLength: 1 }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            expedienteId: { type: 'string', format: 'uuid' },
            procedimiento: { type: 'string' },
            puntuacion: { type: ['integer', 'null'] },
            justificacion: { type: 'string' },
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
      const { expedienteId, procedimiento, puntuacion, justificacion } = request.body as any;

      // Verify expediente exists
      const expediente = await prisma.expediente.findUnique({
        where: { id: expedienteId }
      });

      if (!expediente) {
        return reply.status(400).send({ error: 'Expediente not found' });
      }

      const alternativa = await prisma.alternativaProcedimiento.create({
        data: {
          expedienteId,
          procedimiento,
          puntuacion,
          justificacion
        }
      });

      return reply.status(201).send(alternativa);
    } catch (error) {
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // PUT /alternativas-procedimiento/:id - Update
  fastify.put('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['AlternativaProcedimiento'],
      description: 'Update alternativa procedimiento',
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
          procedimiento: { type: 'string' },
          puntuacion: { type: ['integer', 'null'] },
          justificacion: { type: 'string', minLength: 1 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            expedienteId: { type: 'string', format: 'uuid' },
            procedimiento: { type: 'string' },
            puntuacion: { type: ['integer', 'null'] },
            justificacion: { type: 'string' },
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
      const { expedienteId, procedimiento, puntuacion, justificacion } = request.body as any;

      const existingAlternativa = await prisma.alternativaProcedimiento.findUnique({
        where: { id }
      });

      if (!existingAlternativa) {
        return reply.status(404).send({ error: 'Alternativa procedimiento not found' });
      }

      // If expedienteId is being updated, verify it exists
      if (expedienteId && expedienteId !== existingAlternativa.expedienteId) {
        const expediente = await prisma.expediente.findUnique({
          where: { id: expedienteId }
        });

        if (!expediente) {
          return reply.status(400).send({ error: 'Expediente not found' });
        }
      }

      const updateData: any = {};
      if (expedienteId !== undefined) updateData.expedienteId = expedienteId;
      if (procedimiento !== undefined) updateData.procedimiento = procedimiento;
      if (puntuacion !== undefined) updateData.puntuacion = puntuacion;
      if (justificacion !== undefined) updateData.justificacion = justificacion;

      const alternativa = await prisma.alternativaProcedimiento.update({
        where: { id },
        data: updateData
      });

      return reply.status(200).send(alternativa);
    } catch (error) {
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // DELETE /alternativas-procedimiento/:id - Delete
  fastify.delete('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['AlternativaProcedimiento'],
      description: 'Delete alternativa procedimiento',
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

      const existingAlternativa = await prisma.alternativaProcedimiento.findUnique({
        where: { id }
      });

      if (!existingAlternativa) {
        return reply.status(404).send({ error: 'Alternativa procedimiento not found' });
      }

      await prisma.alternativaProcedimiento.delete({
        where: { id }
      });

      return reply.status(200).send({ message: 'Alternativa procedimiento deleted successfully' });
    } catch (error) {
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
};

export default routes;