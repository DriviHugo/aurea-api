import type { FastifyPluginAsync } from 'fastify';
import type { PrismaClient } from '@prisma/client';

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // List UserRoles with pagination
  fastify.get('/', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['UserRoles'],
      description: 'Get paginated list of user roles',
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
          userId: { type: 'string', format: 'uuid' }
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
                  userId: { type: 'string' },
                  role: { type: 'string' },
                  createdAt: { type: 'string', format: 'date-time' }
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
      const { page = 1, limit = 10, userId } = request.query as any;
      const skip = (page - 1) * limit;

      const where = userId ? { userId } : {};

      const [userRoles, total] = await Promise.all([
        prisma.userRole.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        }),
        prisma.userRole.count({ where })
      ]);

      const totalPages = Math.ceil(total / limit);

      return reply.status(200).send({
        data: userRoles,
        total,
        page,
        limit,
        totalPages
      });
    } catch (error) {
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Get UserRole by ID
  fastify.get('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['UserRoles'],
      description: 'Get user role by ID',
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
            userId: { type: 'string' },
            role: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                firstName: { type: 'string' },
                lastName: { type: 'string' },
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

      const userRole = await prisma.userRole.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });

      if (!userRole) {
        return reply.status(404).send({ error: 'User role not found' });
      }

      return reply.status(200).send(userRole);
    } catch (error) {
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Create UserRole
  fastify.post('/', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['UserRoles'],
      description: 'Create a new user role',
      body: {
        type: 'object',
        required: ['userId', 'role'],
        properties: {
          userId: { type: 'string', format: 'uuid' },
          role: { type: 'string', enum: ['ADMIN', 'USER', 'MODERATOR'] }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            role: { type: 'string' },
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
      const { userId, role } = request.body as { userId: string; role: any };

      // Check if user exists
      const userExists = await prisma.profile.findUnique({
        where: { id: userId }
      });

      if (!userExists) {
        return reply.status(400).send({ error: 'User not found' });
      }

      // Check if user role combination already exists
      const existingUserRole = await prisma.userRole.findUnique({
        where: {
          userId_role: {
            userId,
            role
          }
        }
      });

      if (existingUserRole) {
        return reply.status(400).send({ error: 'User role combination already exists' });
      }

      const userRole = await prisma.userRole.create({
        data: {
          userId,
          role
        }
      });

      return reply.status(201).send(userRole);
    } catch (error) {
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Update UserRole
  fastify.put('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['UserRoles'],
      description: 'Update user role by ID',
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      },
      body: {
        type: 'object',
        required: ['role'],
        properties: {
          role: { type: 'string', enum: ['ADMIN', 'USER', 'MODERATOR'] }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            role: { type: 'string' },
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
      const { role } = request.body as { role: any };

      const existingUserRole = await prisma.userRole.findUnique({
        where: { id }
      });

      if (!existingUserRole) {
        return reply.status(404).send({ error: 'User role not found' });
      }

      // Check if the new role combination would create a duplicate
      if (existingUserRole.role !== role) {
        const duplicateCheck = await prisma.userRole.findUnique({
          where: {
            userId_role: {
              userId: existingUserRole.userId,
              role
            }
          }
        });

        if (duplicateCheck) {
          return reply.status(400).send({ error: 'User role combination already exists' });
        }
      }

      const userRole = await prisma.userRole.update({
        where: { id },
        data: { role }
      });

      return reply.status(200).send(userRole);
    } catch (error) {
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Delete UserRole
  fastify.delete('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['UserRoles'],
      description: 'Delete user role by ID',
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

      const userRole = await prisma.userRole.findUnique({
        where: { id }
      });

      if (!userRole) {
        return reply.status(404).send({ error: 'User role not found' });
      }

      await prisma.userRole.delete({
        where: { id }
      });

      return reply.status(200).send({ message: 'User role deleted successfully' });
    } catch (error) {
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
};

export default routes;