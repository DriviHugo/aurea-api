import type { FastifyPluginAsync } from 'fastify';
import type { PrismaClient } from '@prisma/client';

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // List AiFunctionLogs with pagination
  fastify.get('/', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['AiFunctionLog'],
      description: 'Get paginated list of AI function logs',
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
                  functionCode: { type: 'string' },
                  functionName: { type: ['string', 'null'] },
                  providerName: { type: ['string', 'null'] },
                  modelo: { type: 'string' },
                  inputVariables: { type: 'object' }
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
        prisma.aiFunctionLog.findMany({
          skip,
          take: limit,
          orderBy: { id: 'desc' }
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
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Get single AiFunctionLog by ID
  fastify.get('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['AiFunctionLog'],
      description: 'Get AI function log by ID',
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
            functionCode: { type: 'string' },
            functionName: { type: ['string', 'null'] },
            providerName: { type: ['string', 'null'] },
            modelo: { type: 'string' },
            inputVariables: { type: 'object' }
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

      const aiFunctionLog = await prisma.aiFunctionLog.findUnique({
        where: { id }
      });

      if (!aiFunctionLog) {
        return reply.status(404).send({ error: 'AI function log not found' });
      }

      return reply.status(200).send(aiFunctionLog);
    } catch (error) {
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Create new AiFunctionLog
  fastify.post('/', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['AiFunctionLog'],
      description: 'Create new AI function log',
      body: {
        type: 'object',
        required: ['functionCode', 'modelo'],
        properties: {
          functionCode: { type: 'string', minLength: 1 },
          functionName: { type: ['string', 'null'] },
          providerName: { type: ['string', 'null'] },
          modelo: { type: 'string', minLength: 1 },
          inputVariables: { type: 'object', default: {} }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            functionCode: { type: 'string' },
            functionName: { type: ['string', 'null'] },
            providerName: { type: ['string', 'null'] },
            modelo: { type: 'string' },
            inputVariables: { type: 'object' }
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
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Update AiFunctionLog by ID
  fastify.put('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['AiFunctionLog'],
      description: 'Update AI function log by ID',
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
          functionCode: { type: 'string', minLength: 1 },
          functionName: { type: ['string', 'null'] },
          providerName: { type: ['string', 'null'] },
          modelo: { type: 'string', minLength: 1 },
          inputVariables: { type: 'object' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            functionCode: { type: 'string' },
            functionName: { type: ['string', 'null'] },
            providerName: { type: ['string', 'null'] },
            modelo: { type: 'string' },
            inputVariables: { type: 'object' }
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
        functionCode?: string;
        functionName?: string | null;
        providerName?: string | null;
        modelo?: string;
        inputVariables?: object;
      };

      const existingLog = await prisma.aiFunctionLog.findUnique({
        where: { id }
      });

      if (!existingLog) {
        return reply.status(404).send({ error: 'AI function log not found' });
      }

      const aiFunctionLog = await prisma.aiFunctionLog.update({
        where: { id },
        data: {
          ...(data.functionCode !== undefined && { functionCode: data.functionCode }),
          ...(data.functionName !== undefined && { functionName: data.functionName }),
          ...(data.providerName !== undefined && { providerName: data.providerName }),
          ...(data.modelo !== undefined && { modelo: data.modelo }),
          ...(data.inputVariables !== undefined && { inputVariables: data.inputVariables })
        }
      });

      return reply.status(200).send(aiFunctionLog);
    } catch (error) {
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Delete AiFunctionLog by ID
  fastify.delete('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['AiFunctionLog'],
      description: 'Delete AI function log by ID',
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
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
};

export default routes;