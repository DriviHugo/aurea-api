import type { FastifyPluginAsync } from 'fastify';
import type { PrismaClient } from '@prisma/client';

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // List AI Providers with pagination
  fastify.get('/', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['AI Providers'],
      description: 'Get paginated list of AI providers',
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
                  nombre: { type: 'string' },
                  tipo: { type: 'string' },
                  baseUrl: { type: 'string' },
                  apiKeySecretName: { type: ['string', 'null'] },
                  modelosDisponibles: { type: 'array', items: { type: 'string' } },
                  parametrosDefecto: { type: 'object' }
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
        prisma.aiProvider.findMany({
          skip,
          take: limit,
          orderBy: { nombre: 'asc' }
        }),
        prisma.aiProvider.count()
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

  // Get AI Provider by ID
  fastify.get('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['AI Providers'],
      description: 'Get AI provider by ID',
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
            nombre: { type: 'string' },
            tipo: { type: 'string' },
            baseUrl: { type: 'string' },
            apiKeySecretName: { type: ['string', 'null'] },
            modelosDisponibles: { type: 'array', items: { type: 'string' } },
            parametrosDefecto: { type: 'object' }
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

      const aiProvider = await prisma.aiProvider.findUnique({
        where: { id }
      });

      if (!aiProvider) {
        return reply.status(404).send({ error: 'AI Provider not found' });
      }

      return reply.status(200).send(aiProvider);
    } catch (error) {
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Create AI Provider
  fastify.post('/', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['AI Providers'],
      description: 'Create new AI provider',
      body: {
        type: 'object',
        required: ['nombre', 'baseUrl', 'modelosDisponibles'],
        properties: {
          nombre: { type: 'string', minLength: 1 },
          tipo: { type: 'string', enum: ['openai', 'anthropic', 'google', 'custom'], default: 'custom' },
          baseUrl: { type: 'string', format: 'uri' },
          apiKeySecretName: { type: ['string', 'null'] },
          modelosDisponibles: { type: 'array', items: { type: 'string' }, minItems: 1 },
          parametrosDefecto: { type: 'object', default: { temperature: 0.3 } }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            nombre: { type: 'string' },
            tipo: { type: 'string' },
            baseUrl: { type: 'string' },
            apiKeySecretName: { type: ['string', 'null'] },
            modelosDisponibles: { type: 'array', items: { type: 'string' } },
            parametrosDefecto: { type: 'object' }
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
        nombre: string;
        tipo?: string;
        baseUrl: string;
        apiKeySecretName?: string | null;
        modelosDisponibles: string[];
        parametrosDefecto?: object;
      };

      const aiProvider = await prisma.aiProvider.create({
        data: {
          ...data,
          parametrosDefecto: data.parametrosDefecto || { temperature: 0.3 }
        }
      });

      return reply.status(201).send(aiProvider);
    } catch (error: any) {
      if (error.code === 'P2002') {
        return reply.status(400).send({ error: 'AI Provider name already exists' });
      }
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Update AI Provider
  fastify.put('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['AI Providers'],
      description: 'Update AI provider by ID',
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
          nombre: { type: 'string', minLength: 1 },
          tipo: { type: 'string', enum: ['openai', 'anthropic', 'google', 'custom'] },
          baseUrl: { type: 'string', format: 'uri' },
          apiKeySecretName: { type: ['string', 'null'] },
          modelosDisponibles: { type: 'array', items: { type: 'string' }, minItems: 1 },
          parametrosDefecto: { type: 'object' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            nombre: { type: 'string' },
            tipo: { type: 'string' },
            baseUrl: { type: 'string' },
            apiKeySecretName: { type: ['string', 'null'] },
            modelosDisponibles: { type: 'array', items: { type: 'string' } },
            parametrosDefecto: { type: 'object' }
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
        nombre?: string;
        tipo?: string;
        baseUrl?: string;
        apiKeySecretName?: string | null;
        modelosDisponibles?: string[];
        parametrosDefecto?: object;
      };

      const existingProvider = await prisma.aiProvider.findUnique({
        where: { id }
      });

      if (!existingProvider) {
        return reply.status(404).send({ error: 'AI Provider not found' });
      }

      const aiProvider = await prisma.aiProvider.update({
        where: { id },
        data
      });

      return reply.status(200).send(aiProvider);
    } catch (error: any) {
      if (error.code === 'P2002') {
        return reply.status(400).send({ error: 'AI Provider name already exists' });
      }
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Delete AI Provider
  fastify.delete('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['AI Providers'],
      description: 'Delete AI provider by ID',
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

      const existingProvider = await prisma.aiProvider.findUnique({
        where: { id }
      });

      if (!existingProvider) {
        return reply.status(404).send({ error: 'AI Provider not found' });
      }

      await prisma.aiProvider.delete({
        where: { id }
      });

      return reply.status(200).send({ message: 'AI Provider deleted successfully' });
    } catch (error) {
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
};

export default routes;