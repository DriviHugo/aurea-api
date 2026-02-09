import type { FastifyPluginAsync } from 'fastify';
import type { PrismaClient } from '@prisma/client';

const aiFunctionSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    codigo: { type: 'string' },
    nombre: { type: 'string' },
    descripcion: { type: ['string', 'null'] },
    categoria: { type: 'string' },
    providerId: { type: ['string', 'null'], format: 'uuid' },
    modelo: { type: 'string' },
    systemPrompt: { type: 'string' },
    userPromptTemplate: { type: ['string', 'null'] },
    toolSchema: { type: ['object', 'null'] },
    parametros: { type: 'object' }
  }
};

const createAiFunctionSchema = {
  type: 'object',
  required: ['codigo', 'nombre', 'categoria', 'modelo', 'systemPrompt'],
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
    parametros: { type: 'object', default: { temperature: 0.3 } }
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

const queryStringSchema = {
  type: 'object',
  properties: {
    page: { type: 'integer', minimum: 1, default: 1 },
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
    categoria: { type: 'string' },
    search: { type: 'string' }
  }
};

const paramsSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string', format: 'uuid' }
  }
};

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // GET /ai-functions - List AI functions with pagination
  fastify.get('/', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['AI Functions'],
      description: 'Get paginated list of AI functions',
      querystring: queryStringSchema,
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
      const { page = 1, limit = 10, categoria, search } = request.query as any;
      const skip = (page - 1) * limit;

      const where: any = {};
      
      if (categoria) {
        where.categoria = categoria;
      }
      
      if (search) {
        where.OR = [
          { nombre: { contains: search, mode: 'insensitive' } },
          { descripcion: { contains: search, mode: 'insensitive' } },
          { codigo: { contains: search, mode: 'insensitive' } }
        ];
      }

      const [data, total] = await Promise.all([
        prisma.aiFunction.findMany({
          where,
          skip,
          take: limit,
          orderBy: { nombre: 'asc' }
        }),
        prisma.aiFunction.count({ where })
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
        return reply.status(404).send({ error: 'AI function not found' });
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
      const data = request.body as any;

      // Check if codigo already exists
      const existingFunction = await prisma.aiFunction.findUnique({
        where: { codigo: data.codigo }
      });

      if (existingFunction) {
        return reply.status(400).send({ error: 'AI function with this codigo already exists' });
      }

      // Set default parametros if not provided
      if (!data.parametros) {
        data.parametros = { temperature: 0.3 };
      }

      const aiFunction = await prisma.aiFunction.create({
        data: {
          codigo: data.codigo,
          nombre: data.nombre,
          descripcion: data.descripcion || null,
          categoria: data.categoria,
          providerId: data.providerId || null,
          modelo: data.modelo,
          systemPrompt: data.systemPrompt,
          userPromptTemplate: data.userPromptTemplate || null,
          toolSchema: data.toolSchema || null,
          parametros: data.parametros
        }
      });

      return reply.status(201).send(aiFunction);
    } catch (error) {
      fastify.log.error(error);
      if (error.code === 'P2002') {
        return reply.status(400).send({ error: 'AI function with this codigo already exists' });
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
      const data = request.body as any;

      // Check if AI function exists
      const existingFunction = await prisma.aiFunction.findUnique({
        where: { id }
      });

      if (!existingFunction) {
        return reply.status(404).send({ error: 'AI function not found' });
      }

      // Check if codigo is being changed and if it conflicts with another record
      if (data.codigo && data.codigo !== existingFunction.codigo) {
        const codeConflict = await prisma.aiFunction.findUnique({
          where: { codigo: data.codigo }
        });

        if (codeConflict) {
          return reply.status(400).send({ error: 'AI function with this codigo already exists' });
        }
      }

      const updatedFunction = await prisma.aiFunction.update({
        where: { id },
        data: {
          ...(data.codigo && { codigo: data.codigo }),
          ...(data.nombre && { nombre: data.nombre }),
          ...(data.descripcion !== undefined && { descripcion: data.descripcion }),
          ...(data.categoria && { categoria: data.categoria }),
          ...(data.providerId !== undefined && { providerId: data.providerId }),
          ...(data.modelo && { modelo: data.modelo }),
          ...(data.systemPrompt && { systemPrompt: data.systemPrompt }),
          ...(data.userPromptTemplate !== undefined && { userPromptTemplate: data.userPromptTemplate }),
          ...(data.toolSchema !== undefined && { toolSchema: data.toolSchema }),
          ...(data.parametros && { parametros: data.parametros })
        }
      });

      return reply.status(200).send(updatedFunction);
    } catch (error) {
      fastify.log.error(error);
      if (error.code === 'P2002') {
        return reply.status(400).send({ error: 'AI function with this codigo already exists' });
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
      const existingFunction = await prisma.aiFunction.findUnique({
        where: { id }
      });

      if (!existingFunction) {
        return reply.status(404).send({ error: 'AI function not found' });
      }

      await prisma.aiFunction.delete({
        where: { id }
      });

      return reply.status(200).send({ message: 'AI function deleted successfully' });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
};

export default routes;