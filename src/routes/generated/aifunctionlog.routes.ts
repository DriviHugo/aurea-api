import type { FastifyPluginAsync } from 'fastify';
import type { PrismaClient } from '@prisma/client';

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // AJV Schemas
  const aiFunctionLogSchema = {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      functionCode: { type: 'string' },
      functionName: { type: ['string', 'null'] },
      providerName: { type: ['string', 'null'] },
      modelo: { type: 'string' },
      inputVariables: { type: 'object' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' }
    }
  };

  const createAiFunctionLogSchema = {
    type: 'object',
    required: ['functionCode', 'modelo'],
    properties: {
      functionCode: { type: 'string', minLength: 1 },
      functionName: { type: ['string', 'null'] },
      providerName: { type: ['string', 'null'] },
      modelo: { type: 'string', minLength: 1 },
      inputVariables: { type: 'object', default: {} }
    },
    additionalProperties: false
  };

  const updateAiFunctionLogSchema = {
    type: 'object',
    properties: {
      functionCode: { type: 'string', minLength: 1 },
      functionName: { type: ['string', 'null'] },
      providerName: { type: ['string', 'null'] },
      modelo: { type: 'string', minLength: 1 },
      inputVariables: { type: 'object' }
    },
    additionalProperties: false
  };

  const paginationQuerySchema = {
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

  // GET /ai-function-logs - List with pagination
  fastify.get('/', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['AI Function Logs'],
      description: 'Get paginated list of AI function logs',
      querystring: paginationQuerySchema,
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: aiFunctionLogSchema
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
        prisma.aiFunctionLog.findMany({
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.aiFunctionLog.count()
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

  // GET /ai-function-logs/:id - Get by ID
  fastify.get('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['AI Function Logs'],
      description: 'Get AI function log by ID',
      params: idParamsSchema,
      response: {
        200: aiFunctionLogSchema,
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

      const aiFunctionLog = await prisma.aiFunctionLog.findUnique({
        where: { id }
      });

      if (!aiFunctionLog) {
        return reply.status(404).send({ error: 'AI function log not found' });
      }

      return reply.status(200).send(aiFunctionLog);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // POST /ai-function-logs - Create new AI function log
  fastify.post('/', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['AI Function Logs'],
      description: 'Create new AI function log',
      body: createAiFunctionLogSchema,
      response: {
        201: aiFunctionLogSchema,
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
        functionCode: string;
        functionName?: string | null;
        providerName?: string | null;
        modelo: string;
        inputVariables?: object;
      };

      const aiFunctionLog = await prisma.aiFunctionLog.create({
        data: {
          functionCode: data.functionCode,
          functionName: data.functionName || null,
          providerName: data.providerName || null,
          modelo: data.modelo,
          inputVariables: data.inputVariables || {}
        }
      });

      return reply.status(201).send(aiFunctionLog);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // PUT /ai-function-logs/:id - Update AI function log
  fastify.put('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['AI Function Logs'],
      description: 'Update AI function log by ID',
      params: idParamsSchema,
      body: updateAiFunctionLogSchema,
      response: {
        200: aiFunctionLogSchema,
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
        functionCode?: string;
        functionName?: string | null;
        providerName?: string | null;
        modelo?: string;
        inputVariables?: object;
      };

      // Check if AI function log exists
      const existingLog = await prisma.aiFunctionLog.findUnique({
        where: { id }
      });

      if (!existingLog) {
        return reply.status(404).send({ error: 'AI function log not found' });
      }

      const updatedLog = await prisma.aiFunctionLog.update({
        where: { id },
        data: {
          ...(data.functionCode !== undefined && { functionCode: data.functionCode }),
          ...(data.functionName !== undefined && { functionName: data.functionName }),
          ...(data.providerName !== undefined && { providerName: data.providerName }),
          ...(data.modelo !== undefined && { modelo: data.modelo }),
          ...(data.inputVariables !== undefined && { inputVariables: data.inputVariables })
        }
      });

      return reply.status(200).send(updatedLog);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // DELETE /ai-function-logs/:id - Delete AI function log
  fastify.delete('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['AI Function Logs'],
      description: 'Delete AI function log by ID',
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

      // Check if AI function log exists
      const existingLog = await prisma.aiFunctionLog.findUnique({
        where: { id }
      });

      if (!existingLog) {
        return reply.status(404).send({ error: 'AI function log not found' });
      }

      await prisma.aiFunctionLog.delete({
        where: { id }
      });

      return reply.status(200).send({ message: 'AI function log deleted successfully' });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
};

export default routes;

This implementation provides:

1. **Complete CRUD operations** for AiFunctionLog model
2. **Pagination** on the list endpoint with proper response structure
3. **Authentication** using `authAccessToken` preValidation hook
4. **Comprehensive AJV validation** for all request bodies and parameters
5. **Proper error handling** with appropriate HTTP status codes
6. **Swagger/OpenAPI documentation** with tags, descriptions, and response schemas
7. **TypeScript types** for all request/response objects
8. **Production-ready patterns** including:
   - Existence checks before update/delete operations
   - Proper error logging
   - Conditional updates (only updating provided fields)
   - UUID validation for ID parameters
   - Input sanitization and validation

The routes handle all edge cases and follow Fastify best practices for error handling and response formatting.