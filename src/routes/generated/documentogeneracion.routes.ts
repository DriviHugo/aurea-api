import type { FastifyPluginAsync } from 'fastify';
import type { PrismaClient } from '@prisma/client';

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // Schemas
  const documentoGeneracionSchema = {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      documentoId: { type: ['string', 'null'], format: 'uuid' },
      expedienteId: { type: ['string', 'null'], format: 'uuid' },
      version: { type: 'integer', minimum: 1 },
      plan: { type: 'object' }
    }
  };

  const createDocumentoGeneracionSchema = {
    type: 'object',
    properties: {
      documentoId: { type: ['string', 'null'], format: 'uuid' },
      expedienteId: { type: ['string', 'null'], format: 'uuid' },
      version: { type: 'integer', minimum: 1, default: 1 },
      plan: { type: 'object', default: {} }
    }
  };

  const updateDocumentoGeneracionSchema = {
    type: 'object',
    properties: {
      documentoId: { type: ['string', 'null'], format: 'uuid' },
      expedienteId: { type: ['string', 'null'], format: 'uuid' },
      version: { type: 'integer', minimum: 1 },
      plan: { type: 'object' }
    }
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
    properties: {
      id: { type: 'string', format: 'uuid' }
    },
    required: ['id']
  };

  // GET /documento-generacion - List with pagination
  fastify.get('/', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['DocumentoGeneracion'],
      description: 'Get paginated list of documento generacion',
      querystring: paginationSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: documentoGeneracionSchema
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
        prisma.documentoGeneracion.findMany({
          skip,
          take: limit,
          orderBy: { version: 'desc' }
        }),
        prisma.documentoGeneracion.count()
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

  // GET /documento-generacion/:id - Get by ID
  fastify.get('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['DocumentoGeneracion'],
      description: 'Get documento generacion by ID',
      params: idParamsSchema,
      response: {
        200: documentoGeneracionSchema,
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

      const documentoGeneracion = await prisma.documentoGeneracion.findUnique({
        where: { id }
      });

      if (!documentoGeneracion) {
        return reply.status(404).send({ error: 'DocumentoGeneracion not found' });
      }

      return reply.status(200).send(documentoGeneracion);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // POST /documento-generacion - Create
  fastify.post('/', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['DocumentoGeneracion'],
      description: 'Create new documento generacion',
      body: createDocumentoGeneracionSchema,
      response: {
        201: documentoGeneracionSchema,
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
        documentoId?: string | null;
        expedienteId?: string | null;
        version?: number;
        plan?: object;
      };

      const documentoGeneracion = await prisma.documentoGeneracion.create({
        data: {
          documentoId: data.documentoId || null,
          expedienteId: data.expedienteId || null,
          version: data.version || 1,
          plan: data.plan || {}
        }
      });

      return reply.status(201).send(documentoGeneracion);
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

  // PUT /documento-generacion/:id - Update
  fastify.put('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['DocumentoGeneracion'],
      description: 'Update documento generacion by ID',
      params: idParamsSchema,
      body: updateDocumentoGeneracionSchema,
      response: {
        200: documentoGeneracionSchema,
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
        documentoId?: string | null;
        expedienteId?: string | null;
        version?: number;
        plan?: object;
      };

      // Check if entity exists
      const existingDocumentoGeneracion = await prisma.documentoGeneracion.findUnique({
        where: { id }
      });

      if (!existingDocumentoGeneracion) {
        return reply.status(404).send({ error: 'DocumentoGeneracion not found' });
      }

      const updatedDocumentoGeneracion = await prisma.documentoGeneracion.update({
        where: { id },
        data: {
          documentoId: data.documentoId !== undefined ? data.documentoId : existingDocumentoGeneracion.documentoId,
          expedienteId: data.expedienteId !== undefined ? data.expedienteId : existingDocumentoGeneracion.expedienteId,
          version: data.version !== undefined ? data.version : existingDocumentoGeneracion.version,
          plan: data.plan !== undefined ? data.plan : existingDocumentoGeneracion.plan
        }
      });

      return reply.status(200).send(updatedDocumentoGeneracion);
    } catch (error) {
      fastify.log.error(error);
      if (error.code === 'P2002') {
        return reply.status(400).send({ error: 'Duplicate entry' });
      }
      if (error.code === 'P2003') {
        return reply.status(400).send({ error: 'Foreign key constraint failed' });
      }
      if (error.code === 'P2025') {
        return reply.status(404).send({ error: 'DocumentoGeneracion not found' });
      }
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // DELETE /documento-generacion/:id - Delete
  fastify.delete('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['DocumentoGeneracion'],
      description: 'Delete documento generacion by ID',
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

      // Check if entity exists
      const existingDocumentoGeneracion = await prisma.documentoGeneracion.findUnique({
        where: { id }
      });

      if (!existingDocumentoGeneracion) {
        return reply.status(404).send({ error: 'DocumentoGeneracion not found' });
      }

      await prisma.documentoGeneracion.delete({
        where: { id }
      });

      return reply.status(200).send({ message: 'DocumentoGeneracion deleted successfully' });
    } catch (error) {
      fastify.log.error(error);
      if (error.code === 'P2025') {
        return reply.status(404).send({ error: 'DocumentoGeneracion not found' });
      }
      if (error.code === 'P2003') {
        return reply.status(400).send({ error: 'Cannot delete: foreign key constraint' });
      }
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
};

export default routes;