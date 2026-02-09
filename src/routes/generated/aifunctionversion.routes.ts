import type { FastifyPluginAsync } from 'fastify';
import type { PrismaClient } from '@prisma/client';

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // List AI Function Versions with pagination
  fastify.get('/', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['AI Function Versions'],
      description: 'Get paginated list of AI function versions',
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
          functionId: { type: 'string', format: 'uuid' }
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
                  functionId: { type: 'string', format: 'uuid' },
                  version: { type: 'integer' },
                  systemPrompt: { type: 'string' },
                  userPromptTemplate: { type: ['string', 'null'] },
                  toolSchema: { type: ['object', 'null'] },
                  parametros: { type: ['object', 'null'] },
                  modelo: { type: 'string' },
                  providerId: { type: ['string', 'null'], format: 'uuid' },
                  motivoCambio: { type: ['string', 'null'] },
                  creadoPor: { type: ['string', 'null'], format: 'uuid' },
                  createdAt: { type: 'string', format: 'date-time' },
                  function: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', format: 'uuid' },
                      name: { type: 'string' }
                    }
                  },
                  provider: {
                    type: ['object', 'null'],
                    properties: {
                      id: { type: 'string', format: 'uuid' },
                      name: { type: 'string' }
                    }
                  }
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
      const { page = 1, limit = 10, functionId } = request.query as {
        page?: number;
        limit?: number;
        functionId?: string;
      };

      const skip = (page - 1) * limit;
      const where = functionId ? { functionId } : {};

      const [data, total] = await Promise.all([
        prisma.aiFunctionVersion.findMany({
          where,
          skip,
          take: limit,
          include: {
            function: {
              select: {
                id: true,
                name: true
              }
            },
            provider: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: [
            { functionId: 'asc' },
            { version: 'desc' }
          ]
        }),
        prisma.aiFunctionVersion.count({ where })
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

  // Get AI Function Version by ID
  fastify.get('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['AI Function Versions'],
      description: 'Get AI function version by ID',
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
            functionId: { type: 'string', format: 'uuid' },
            version: { type: 'integer' },
            systemPrompt: { type: 'string' },
            userPromptTemplate: { type: ['string', 'null'] },
            toolSchema: { type: ['object', 'null'] },
            parametros: { type: ['object', 'null'] },
            modelo: { type: 'string' },
            providerId: { type: ['string', 'null'], format: 'uuid' },
            motivoCambio: { type: ['string', 'null'] },
            creadoPor: { type: ['string', 'null'], format: 'uuid' },
            createdAt: { type: 'string', format: 'date-time' },
            function: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                name: { type: 'string' }
              }
            },
            provider: {
              type: ['object', 'null'],
              properties: {
                id: { type: 'string', format: 'uuid' },
                name: { type: 'string' }
              }
            }
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

      const aiFunctionVersion = await prisma.aiFunctionVersion.findUnique({
        where: { id },
        include: {
          function: {
            select: {
              id: true,
              name: true
            }
          },
          provider: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      if (!aiFunctionVersion) {
        return reply.status(404).send({ error: 'AI function version not found' });
      }

      return reply.status(200).send(aiFunctionVersion);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Create AI Function Version
  fastify.post('/', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['AI Function Versions'],
      description: 'Create new AI function version',
      body: {
        type: 'object',
        required: ['functionId', 'version', 'systemPrompt', 'modelo'],
        properties: {
          functionId: { type: 'string', format: 'uuid' },
          version: { type: 'integer', minimum: 1 },
          systemPrompt: { type: 'string', minLength: 1 },
          userPromptTemplate: { type: ['string', 'null'] },
          toolSchema: { type: ['object', 'null'] },
          parametros: { type: ['object', 'null'] },
          modelo: { type: 'string', minLength: 1 },
          providerId: { type: ['string', 'null'], format: 'uuid' },
          motivoCambio: { type: ['string', 'null'] },
          creadoPor: { type: ['string', 'null'], format: 'uuid' }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            functionId: { type: 'string', format: 'uuid' },
            version: { type: 'integer' },
            systemPrompt: { type: 'string' },
            userPromptTemplate: { type: ['string', 'null'] },
            toolSchema: { type: ['object', 'null'] },
            parametros: { type: ['object', 'null'] },
            modelo: { type: 'string' },
            providerId: { type: ['string', 'null'], format: 'uuid' },
            motivoCambio: { type: ['string', 'null'] },
            creadoPor: { type: ['string', 'null'], format: 'uuid' },
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
        functionId: string;
        version: number;
        systemPrompt: string;
        userPromptTemplate?: string | null;
        toolSchema?: object | null;
        parametros?: object | null;
        modelo: string;
        providerId?: string | null;
        motivoCambio?: string | null;
        creadoPor?: string | null;
      };

      // Check if function exists
      const functionExists = await prisma.aiFunction.findUnique({
        where: { id: data.functionId }
      });

      if (!functionExists) {
        return reply.status(400).send({ error: 'AI function not found' });
      }

      // Check if provider exists (if provided)
      if (data.providerId) {
        const providerExists = await prisma.aiProvider.findUnique({
          where: { id: data.providerId }
        });

        if (!providerExists) {
          return reply.status(400).send({ error: 'AI provider not found' });
        }
      }

      const aiFunctionVersion = await prisma.aiFunctionVersion.create({
        data
      });

      return reply.status(201).send(aiFunctionVersion);
    } catch (error) {
      fastify.log.error(error);
      
      if (error.code === 'P2002') {
        return reply.status(400).send({ 
          error: 'AI function version with this function ID and version already exists' 
        });
      }

      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Update AI Function Version
  fastify.put('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['AI Function Versions'],
      description: 'Update AI function version',
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
          systemPrompt: { type: 'string', minLength: 1 },
          userPromptTemplate: { type: ['string', 'null'] },
          toolSchema: { type: ['object', 'null'] },
          parametros: { type: ['object', 'null'] },
          modelo: { type: 'string', minLength: 1 },
          providerId: { type: ['string', 'null'], format: 'uuid' },
          motivoCambio: { type: ['string', 'null'] },
          creadoPor: { type: ['string', 'null'], format: 'uuid' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            functionId: { type: 'string', format: 'uuid' },
            version: { type: 'integer' },
            systemPrompt: { type: 'string' },
            userPromptTemplate: { type: ['string', 'null'] },
            toolSchema: { type: ['object', 'null'] },
            parametros: { type: ['object', 'null'] },
            modelo: { type: 'string' },
            providerId: { type: ['string', 'null'], format: 'uuid' },
            motivoCambio: { type: ['string', 'null'] },
            creadoPor: { type: ['string', 'null'], format: 'uuid' },
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
      const data = request.body as {
        systemPrompt?: string;
        userPromptTemplate?: string | null;
        toolSchema?: object | null;
        parametros?: object | null;
        modelo?: string;
        providerId?: string | null;
        motivoCambio?: string | null;
        creadoPor?: string | null;
      };

      // Check if AI function version exists
      const existingVersion = await prisma.aiFunctionVersion.findUnique({
        where: { id }
      });

      if (!existingVersion) {
        return reply.status(404).send({ error: 'AI function version not found' });
      }

      // Check if provider exists (if provided)
      if (data.providerId) {
        const providerExists = await prisma.aiProvider.findUnique({
          where: { id: data.providerId }
        });

        if (!providerExists) {
          return reply.status(400).send({ error: 'AI provider not found' });
        }
      }

      const updatedVersion = await prisma.aiFunctionVersion.update({
        where: { id },
        data
      });

      return reply.status(200).send(updatedVersion);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Delete AI Function Version
  fastify.delete('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['AI Function Versions'],
      description: 'Delete AI function version',
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

      // Check if AI function version exists
      const existingVersion = await prisma.aiFunctionVersion.findUnique({
        where: { id }
      });

      if (!existingVersion) {
        return reply.status(404).send({ error: 'AI function version not found' });
      }

      await prisma.aiFunctionVersion.delete({
        where: { id }
      });

      return reply.status(200).send({ message: 'AI function version deleted successfully' });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
};

export default routes;