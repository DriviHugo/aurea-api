import type { FastifyPluginAsync } from 'fastify';
import type { PrismaClient } from '@prisma/client';

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // Schemas
  const comentarioSchema = {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      revisionId: { type: 'string', format: 'uuid' },
      usuarioId: { type: 'string', format: 'uuid' },
      rol: { type: 'string', enum: ['ADMIN', 'REVISOR', 'USUARIO'] },
      texto: { type: 'string' },
      createdAt: { type: 'string', format: 'date-time' }
    }
  };

  const createComentarioSchema = {
    type: 'object',
    required: ['revisionId', 'usuarioId', 'rol', 'texto'],
    properties: {
      revisionId: { type: 'string', format: 'uuid' },
      usuarioId: { type: 'string', format: 'uuid' },
      rol: { type: 'string', enum: ['ADMIN', 'REVISOR', 'USUARIO'] },
      texto: { type: 'string', minLength: 1, maxLength: 2000 }
    }
  };

  const updateComentarioSchema = {
    type: 'object',
    properties: {
      revisionId: { type: 'string', format: 'uuid' },
      usuarioId: { type: 'string', format: 'uuid' },
      rol: { type: 'string', enum: ['ADMIN', 'REVISOR', 'USUARIO'] },
      texto: { type: 'string', minLength: 1, maxLength: 2000 }
    }
  };

  const paginationSchema = {
    type: 'object',
    properties: {
      page: { type: 'integer', minimum: 1, default: 1 },
      limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 }
    }
  };

  const idParamSchema = {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', format: 'uuid' }
    }
  };

  // GET /comentarios - List with pagination
  fastify.get('/', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['Comentarios'],
      description: 'Get paginated list of comentarios',
      querystring: paginationSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: comentarioSchema
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

      const [comentarios, total] = await Promise.all([
        prisma.comentario.findMany({
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.comentario.count()
      ]);

      const totalPages = Math.ceil(total / limit);

      return reply.status(200).send({
        data: comentarios,
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

  // GET /comentarios/:id - Get by ID
  fastify.get('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['Comentarios'],
      description: 'Get comentario by ID',
      params: idParamSchema,
      response: {
        200: comentarioSchema,
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

      const comentario = await prisma.comentario.findUnique({
        where: { id }
      });

      if (!comentario) {
        return reply.status(404).send({ error: 'Comentario not found' });
      }

      return reply.status(200).send(comentario);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // POST /comentarios - Create
  fastify.post('/', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['Comentarios'],
      description: 'Create new comentario',
      body: createComentarioSchema,
      response: {
        201: comentarioSchema,
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
      const { revisionId, usuarioId, rol, texto } = request.body as {
        revisionId: string;
        usuarioId: string;
        rol: 'ADMIN' | 'REVISOR' | 'USUARIO';
        texto: string;
      };

      // Verify revision exists
      const revisionExists = await prisma.revision.findUnique({
        where: { id: revisionId }
      });

      if (!revisionExists) {
        return reply.status(400).send({ error: 'Revision not found' });
      }

      const comentario = await prisma.comentario.create({
        data: {
          revisionId,
          usuarioId,
          rol,
          texto
        }
      });

      return reply.status(201).send(comentario);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // PUT /comentarios/:id - Update
  fastify.put('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['Comentarios'],
      description: 'Update comentario by ID',
      params: idParamSchema,
      body: updateComentarioSchema,
      response: {
        200: comentarioSchema,
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
        revisionId?: string;
        usuarioId?: string;
        rol?: 'ADMIN' | 'REVISOR' | 'USUARIO';
        texto?: string;
      };

      // Check if comentario exists
      const existingComentario = await prisma.comentario.findUnique({
        where: { id }
      });

      if (!existingComentario) {
        return reply.status(404).send({ error: 'Comentario not found' });
      }

      // If revisionId is being updated, verify it exists
      if (updateData.revisionId && updateData.revisionId !== existingComentario.revisionId) {
        const revisionExists = await prisma.revision.findUnique({
          where: { id: updateData.revisionId }
        });

        if (!revisionExists) {
          return reply.status(400).send({ error: 'Revision not found' });
        }
      }

      const comentario = await prisma.comentario.update({
        where: { id },
        data: updateData
      });

      return reply.status(200).send(comentario);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // DELETE /comentarios/:id - Delete
  fastify.delete('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['Comentarios'],
      description: 'Delete comentario by ID',
      params: idParamSchema,
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

      // Check if comentario exists
      const existingComentario = await prisma.comentario.findUnique({
        where: { id }
      });

      if (!existingComentario) {
        return reply.status(404).send({ error: 'Comentario not found' });
      }

      await prisma.comentario.delete({
        where: { id }
      });

      return reply.status(200).send({ message: 'Comentario deleted successfully' });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
};

export default routes;