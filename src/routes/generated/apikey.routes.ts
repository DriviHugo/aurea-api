import type { FastifyPluginAsync } from 'fastify';
import type { PrismaClient } from '@prisma/client';

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // AJV Schemas
  const apiKeyCreateSchema = {
    type: 'object',
    required: ['name', 'keyHash', 'scopes'],
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 255 },
      keyHash: { type: 'string', minLength: 1 },
      scopes: {
        type: 'array',
        items: { type: 'string' },
        minItems: 1
      },
      isActive: { type: 'boolean' },
      allowedIps: {
        type: 'array',
        items: { type: 'string' }
      },
      allowedDomains: {
        type: 'array',
        items: { type: 'string' }
      }
    },
    additionalProperties: false
  };

  const apiKeyUpdateSchema = {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 255 },
      scopes: {
        type: 'array',
        items: { type: 'string' },
        minItems: 1
      },
      isActive: { type: 'boolean' },
      allowedIps: {
        type: 'array',
        items: { type: 'string' }
      },
      allowedDomains: {
        type: 'array',
        items: { type: 'string' }
      }
    },
    additionalProperties: false
  };

  const apiKeyResponseSchema = {
    type: 'object',
    properties: {
      keyId: { type: 'string' },
      name: { type: 'string' },
      keyHash: { type: 'string' },
      scopes: {
        type: 'array',
        items: { type: 'string' }
      },
      isActive: { type: 'boolean' },
      allowedIps: {
        type: 'array',
        items: { type: 'string' }
      },
      allowedDomains: {
        type: 'array',
        items: { type: 'string' }
      },
      lastUsedAt: { type: 'string', format: 'date-time', nullable: true },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' }
    }
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
      id: { type: 'string' }
    }
  };

  const errorSchema = {
    type: 'object',
    properties: {
      error: { type: 'string' }
    }
  };

  // GET /api-keys - List API keys with pagination
  fastify.get('/', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['API Keys'],
      description: 'Get paginated list of API keys',
      querystring: paginationQuerySchema,
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: apiKeyResponseSchema
            },
            total: { type: 'integer' },
            page: { type: 'integer' },
            limit: { type: 'integer' },
            totalPages: { type: 'integer' }
          }
        },
        500: errorSchema
      }
    }
  }, async (request, reply) => {
    try {
      const { page = 1, limit = 10 } = request.query as { page?: number; limit?: number };
      const skip = (page - 1) * limit;

      const [apiKeys, total] = await Promise.all([
        prisma.apiKeyEntity.findMany({
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.apiKeyEntity.count()
      ]);

      const totalPages = Math.ceil(total / limit);

      return reply.status(200).send({
        data: apiKeys,
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

  // GET /api-keys/:id - Get single API key
  fastify.get('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['API Keys'],
      description: 'Get API key by ID',
      params: idParamsSchema,
      response: {
        200: apiKeyResponseSchema,
        404: errorSchema,
        500: errorSchema
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const apiKey = await prisma.apiKeyEntity.findUnique({
        where: { keyId: id }
      });

      if (!apiKey) {
        return reply.status(404).send({ error: 'API key not found' });
      }

      return reply.status(200).send(apiKey);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // POST /api-keys - Create new API key
  fastify.post('/', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['API Keys'],
      description: 'Create new API key',
      body: apiKeyCreateSchema,
      response: {
        201: apiKeyResponseSchema,
        400: errorSchema,
        500: errorSchema
      }
    }
  }, async (request, reply) => {
    try {
      const data = request.body as {
        name: string;
        keyHash: string;
        scopes: string[];
        isActive?: boolean;
        allowedIps?: string[];
        allowedDomains?: string[];
      };

      // Check if keyHash already exists
      const existingKey = await prisma.apiKeyEntity.findUnique({
        where: { keyHash: data.keyHash }
      });

      if (existingKey) {
        return reply.status(400).send({ error: 'API key hash already exists' });
      }

      const apiKey = await prisma.apiKeyEntity.create({
        data: {
          name: data.name,
          keyHash: data.keyHash,
          scopes: data.scopes,
          isActive: data.isActive ?? true,
          allowedIps: data.allowedIps ?? [],
          allowedDomains: data.allowedDomains ?? []
        }
      });

      return reply.status(201).send(apiKey);
    } catch (error) {
      fastify.log.error(error);
      if (error.code === 'P2002') {
        return reply.status(400).send({ error: 'API key hash already exists' });
      }
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // PUT /api-keys/:id - Update API key
  fastify.put('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['API Keys'],
      description: 'Update API key by ID',
      params: idParamsSchema,
      body: apiKeyUpdateSchema,
      response: {
        200: apiKeyResponseSchema,
        400: errorSchema,
        404: errorSchema,
        500: errorSchema
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = request.body as {
        name?: string;
        scopes?: string[];
        isActive?: boolean;
        allowedIps?: string[];
        allowedDomains?: string[];
      };

      // Check if API key exists
      const existingApiKey = await prisma.apiKeyEntity.findUnique({
        where: { keyId: id }
      });

      if (!existingApiKey) {
        return reply.status(404).send({ error: 'API key not found' });
      }

      const updatedApiKey = await prisma.apiKeyEntity.update({
        where: { keyId: id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.scopes !== undefined && { scopes: data.scopes }),
          ...(data.isActive !== undefined && { isActive: data.isActive }),
          ...(data.allowedIps !== undefined && { allowedIps: data.allowedIps }),
          ...(data.allowedDomains !== undefined && { allowedDomains: data.allowedDomains })
        }
      });

      return reply.status(200).send(updatedApiKey);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // DELETE /api-keys/:id - Delete API key
  fastify.delete('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['API Keys'],
      description: 'Delete API key by ID',
      params: idParamsSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' }
          }
        },
        404: errorSchema,
        500: errorSchema
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      // Check if API key exists
      const existingApiKey = await prisma.apiKeyEntity.findUnique({
        where: { keyId: id }
      });

      if (!existingApiKey) {
        return reply.status(404).send({ error: 'API key not found' });
      }

      await prisma.apiKeyEntity.delete({
        where: { keyId: id }
      });

      return reply.status(200).send({ message: 'API key deleted successfully' });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
};

export default routes;
