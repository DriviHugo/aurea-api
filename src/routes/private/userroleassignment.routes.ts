import type { FastifyPluginAsync } from "fastify";
import type { PrismaClient } from "@prisma/client";

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;
  const allowedRoles = new Set(["admin", "processor"]);

  const countActiveAdmins = async (excludeUserId?: string) => {
    const adminAssignments = await prisma.userRoleAssignment.findMany({
      where: {
        role: "admin",
        ...(excludeUserId ? { userId: { not: excludeUserId } } : {}),
      },
      select: { userId: true },
    });

    if (adminAssignments.length === 0) return 0;

    return prisma.profile.count({
      where: {
        id: { in: adminAssignments.map((assignment) => assignment.userId) },
        active: true,
      },
    });
  };

  // List UserRoles with pagination
  fastify.get(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["UserRoles"],
        description: "Get paginated list of user roles",
        querystring: {
          type: "object",
          properties: {
            page: { type: "integer", minimum: 1, default: 1 },
            limit: { type: "integer", minimum: 1, maximum: 100, default: 10 },
            userId: { type: "string", format: "uuid" },
            role: { type: "string" },
          },
        },
        response: {
          404: { type: "object", properties: { error: { type: "string" } } },
          500: { type: "object", properties: { error: { type: "string" } } },
          200: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string", format: "uuid" },
                    userId: { type: "string", format: "uuid" },
                    role: { type: "string" },
                    createdAt: { type: "string", format: "date-time" },
                  },
                },
              },
              total: { type: "integer" },
              page: { type: "integer" },
              limit: { type: "integer" },
              totalPages: { type: "integer" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { page = 1, limit = 10, userId, role } = request.query as any;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (userId) where.userId = userId;
        if (role) where.role = role;

        const [userRoles, total] = await Promise.all([
          prisma.userRoleAssignment.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
          }),
          prisma.userRoleAssignment.count({ where }),
        ]);

        const totalPages = Math.ceil(total / limit);

        return reply.status(200).send({
          data: userRoles,
          total,
          page,
          limit,
          totalPages,
        });
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // Get UserRole by ID
  fastify.get(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["UserRoles"],
        description: "Get user role by ID",
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", format: "uuid" },
          },
        },
        response: {
          400: { type: "object", properties: { error: { type: "string" } } },
          500: { type: "object", properties: { error: { type: "string" } } },
          200: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              userId: { type: "string", format: "uuid" },
              role: { type: "string" },
              createdAt: { type: "string", format: "date-time" },
            },
          },
          404: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };

        const userRole = await prisma.userRoleAssignment.findUnique({
          where: { id },
        });

        if (!userRole) {
          return reply.status(404).send({ error: "User role not found" });
        }

        return reply.status(200).send(userRole);
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // Create UserRole
  fastify.post(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["UserRoles"],
        description: "Create a new user role",
        body: {
          type: "object",
          required: ["userId", "role"],
          properties: {
            userId: { type: "string", format: "uuid" },
            role: { type: "string" },
          },
        },
        response: {
          404: { type: "object", properties: { error: { type: "string" } } },
          500: { type: "object", properties: { error: { type: "string" } } },
          201: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              userId: { type: "string", format: "uuid" },
              role: { type: "string" },
              createdAt: { type: "string", format: "date-time" },
            },
          },
          400: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { userId, role } = request.body as {
          userId: string;
          role: string;
        };

        if (!allowedRoles.has(role)) {
          return reply
            .status(400)
            .send({ error: "Solo se permiten roles administrador y tramitador" });
        }

        const userRole = await prisma.userRoleAssignment.create({
          data: {
            userId,
            role: role as any,
          },
        });

        return reply.status(201).send(userRole);
      } catch (error: any) {
        if (error.code === "P2002") {
          return reply
            .status(400)
            .send({ error: "User role combination already exists" });
        }
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // Update UserRole
  fastify.put(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["UserRoles"],
        description: "Update user role by ID",
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", format: "uuid" },
          },
        },
        body: {
          type: "object",
          properties: {
            userId: { type: "string", format: "uuid" },
            role: { type: "string" },
          },
        },
        response: {
          400: { type: "object", properties: { error: { type: "string" } } },
          500: { type: "object", properties: { error: { type: "string" } } },
          200: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              userId: { type: "string", format: "uuid" },
              role: { type: "string" },
              createdAt: { type: "string", format: "date-time" },
            },
          },
          404: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const updateData = request.body as { userId?: string; role?: string };

        const existingUserRole = await prisma.userRoleAssignment.findUnique({
          where: { id },
        });

        if (!existingUserRole) {
          return reply.status(404).send({ error: "User role not found" });
        }

        if (updateData.role && !allowedRoles.has(updateData.role)) {
          return reply
            .status(400)
            .send({ error: "Solo se permiten roles administrador y tramitador" });
        }

        const removingAdminRole =
          existingUserRole.role === "admin" &&
          ((updateData.role && updateData.role !== "admin") ||
            (updateData.userId && updateData.userId !== existingUserRole.userId));

        if (removingAdminRole) {
          const profile = await prisma.profile.findUnique({
            where: { id: existingUserRole.userId },
            select: { active: true },
          });

          if (profile?.active) {
            const remainingAdmins = await countActiveAdmins(
              existingUserRole.userId,
            );
            if (remainingAdmins === 0) {
              return reply.status(400).send({
                error: "Debe existir al menos un administrador activo",
              });
            }
          }
        }

        const data: any = {};
        if (updateData.userId) data.userId = updateData.userId;
        if (updateData.role) data.role = updateData.role;

        const userRole = await prisma.userRoleAssignment.update({
          where: { id },
          data,
        });

        return reply.status(200).send(userRole);
      } catch (error: any) {
        if (error.code === "P2002") {
          return reply
            .status(400)
            .send({ error: "User role combination already exists" });
        }
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // Delete UserRole
  fastify.delete(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["UserRoles"],
        description: "Delete user role by ID",
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", format: "uuid" },
          },
        },
        response: {
          400: { type: "object", properties: { error: { type: "string" } } },
          500: { type: "object", properties: { error: { type: "string" } } },
          200: {
            type: "object",
            properties: {
              message: { type: "string" },
            },
          },
          404: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };

        const existingUserRole = await prisma.userRoleAssignment.findUnique({
          where: { id },
        });

        if (!existingUserRole) {
          return reply.status(404).send({ error: "User role not found" });
        }

        if (existingUserRole.role === "admin") {
          const profile = await prisma.profile.findUnique({
            where: { id: existingUserRole.userId },
            select: { active: true },
          });

          if (profile?.active) {
            const remainingAdmins = await countActiveAdmins(
              existingUserRole.userId,
            );
            if (remainingAdmins === 0) {
              return reply.status(400).send({
                error: "Debe existir al menos un administrador activo",
              });
            }
          }
        }

        await prisma.userRoleAssignment.delete({
          where: { id },
        });

        return reply
          .status(200)
          .send({ message: "User role deleted successfully" });
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );
};

export default routes;
