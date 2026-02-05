import type { FastifyPluginAsync } from 'fastify';
import type { PrismaClient } from '@prisma/client';

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // AJV Schemas
  const aiFunctionSchema = {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      codigo: { type: 'string' },
      nombre: { type: 'string' },
      descripcion: { type: 'string', nullable: true },
      categoria: { type: 'string' },
      providerId: { type: 'string', format: 'uuid' },
      modelo: { type: 'string' },
      systemPrompt: { type: 'string' },
      userPromptTemplate: { type: 'string', nullable: true },
      toolSchema: { type: 'object', nullable: true },
      parametros: { type: 'object' }
    }
  };

  const createAiFunctionSchema = {
    type: 'object',
    required: ['codigo', 'nombre', 'categoria', 'providerId', 'modelo', 'systemPrompt'],
    properties: {
      codigo: { type: 'string', minLength: 1 },
      nombre: { type: 'string', minLength: 1 },
      descripcion: { type: 'string' },
      categoria: { type: 'string', minLength: 1 },
      providerId: { type: 'string', format: 'uuid' },
      modelo: { type: 'string', minLength: 1 },
      systemPrompt: { type: 'string', minLength: 1 },
      userPromptTemplate: { type: 'string' },
      toolSchema: { type: 'object' },
      parametros: { type: 'object' }
    }
  };

  const updateAiFunctionSchema = {
    type: 'object',
    properties: {
      codigo: { type: 'string', minLength: 1 },
      nombre: { type: 'string', minLength: 1 },
      descripcion: { type: 'string' },
      categoria: { type: 'string', minLength: 1 },
      providerId: { type: 'string', format: 'uuid' },
      modelo: { type: 'string', minLength: 1 },
      systemPrompt: { type: 'string', minLength: 1 },
      userPromptTemplate: { type: 'string' },
      toolSchema: { type: 'object' },
      parametros: { type: 'object' }
    }
  };

  const paginationSchema = {
    type: 'object',
    properties: {
      page: { type: 'integer', minimum: 1, default: 1 },
      limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 }
    }
  };

  const paramsSchema = {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', format: 'uuid' }
    }
  };

  // GET /ai-functions - List all AI functions with pagination
  fastify.get('/', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['AI Functions'],
      description: 'Get all AI functions with pagination',
      querystring: paginationSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: aiFunctionSchema
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

      const [aiFunctions, total] = await Promise.all([
        prisma.aiFunction.findMany({
          skip,
          take: limit,
          orderBy: { nombre: 'asc' }
        }),
        prisma.aiFunction.count()
      ]);

      const totalPages = Math.ceil(total / limit);

      return reply.status(200).send({
        data: aiFunctions,
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

  // GET /ai-functions/:id - Get AI function by ID
  fastify.get('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['AI Functions'],
      description: 'Get AI function by ID',
      params: paramsSchema,
      response: {
        200: aiFunctionSchema,
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

      const aiFunction = await prisma.aiFunction.findUnique({
        where: { id }
      });

      if (!aiFunction) {
        return reply.status(404).send({ error: 'AI Function not found' });
      }

      return reply.status(200).send(aiFunction);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // POST /ai-functions - Create new AI function
  fastify.post('/', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['AI Functions'],
      description: 'Create new AI function',
      body: createAiFunctionSchema,
      response: {
        201: aiFunctionSchema,
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
        codigo: string;
        nombre: string;
        descripcion?: string;
        categoria: string;
        providerId: string;
        modelo: string;
        systemPrompt: string;
        userPromptTemplate?: string;
        toolSchema?: object;
        parametros?: object;
      };

      // Set default parametros if not provided
      const parametros = data.parametros || { temperature: 0.3 };

      const aiFunction = await prisma.aiFunction.create({
        data: {
          ...data,
          parametros
        }
      });

      return reply.status(201).send(aiFunction);
    } catch (error: any) {
      fastify.log.error(error);
      
      // Handle unique constraint violation
      if (error.code === 'P2002' && error.meta?.target?.includes('codigo')) {
        return reply.status(400).send({ error: 'AI Function with this codigo already exists' });
      }

      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // PUT /ai-functions/:id - Update AI function
  fastify.put('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['AI Functions'],
      description: 'Update AI function by ID',
      params: paramsSchema,
      body: updateAiFunctionSchema,
      response: {
        200: aiFunctionSchema,
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
        codigo?: string;
        nombre?: string;
        descripcion?: string;
        categoria?: string;
        providerId?: string;
        modelo?: string;
        systemPrompt?: string;
        userPromptTemplate?: string;
        toolSchema?: object;
        parametros?: object;
      };

      // Check if AI function exists
      const existingAiFunction = await prisma.aiFunction.findUnique({
        where: { id }
      });

      if (!existingAiFunction) {
        return reply.status(404).send({ error: 'AI Function not found' });
      }

      const updatedAiFunction = await prisma.aiFunction.update({
        where: { id },
        data
      });

      return reply.status(200).send(updatedAiFunction);
    } catch (error: any) {
      fastify.log.error(error);
      
      // Handle unique constraint violation
      if (error.code === 'P2002' && error.meta?.target?.includes('codigo')) {
        return reply.status(400).send({ error: 'AI Function with this codigo already exists' });
      }

      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // DELETE /ai-functions/:id - Delete AI function
  fastify.delete('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['AI Functions'],
      description: 'Delete AI function by ID',
      params: paramsSchema,
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

      // Check if AI function exists
      const existingAiFunction = await prisma.aiFunction.findUnique({
        where: { id }
      });

      if (!existingAiFunction) {
        return reply.status(404).send({ error: 'AI Function not found' });
      }

      await prisma.aiFunction.delete({
        where: { id }
      });

      return reply.status(200).send({ message: 'AI Function deleted successfully' });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
};

export default routes;