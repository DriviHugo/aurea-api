import type { FastifyPluginAsync } from 'fastify';
import type { PrismaClient } from '@prisma/client';

const aiFunctionVersionRoutes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // GET /ai-function-versions - List with pagination
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
          functionId: { type: 'string', format: 'uuid' },
          providerId: { type: 'string', format: 'uuid' }
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
                  providerId: { type: 'string', format: 'uuid' },
                  motivoCambio: { type: ['string', 'null'] },
                  creadoPor: { type: ['string', 'null'], format: 'uuid' },
                  createdAt: { type: 'string', format: 'date-time' },
                  funcion: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', format: 'uuid' },
                      nombre: { type: 'string' }
                    }
                  },
                  provider: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', format: 'uuid' },
                      nombre: { type: 'string' }
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
      const { page = 1, limit = 10, functionId, providerId } = request.query as any;
      const skip = (page - 1) * limit;

      const where: any = {};
      if (functionId) where.functionId = functionId;
      if (providerId) where.providerId = providerId;

      const [versions, total] = await Promise.all([
        prisma.aiFunctionVersion.findMany({
          where,
          skip,
          take: limit,
          orderBy: [
            { functionId: 'asc' },
            { version: 'desc' }
          ],
          include: {
            funcion: {
              select: {
                id: true,
                nombre: true
              }
            },
            provider: {
              select: {
                id: true,
                nombre: true
              }
            }
          }
        }),
        prisma.aiFunctionVersion.count({ where })
      ]);

      const totalPages = Math.ceil(total / limit);

      return reply.status(200).send({
        data: versions,
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

  // GET /ai-function-versions/:id - Get single version
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
            providerId: { type: 'string', format: 'uuid' },
            motivoCambio: { type: ['string', 'null'] },
            creadoPor: { type: ['string', 'null'], format: 'uuid' },
            createdAt: { type: 'string', format: 'date-time' },
            funcion: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                nombre: { type: 'string' }
              }
            },
            provider: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                nombre: { type: 'string' }
              }
            },
            creador: {
              type: ['object', 'null'],
              properties: {
                id: { type: 'string', format: 'uuid' },
                nombre: { type: 'string' }
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

      const version = await prisma.aiFunctionVersion.findUnique({
        where: { id },
        include: {
          funcion: {
            select: {
              id: true,
              nombre: true
            }
          },
          provider: {
            select: {
              id: true,
              nombre: true
            }
          },
          creador: {
            select: {
              id: true,
              nombre: true
            }
          }
        }
      });

      if (!version) {
        return reply.status(404).send({ error: 'AI function version not found' });
      }

      return reply.status(200).send(version);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // POST /ai-function-versions - Create new version
  fastify.post('/', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['AI Function Versions'],
      description: 'Create new AI function version',
      body: {
        type: 'object',
        required: ['functionId', 'version', 'systemPrompt', 'modelo', 'providerId'],
        properties: {
          functionId: { type: 'string', format: 'uuid' },
          version: { type: 'integer', minimum: 1 },
          systemPrompt: { type: 'string', minLength: 1 },
          userPromptTemplate: { type: ['string', 'null'] },
          toolSchema: { type: ['object', 'null'] },
          parametros: { type: ['object', 'null'] },
          modelo: { type: 'string', minLength: 1 },
          providerId: { type: 'string', format: 'uuid' },
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
            providerId: { type: 'string', format: 'uuid' },
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
      const data = request.body as any;

      // Verify function exists
      const functionExists = await prisma.aiFunction.findUnique({
        where: { id: data.functionId }
      });

      if (!functionExists) {
        return reply.status(400).send({ error: 'AI function not found' });
      }

      // Verify provider exists
      const providerExists = await prisma.aiProvider.findUnique({
        where: { id: data.providerId }
      });

      if (!providerExists) {
        return reply.status(400).send({ error: 'AI provider not found' });
      }

      // Check if version already exists for this function
      const existingVersion = await prisma.aiFunctionVersion.findUnique({
        where: {
          functionId_version: {
            functionId: data.functionId,
            version: data.version
          }
        }
      });

      if (existingVersion) {
        return reply.status(400).send({ error: 'Version already exists for this function' });
      }

      const version = await prisma.aiFunctionVersion.create({
        data: {
          functionId: data.functionId,
          version: data.version,
          systemPrompt: data.systemPrompt,
          userPromptTemplate: data.userPromptTemplate,
          toolSchema: data.toolSchema,
          parametros: data.parametros,
          modelo: data.modelo,
          providerId: data.providerId,
          motivoCambio: data.motivoCambio,
          creadoPor: data.creadoPor
        }
      });

      return reply.status(201).send(version);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // PUT /ai-function-versions/:id - Update version
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
          providerId: { type: 'string', format: 'uuid' },
          motivoCambio: { type: ['string', 'null'] }
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
            providerId: { type: 'string', format: 'uuid' },
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
      const data = request.body as any;

      // Check if version exists
      const existingVersion = await prisma.aiFunctionVersion.findUnique({
        where: { id }
      });

      if (!existingVersion) {
        return reply.status(404).send({ error: 'AI function version not found' });
      }

      // If providerId is being updated, verify it exists
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
        data: {
          ...(data.systemPrompt !== undefined && { systemPrompt: data.systemPrompt }),
          ...(data.userPromptTemplate !== undefined && { userPromptTemplate: data.userPromptTemplate }),
          ...(data.toolSchema !== undefined && { toolSchema: data.toolSchema }),
          ...(data.parametros !== undefined && { parametros: data.parametros }),
          ...(data.modelo !== undefined && { modelo: data.modelo }),
          ...(data.providerId !== undefined && { providerId: data.providerId }),
          ...(data.motivoCambio !== undefined && { motivoCambio: data.motivoCambio })
        }
      });

      return reply.status(200).send(updatedVersion);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // DELETE /ai-function-versions/:id - Delete version
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

      // Check if version exists
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

export default aiFunctionVersionRoutes;