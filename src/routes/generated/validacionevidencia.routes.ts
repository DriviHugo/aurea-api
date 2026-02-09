import type { FastifyPluginAsync } from 'fastify';
import type { PrismaClient } from '@prisma/client';

const validacionEvidenciaBodySchema = {
  type: 'object',
  required: ['validacionId', 'evidenciaId'],
  properties: {
    validacionId: { type: 'string', format: 'uuid' },
    evidenciaId: { type: 'string', format: 'uuid' }
  },
  additionalProperties: false
};

const validacionEvidenciaResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    validacionId: { type: 'string', format: 'uuid' },
    evidenciaId: { type: 'string', format: 'uuid' },
    createdAt: { type: 'string', format: 'date-time' },
    validacion: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        nombre: { type: 'string' }
      }
    },
    evidencia: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        nombre: { type: 'string' }
      }
    }
  }
};

const paginationQuerySchema = {
  type: 'object',
  properties: {
    page: { type: 'integer', minimum: 1, default: 1 },
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 }
  }
};

const paginatedResponseSchema = {
  type: 'object',
  properties: {
    data: {
      type: 'array',
      items: validacionEvidenciaResponseSchema
    },
    total: { type: 'integer' },
    page: { type: 'integer' },
    limit: { type: 'integer' },
    totalPages: { type: 'integer' }
  }
};

const errorResponseSchema = {
  type: 'object',
  properties: {
    error: { type: 'string' }
  }
};

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // GET /validaciones-evidencias - List all validaciones evidencias with pagination
  fastify.get('/', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['ValidacionEvidencia'],
      description: 'Get all validaciones evidencias with pagination',
      querystring: paginationQuerySchema,
      response: {
        200: paginatedResponseSchema,
        500: errorResponseSchema
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
            validacion: {
              select: {
                id: true,
                nombre: true
              }
            },
            evidencia: {
              select: {
                id: true,
                nombre: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
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
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // GET /validaciones-evidencias/:id - Get a specific validacion evidencia by ID
  fastify.get('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['ValidacionEvidencia'],
      description: 'Get a validacion evidencia by ID',
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        200: validacionEvidenciaResponseSchema,
        404: errorResponseSchema,
        500: errorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const validacionEvidencia = await prisma.validacionEvidencia.findUnique({
        where: { id },
        include: {
          validacion: {
            select: {
              id: true,
              nombre: true
            }
          },
          evidencia: {
            select: {
              id: true,
              nombre: true
            }
          }
        }
      });

      if (!validacionEvidencia) {
        return reply.status(404).send({ error: 'Validacion evidencia not found' });
      }

      return reply.status(200).send(validacionEvidencia);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // POST /validaciones-evidencias - Create a new validacion evidencia
  fastify.post('/', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['ValidacionEvidencia'],
      description: 'Create a new validacion evidencia',
      body: validacionEvidenciaBodySchema,
      response: {
        201: validacionEvidenciaResponseSchema,
        400: errorResponseSchema,
        500: errorResponseSchema
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

      // Check if relationship already exists
      const existingRelation = await prisma.validacionEvidencia.findUnique({
        where: {
          validacionId_evidenciaId: {
            validacionId,
            evidenciaId
          }
        }
      });

      if (existingRelation) {
        return reply.status(400).send({ error: 'Validacion evidencia relationship already exists' });
      }

      const validacionEvidencia = await prisma.validacionEvidencia.create({
        data: {
          validacionId,
          evidenciaId
        },
        include: {
          validacion: {
            select: {
              id: true,
              nombre: true
            }
          },
          evidencia: {
            select: {
              id: true,
              nombre: true
            }
          }
        }
      });

      return reply.status(201).send(validacionEvidencia);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // PUT /validaciones-evidencias/:id - Update a validacion evidencia
  fastify.put('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['ValidacionEvidencia'],
      description: 'Update a validacion evidencia',
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      },
      body: validacionEvidenciaBodySchema,
      response: {
        200: validacionEvidenciaResponseSchema,
        400: errorResponseSchema,
        404: errorResponseSchema,
        500: errorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { validacionId, evidenciaId } = request.body as {
        validacionId: string;
        evidenciaId: string;
      };

      // Check if validacion evidencia exists
      const existingValidacionEvidencia = await prisma.validacionEvidencia.findUnique({
        where: { id }
      });

      if (!existingValidacionEvidencia) {
        return reply.status(404).send({ error: 'Validacion evidencia not found' });
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

      // Check if new relationship already exists (excluding current record)
      const existingRelation = await prisma.validacionEvidencia.findFirst({
        where: {
          validacionId,
          evidenciaId,
          id: { not: id }
        }
      });

      if (existingRelation) {
        return reply.status(400).send({ error: 'Validacion evidencia relationship already exists' });
      }

      const validacionEvidencia = await prisma.validacionEvidencia.update({
        where: { id },
        data: {
          validacionId,
          evidenciaId
        },
        include: {
          validacion: {
            select: {
              id: true,
              nombre: true
            }
          },
          evidencia: {
            select: {
              id: true,
              nombre: true
            }
          }
        }
      });

      return reply.status(200).send(validacionEvidencia);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // DELETE /validaciones-evidencias/:id - Delete a validacion evidencia
  fastify.delete('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['ValidacionEvidencia'],
      description: 'Delete a validacion evidencia',
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
        404: errorResponseSchema,
        500: errorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      // Check if validacion evidencia exists
      const existingValidacionEvidencia = await prisma.validacionEvidencia.findUnique({
        where: { id }
      });

      if (!existingValidacionEvidencia) {
        return reply.status(404).send({ error: 'Validacion evidencia not found' });
      }

      await prisma.validacionEvidencia.delete({
        where: { id }
      });

      return reply.status(200).send({ message: 'Validacion evidencia deleted successfully' });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
};

export default routes;