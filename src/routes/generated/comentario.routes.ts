import type { FastifyPluginAsync } from 'fastify';
import type { PrismaClient } from '@prisma/client';

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // List comentarios with pagination
  fastify.get('/', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['Comentarios'],
      description: 'Get paginated list of comentarios',
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
          revisionId: { type: 'string', format: 'uuid' },
          usuarioId: { type: 'string', format: 'uuid' }
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
                  revisionId: { type: 'string', format: 'uuid' },
                  usuarioId: { type: 'string', format: 'uuid' },
                  rol: { type: 'string', enum: ['ADMIN', 'EDITOR', 'VIEWER'] },
                  texto: { type: 'string' },
                  createdAt: { type: 'string', format: 'date-time' },
                  revision: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', format: 'uuid' },
                      titulo: { type: 'string' }
                    }
                  },
                  usuario: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', format: 'uuid' },
                      nombre: { type: 'string' },
                      email: { type: 'string' }
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
      const { page = 1, limit = 10, revisionId, usuarioId } = request.query as {
        page?: number;
        limit?: number;
        revisionId?: string;
        usuarioId?: string;
      };

      const skip = (page - 1) * limit;

      const where: any = {};
      if (revisionId) where.revisionId = revisionId;
      if (usuarioId) where.usuarioId = usuarioId;

      const [comentarios, total] = await Promise.all([
        prisma.comentario.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            revision: {
              select: {
                id: true,
                titulo: true
              }
            },
            usuario: {
              select: {
                id: true,
                nombre: true,
                email: true
              }
            }
          }
        }),
        prisma.comentario.count({ where })
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

  // Get comentario by ID
  fastify.get('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['Comentarios'],
      description: 'Get comentario by ID',
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
            revisionId: { type: 'string', format: 'uuid' },
            usuarioId: { type: 'string', format: 'uuid' },
            rol: { type: 'string', enum: ['ADMIN', 'EDITOR', 'VIEWER'] },
            texto: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            revision: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                titulo: { type: 'string' }
              }
            },
            usuario: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                nombre: { type: 'string' },
                email: { type: 'string' }
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

      const comentario = await prisma.comentario.findUnique({
        where: { id },
        include: {
          revision: {
            select: {
              id: true,
              titulo: true
            }
          },
          usuario: {
            select: {
              id: true,
              nombre: true,
              email: true
            }
          }
        }
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

  // Create comentario
  fastify.post('/', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['Comentarios'],
      description: 'Create new comentario',
      body: {
        type: 'object',
        required: ['revisionId', 'usuarioId', 'rol', 'texto'],
        properties: {
          revisionId: { type: 'string', format: 'uuid' },
          usuarioId: { type: 'string', format: 'uuid' },
          rol: { type: 'string', enum: ['ADMIN', 'EDITOR', 'VIEWER'] },
          texto: { type: 'string', minLength: 1, maxLength: 2000 }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            revisionId: { type: 'string', format: 'uuid' },
            usuarioId: { type: 'string', format: 'uuid' },
            rol: { type: 'string', enum: ['ADMIN', 'EDITOR', 'VIEWER'] },
            texto: { type: 'string' },
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
      const { revisionId, usuarioId, rol, texto } = request.body as {
        revisionId: string;
        usuarioId: string;
        rol: 'ADMIN' | 'EDITOR' | 'VIEWER';
        texto: string;
      };

      // Verify revision exists
      const revision = await prisma.revision.findUnique({
        where: { id: revisionId }
      });

      if (!revision) {
        return reply.status(400).send({ error: 'Revision not found' });
      }

      // Verify usuario exists
      const usuario = await prisma.profile.findUnique({
        where: { id: usuarioId }
      });

      if (!usuario) {
        return reply.status(400).send({ error: 'Usuario not found' });
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

  // Update comentario
  fastify.put('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['Comentarios'],
      description: 'Update comentario by ID',
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
          rol: { type: 'string', enum: ['ADMIN', 'EDITOR', 'VIEWER'] },
          texto: { type: 'string', minLength: 1, maxLength: 2000 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            revisionId: { type: 'string', format: 'uuid' },
            usuarioId: { type: 'string', format: 'uuid' },
            rol: { type: 'string', enum: ['ADMIN', 'EDITOR', 'VIEWER'] },
            texto: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' }
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
      const updateData = request.body as {
        rol?: 'ADMIN' | 'EDITOR' | 'VIEWER';
        texto?: string;
      };

      const existingComentario = await prisma.comentario.findUnique({
        where: { id }
      });

      if (!existingComentario) {
        return reply.status(404).send({ error: 'Comentario not found' });
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

  // Delete comentario
  fastify.delete('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['Comentarios'],
      description: 'Delete comentario by ID',
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