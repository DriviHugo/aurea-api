import type { FastifyPluginAsync } from 'fastify';
import type { PrismaClient } from '@prisma/client';

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // List DocumentoGeneracion with pagination
  fastify.get('/', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['DocumentoGeneracion'],
      description: 'Get paginated list of DocumentoGeneracion',
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 }
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
                  id: { type: 'string' },
                  documentoId: { type: 'string' },
                  version: { type: 'integer' },
                  plan: { type: 'object' }
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
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Get DocumentoGeneracion by ID
  fastify.get('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['DocumentoGeneracion'],
      description: 'Get DocumentoGeneracion by ID',
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
            id: { type: 'string' },
            documentoId: { type: 'string' },
            version: { type: 'integer' },
            plan: { type: 'object' }
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

      const documentoGeneracion = await prisma.documentoGeneracion.findUnique({
        where: { id }
      });

      if (!documentoGeneracion) {
        return reply.status(404).send({ error: 'DocumentoGeneracion not found' });
      }

      return reply.status(200).send(documentoGeneracion);
    } catch (error) {
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Create DocumentoGeneracion
  fastify.post('/', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['DocumentoGeneracion'],
      description: 'Create new DocumentoGeneracion',
      body: {
        type: 'object',
        required: ['documentoId'],
        properties: {
          documentoId: { type: 'string', format: 'uuid' },
          version: { type: 'integer', minimum: 1 },
          plan: { type: 'object' }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            documentoId: { type: 'string' },
            version: { type: 'integer' },
            plan: { type: 'object' }
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
      const { documentoId, version, plan } = request.body as {
        documentoId: string;
        version?: number;
        plan?: object;
      };

      const documentoGeneracion = await prisma.documentoGeneracion.create({
        data: {
          documentoId,
          version: version || 1,
          plan: plan || {}
        }
      });

      return reply.status(201).send(documentoGeneracion);
    } catch (error) {
      return reply.status(400).send({ error: 'Invalid data provided' });
    }
  });

  // Update DocumentoGeneracion
  fastify.put('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['DocumentoGeneracion'],
      description: 'Update DocumentoGeneracion by ID',
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
          documentoId: { type: 'string', format: 'uuid' },
          version: { type: 'integer', minimum: 1 },
          plan: { type: 'object' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            documentoId: { type: 'string' },
            version: { type: 'integer' },
            plan: { type: 'object' }
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
      const { documentoId, version, plan } = request.body as {
        documentoId?: string;
        version?: number;
        plan?: object;
      };

      const existingDocumento = await prisma.documentoGeneracion.findUnique({
        where: { id }
      });

      if (!existingDocumento) {
        return reply.status(404).send({ error: 'DocumentoGeneracion not found' });
      }

      const documentoGeneracion = await prisma.documentoGeneracion.update({
        where: { id },
        data: {
          ...(documentoId && { documentoId }),
          ...(version && { version }),
          ...(plan && { plan })
        }
      });

      return reply.status(200).send(documentoGeneracion);
    } catch (error) {
      return reply.status(400).send({ error: 'Invalid data provided' });
    }
  });

  // Delete DocumentoGeneracion
  fastify.delete('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['DocumentoGeneracion'],
      description: 'Delete DocumentoGeneracion by ID',
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

      const existingDocumento = await prisma.documentoGeneracion.findUnique({
        where: { id }
      });

      if (!existingDocumento) {
        return reply.status(404).send({ error: 'DocumentoGeneracion not found' });
      }

      await prisma.documentoGeneracion.delete({
        where: { id }
      });

      return reply.status(200).send({ message: 'DocumentoGeneracion deleted successfully' });
    } catch (error) {
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
};

export default routes;