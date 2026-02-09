import type { FastifyPluginAsync } from 'fastify';
import type { PrismaClient } from '@prisma/client';

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // Schemas
  const userRoleSchema = {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      userId: { type: 'string', format: 'uuid' },
      role: { type: 'string' },
      createdAt: { type: 'string', format: 'date-time' }
    }
  };

  const createUserRoleSchema = {
    type: 'object',
    required: ['userId', 'role'],
    properties: {
      userId: { type: 'string', format: 'uuid' },
      role: { type: 'string' }
    }
  };

  const updateUserRoleSchema = {
    type: 'object',
    properties: {
      userId: { type: 'string', format: 'uuid' },
      role: { type: 'string' }
    }
  };

  const querySchema = {
    type: 'object',
    properties: {
      page: { type: 'integer', minimum: 1, default: 1 },
      limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
      userId: { type: 'string', format: 'uuid' },
      role: { type: 'string' }
    }
  };

  const paramsSchema = {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', format: 'uuid' }
    }
  };

  // GET /user-roles - List user roles with pagination
  fastify.get('/', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['UserRoles'],
      description: 'Get paginated list of user roles',
      querystring: querySchema,
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: userRoleSchema
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
      const { page = 1, limit = 10, userId, role } = request.query as any;
      const skip = (page - 1) * limit;

      const where: any = {};
      if (userId) where.userId = userId;
      if (role) where.role = role;

      const [userRoles, total] = await Promise.all([
        prisma.userRole.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' }
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
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // GET /user-roles/:id - Get user role by ID
  fastify.get('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['UserRoles'],
      description: 'Get user role by ID',
      params: paramsSchema,
      response: {
        200: userRoleSchema,
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

      const userRole = await prisma.userRole.findUnique({
        where: { id }
      });

      if (!userRole) {
        return reply.status(404).send({ error: 'User role not found' });
      }

      return reply.status(200).send(userRole);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // POST /user-roles - Create new user role
  fastify.post('/', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['UserRoles'],
      description: 'Create new user role',
      body: createUserRoleSchema,
      response: {
        201: userRoleSchema,
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
      const { userId, role } = request.body as { userId: string; role: string };

      const userRole = await prisma.userRole.create({
        data: {
          userId,
          role: role as any
        }
      });

      return reply.status(201).send(userRole);
    } catch (error: any) {
      fastify.log.error(error);
      
      if (error.code === 'P2002') {
        return reply.status(400).send({ error: 'User role combination already exists' });
      }
      
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // PUT /user-roles/:id - Update user role
  fastify.put('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['UserRoles'],
      description: 'Update user role by ID',
      params: paramsSchema,
      body: updateUserRoleSchema,
      response: {
        200: userRoleSchema,
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
      const updateData = request.body as { userId?: string; role?: string };

      const existingUserRole = await prisma.userRole.findUnique({
        where: { id }
      });

      if (!existingUserRole) {
        return reply.status(404).send({ error: 'User role not found' });
      }

      const data: any = {};
      if (updateData.userId) data.userId = updateData.userId;
      if (updateData.role) data.role = updateData.role;

      const userRole = await prisma.userRole.update({
        where: { id },
        data
      });

      return reply.status(200).send(userRole);
    } catch (error: any) {
      fastify.log.error(error);
      
      if (error.code === 'P2002') {
        return reply.status(400).send({ error: 'User role combination already exists' });
      }
      
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // DELETE /user-roles/:id - Delete user role
  fastify.delete('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['UserRoles'],
      description: 'Delete user role by ID',
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

      const existingUserRole = await prisma.userRole.findUnique({
        where: { id }
      });

      if (!existingUserRole) {
        return reply.status(404).send({ error: 'User role not found' });
      }

      await prisma.userRole.delete({
        where: { id }
      });

      return reply.status(200).send({ message: 'User role deleted successfully' });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
};

export default routes;