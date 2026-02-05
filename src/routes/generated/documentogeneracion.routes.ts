import type { FastifyPluginAsync } from 'fastify';
import type { PrismaClient } from '@prisma/client';

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // AJV Schemas
  const documentoGeneracionSchema = {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      documentoId: { type: 'string', format: 'uuid' },
      version: { type: 'integer', minimum: 1 },
      plan: { type: 'object' }
    }
  };

  const createDocumentoGeneracionSchema = {
    type: 'object',
    required: ['documentoId'],
    properties: {
      documentoId: { type: 'string', format: 'uuid' },
      version: { type: 'integer', minimum: 1, default: 1 },
      plan: { type: 'object', default: {} }
    },
    additionalProperties: false
  };

  const updateDocumentoGeneracionSchema = {
    type: 'object',
    properties: {
      documentoId: { type: 'string', format: 'uuid' },
      version: { type: 'integer', minimum: 1 },
      plan: { type: 'object' }
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

  // GET /documento-generacion - List with pagination
  fastify.get('/', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['DocumentoGeneracion'],
      description: 'Get paginated list of documento generacion records',
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

  // POST /documento-generacion - Create new
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
      const { documentoId, version = 1, plan = {} } = request.body as {
        documentoId: string;
        version?: number;
        plan?: object;
      };

      const documentoGeneracion = await prisma.documentoGeneracion.create({
        data: {
          documentoId,
          version,
          plan
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

  // PUT /documento-generacion/:id - Update by ID
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
      const updateData = request.body as {
        documentoId?: string;
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

      const documentoGeneracion = await prisma.documentoGeneracion.update({
        where: { id },
        data: updateData
      });

      return reply.status(200).send(documentoGeneracion);
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

  // DELETE /documento-generacion/:id - Delete by ID
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
            message: { type: 'string' },
            id: { type: 'string' }
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

      return reply.status(200).send({
        message: 'DocumentoGeneracion deleted successfully',
        id
      });
    } catch (error) {
      fastify.log.error(error);
      
      if (error.code === 'P2003') {
        return reply.status(400).send({ error: 'Cannot delete: foreign key constraint' });
      }

      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
};

export default routes;

This implementation provides:

1. **Complete CRUD operations** for DocumentoGeneracion model
2. **Pagination** for the list endpoint with proper response structure
3. **Authentication** using `preValidation: [fastify.authAccessToken]`
4. **AJV schema validation** for all request/response bodies
5. **Swagger/OpenAPI** documentation with tags, descriptions, and response schemas
6. **Proper error handling** including:
   - 404 for not found entities
   - 400 for validation errors and constraint violations
   - 500 for internal server errors
   - Prisma-specific error codes (P2002, P2003)
7. **TypeScript types** for all parameters and request bodies
8. **Production-ready patterns** following Fastify best practices
9. **Proper HTTP status codes** (200, 201, 404, 400, 500)
10. **ID validation** before update/delete operations

The routes handle the JSON `plan` field appropriately and include proper ordering by version in descending order for the list endpoint.