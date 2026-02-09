import type { FastifyPluginAsync } from 'fastify';
import type { PrismaClient } from '@prisma/client';

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // Schemas
  const alternativaProcedimientoSchema = {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      expedienteId: { type: 'string', format: 'uuid' },
      procedimiento: { 
        type: 'string',
        enum: ['ORDINARIO', 'ABREVIADO', 'MONITORIO', 'VERBAL', 'EJECUTIVO'] // Adjust enum values based on your TipoProcedimiento
      },
      puntuacion: { type: ['integer', 'null'] },
      justificacion: { type: 'string' },
      createdAt: { type: 'string', format: 'date-time' }
    }
  };

  const createAlternativaProcedimientoSchema = {
    type: 'object',
    required: ['expedienteId', 'procedimiento', 'justificacion'],
    properties: {
      expedienteId: { type: 'string', format: 'uuid' },
      procedimiento: { 
        type: 'string',
        enum: ['ORDINARIO', 'ABREVIADO', 'MONITORIO', 'VERBAL', 'EJECUTIVO']
      },
      puntuacion: { type: ['integer', 'null'] },
      justificacion: { type: 'string', minLength: 1 }
    }
  };

  const updateAlternativaProcedimientoSchema = {
    type: 'object',
    properties: {
      expedienteId: { type: 'string', format: 'uuid' },
      procedimiento: { 
        type: 'string',
        enum: ['ORDINARIO', 'ABREVIADO', 'MONITORIO', 'VERBAL', 'EJECUTIVO']
      },
      puntuacion: { type: ['integer', 'null'] },
      justificacion: { type: 'string', minLength: 1 }
    }
  };

  const paginationSchema = {
    type: 'object',
    properties: {
      page: { type: 'integer', minimum: 1, default: 1 },
      limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 }
    }
  };

  const paramsSchema = {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', format: 'uuid' }
    }
  };

  // GET /alternativas-procedimiento - List with pagination
  fastify.get('/', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['Alternativas Procedimiento'],
      description: 'Get paginated list of alternativas procedimiento',
      querystring: paginationSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: alternativaProcedimientoSchema
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

      const [alternativas, total] = await Promise.all([
        prisma.alternativaProcedimiento.findMany({
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            expediente: {
              select: {
                id: true,
                numero: true
              }
            }
          }
        }),
        prisma.alternativaProcedimiento.count()
      ]);

      const totalPages = Math.ceil(total / limit);

      return reply.status(200).send({
        data: alternativas,
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

  // GET /alternativas-procedimiento/:id - Get by ID
  fastify.get('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['Alternativas Procedimiento'],
      description: 'Get alternativa procedimiento by ID',
      params: paramsSchema,
      response: {
        200: alternativaProcedimientoSchema,
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
        where: { id },
        include: {
          expediente: {
            select: {
              id: true,
              numero: true
            }
          }
        }
      });

      if (!alternativa) {
        return reply.status(404).send({ error: 'Alternativa procedimiento not found' });
      }

      return reply.status(200).send(alternativa);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // POST /alternativas-procedimiento - Create
  fastify.post('/', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['Alternativas Procedimiento'],
      description: 'Create new alternativa procedimiento',
      body: createAlternativaProcedimientoSchema,
      response: {
        201: alternativaProcedimientoSchema,
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
        procedimiento: string;
        puntuacion?: number | null;
        justificacion: string;
      };

      // Verify expediente exists
      const expediente = await prisma.expediente.findUnique({
        where: { id: data.expedienteId }
      });

      if (!expediente) {
        return reply.status(400).send({ error: 'Expediente not found' });
      }

      const alternativa = await prisma.alternativaProcedimiento.create({
        data: {
          expedienteId: data.expedienteId,
          procedimiento: data.procedimiento as any,
          puntuacion: data.puntuacion,
          justificacion: data.justificacion
        },
        include: {
          expediente: {
            select: {
              id: true,
              numero: true
            }
          }
        }
      });

      return reply.status(201).send(alternativa);
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

  // PUT /alternativas-procedimiento/:id - Update
  fastify.put('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['Alternativas Procedimiento'],
      description: 'Update alternativa procedimiento by ID',
      params: paramsSchema,
      body: updateAlternativaProcedimientoSchema,
      response: {
        200: alternativaProcedimientoSchema,
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
        procedimiento?: string;
        puntuacion?: number | null;
        justificacion?: string;
      };

      // Check if alternativa exists
      const existingAlternativa = await prisma.alternativaProcedimiento.findUnique({
        where: { id }
      });

      if (!existingAlternativa) {
        return reply.status(404).send({ error: 'Alternativa procedimiento not found' });
      }

      // If expedienteId is being updated, verify it exists
      if (data.expedienteId && data.expedienteId !== existingAlternativa.expedienteId) {
        const expediente = await prisma.expediente.findUnique({
          where: { id: data.expedienteId }
        });

        if (!expediente) {
          return reply.status(400).send({ error: 'Expediente not found' });
        }
      }

      const alternativa = await prisma.alternativaProcedimiento.update({
        where: { id },
        data: {
          ...(data.expedienteId && { expedienteId: data.expedienteId }),
          ...(data.procedimiento && { procedimiento: data.procedimiento as any }),
          ...(data.puntuacion !== undefined && { puntuacion: data.puntuacion }),
          ...(data.justificacion && { justificacion: data.justificacion })
        },
        include: {
          expediente: {
            select: {
              id: true,
              numero: true
            }
          }
        }
      });

      return reply.status(200).send(alternativa);
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

  // DELETE /alternativas-procedimiento/:id - Delete
  fastify.delete('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['Alternativas Procedimiento'],
      description: 'Delete alternativa procedimiento by ID',
      params: paramsSchema,
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

      // Check if alternativa exists
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
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
};

export default routes;