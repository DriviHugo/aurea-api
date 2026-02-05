import type { FastifyPluginAsync } from 'fastify';
import type { PrismaClient } from '@prisma/client';

interface PaginationQuery {
  page?: number;
  limit?: number;
  userId?: string;
}

interface UserRoleBody {
  userId: string;
  role: string;
}

interface UserRoleParams {
  id: string;
}

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // GET /user-roles - List user roles with pagination
  fastify.get<{
    Querystring: PaginationQuery;
  }>('/', {
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
                  id: { type: 'string', format: 'uuid' },
                  userId: { type: 'string', format: 'uuid' },
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
      const { page = 1, limit = 10, userId } = request.query;
      const skip = (page - 1) * limit;

      const where = userId ? { userId } : {};

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
  fastify.get<{
    Params: UserRoleParams;
  }>('/:id', {
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
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            role: { type: 'string' },
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
      const { id } = request.params;

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
  fastify.post<{
    Body: UserRoleBody;
  }>('/', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['UserRoles'],
      description: 'Create a new user role',
      body: {
        type: 'object',
        required: ['userId', 'role'],
        properties: {
          userId: { type: 'string', format: 'uuid' },
          role: { type: 'string', enum: ['ADMIN', 'SUPERVISOR', 'USER'] }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
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
      const { userId, role } = request.body;

      // Check if user role combination already exists
      const existingUserRole = await prisma.userRole.findUnique({
        where: {
          userId_role: {
            userId,
            role: role as any
          }
        }
      });

      if (existingUserRole) {
        return reply.status(400).send({ error: 'User role combination already exists' });
      }

      const userRole = await prisma.userRole.create({
        data: {
          userId,
          role: role as any
        }
      });

      return reply.status(201).send(userRole);
    } catch (error) {
      fastify.log.error(error);
      if (error.code === 'P2002') {
        return reply.status(400).send({ error: 'User role combination already exists' });
      }
      if (error.code === 'P2003') {
        return reply.status(400).send({ error: 'Referenced user does not exist' });
      }
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // PUT /user-roles/:id - Update user role
  fastify.put<{
    Params: UserRoleParams;
    Body: UserRoleBody;
  }>('/:id', {
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
        required: ['userId', 'role'],
        properties: {
          userId: { type: 'string', format: 'uuid' },
          role: { type: 'string', enum: ['ADMIN', 'SUPERVISOR', 'USER'] }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            role: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
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
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const { userId, role } = request.body;

      // Check if user role exists
      const existingUserRole = await prisma.userRole.findUnique({
        where: { id }
      });

      if (!existingUserRole) {
        return reply.status(404).send({ error: 'User role not found' });
      }

      // Check if the new combination would create a duplicate (excluding current record)
      const duplicateUserRole = await prisma.userRole.findFirst({
        where: {
          userId,
          role: role as any,
          id: { not: id }
        }
      });

      if (duplicateUserRole) {
        return reply.status(400).send({ error: 'User role combination already exists' });
      }

      const userRole = await prisma.userRole.update({
        where: { id },
        data: {
          userId,
          role: role as any
        }
      });

      return reply.status(200).send(userRole);
    } catch (error) {
      fastify.log.error(error);
      if (error.code === 'P2002') {
        return reply.status(400).send({ error: 'User role combination already exists' });
      }
      if (error.code === 'P2003') {
        return reply.status(400).send({ error: 'Referenced user does not exist' });
      }
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // DELETE /user-roles/:id - Delete user role
  fastify.delete<{
    Params: UserRoleParams;
  }>('/:id', {
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
      const { id } = request.params;

      // Check if user role exists
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

This implementation provides:

1. **Complete CRUD operations** for UserRole model
2. **Pagination** with page/limit parameters and proper response format
3. **Authentication** using `authAccessToken` preValidation hook
4. **Comprehensive error handling** including Prisma-specific errors (P2002, P2003)
5. **AJV schema validation** for all request/response bodies
6. **Swagger/OpenAPI documentation** with proper tags and descriptions
7. **Unique constraint handling** for the `userId + role` combination
8. **Proper HTTP status codes** (200, 201, 400, 404, 500)
9. **TypeScript interfaces** for type safety
10. **Production-ready error logging** and responses

The routes handle the unique constraint on `[userId, role]` and provide filtering by `userId` in the list endpoint for better usability.