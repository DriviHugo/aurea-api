import type { FastifyPluginAsync } from "fastify";
import type { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // Schemas
  const userResponseSchema = {
    type: "object",
    properties: {
      id: { type: "string" },
      email: { type: "string", format: "email" },
      name: { type: "string" },
      imageUrl: { type: "string", nullable: true },
      isAdmin: { type: "boolean" },
      isActive: { type: "boolean" },
      validatedAt: { type: "string", format: "date-time", nullable: true },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
  };

  const userCreateSchema = {
    type: "object",
    required: ["email", "name", "password"],
    properties: {
      email: { type: "string", format: "email" },
      name: { type: "string", minLength: 1, maxLength: 100 },
      password: { type: "string", minLength: 6, maxLength: 100 },
      imageUrl: { type: "string", format: "uri", nullable: true },
      isAdmin: { type: "boolean" },
      isActive: { type: "boolean" },
    },
  };

  const userUpdateSchema = {
    type: "object",
    properties: {
      email: { type: "string", format: "email" },
      name: { type: "string", minLength: 1, maxLength: 100 },
      password: { type: "string", minLength: 6, maxLength: 100 },
      imageUrl: { type: "string", format: "uri", nullable: true },
      isAdmin: { type: "boolean" },
      isActive: { type: "boolean" },
      validatedAt: { type: "string", format: "date-time", nullable: true },
    },
  };

  const paginationQuerySchema = {
    type: "object",
    properties: {
      page: { type: "integer", minimum: 1, default: 1 },
      limit: { type: "integer", minimum: 1, maximum: 100, default: 10 },
      search: { type: "string" },
    },
  };

  const idParamsSchema = {
    type: "object",
    required: ["id"],
    properties: {
      id: { type: "string" },
    },
  };

  // GET /users - List users with pagination
  fastify.get(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Users"],
        description: "Get paginated list of users",
        querystring: paginationQuerySchema,
        response: {
          200: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: userResponseSchema,
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
        const {
          page = 1,
          limit = 10,
          search,
        } = request.query as {
          page?: number;
          limit?: number;
          search?: string;
        };

        const skip = (page - 1) * limit;

        const where = search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" as const } },
                { email: { contains: search, mode: "insensitive" as const } },
              ],
            }
          : {};

        const [users, total] = await Promise.all([
          prisma.userEntity.findMany({
            where,
            skip,
            take: limit,
            select: {
              id: true,
              email: true,
              name: true,
              imageUrl: true,
              isAdmin: true,
              isActive: true,
              validatedAt: true,
              createdAt: true,
              updatedAt: true,
            },
            orderBy: { createdAt: "desc" },
          }),
          prisma.userEntity.count({ where }),
        ]);

        const totalPages = Math.ceil(total / limit);

        return reply.status(200).send({
          data: users,
          total,
          page,
          limit,
          totalPages,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // GET /users/:id - Get user by ID
  fastify.get(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Users"],
        description: "Get user by ID",
        params: idParamsSchema,
        response: {
          200: userResponseSchema,
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

        const user = await prisma.userEntity.findUnique({
          where: { id },
          select: {
            id: true,
            email: true,
            name: true,
            imageUrl: true,
            isAdmin: true,
            isActive: true,
            validatedAt: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        if (!user) {
          return reply.status(404).send({ error: "User not found" });
        }

        return reply.status(200).send(user);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // POST /users - Create new user
  fastify.post(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Users"],
        description: "Create a new user",
        body: userCreateSchema,
        response: {
          201: userResponseSchema,
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
        const {
          email,
          name,
          password,
          imageUrl,
          isAdmin = false,
          isActive = false,
        } = request.body as {
          email: string;
          name: string;
          password: string;
          imageUrl?: string;
          isAdmin?: boolean;
          isActive?: boolean;
        };

        // Check if user with email already exists
        const existingUser = await prisma.userEntity.findUnique({
          where: { email },
        });

        if (existingUser) {
          return reply
            .status(400)
            .send({ error: "User with this email already exists" });
        }

        // Hash password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const user = await prisma.userEntity.create({
          data: {
            email,
            name,
            password: hashedPassword,
            imageUrl,
            isAdmin,
            isActive,
          },
          select: {
            id: true,
            email: true,
            name: true,
            imageUrl: true,
            isAdmin: true,
            isActive: true,
            validatedAt: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        return reply.status(201).send(user);
      } catch (error) {
        fastify.log.error(error);
        if (error.code === "P2002") {
          return reply
            .status(400)
            .send({ error: "User with this email already exists" });
        }
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // PUT /users/:id - Update user
  fastify.put(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Users"],
        description: "Update user by ID",
        params: idParamsSchema,
        body: userUpdateSchema,
        response: {
          200: userResponseSchema,
          404: {
            type: "object",
            properties: {
              error: { type: "string" },
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
        const { id } = request.params as { id: string };
        const updateData = request.body as {
          email?: string;
          name?: string;
          password?: string;
          imageUrl?: string;
          isAdmin?: boolean;
          isActive?: boolean;
          validatedAt?: string;
        };

        // Check if user exists
        const existingUser = await prisma.userEntity.findUnique({
          where: { id },
        });

        if (!existingUser) {
          return reply.status(404).send({ error: "User not found" });
        }

        // Check if email is being updated and if it's already taken by another user
        if (updateData.email && updateData.email !== existingUser.email) {
          const emailExists = await prisma.userEntity.findUnique({
            where: { email: updateData.email },
          });

          if (emailExists) {
            return reply
              .status(400)
              .send({ error: "User with this email already exists" });
          }
        }

        // Hash password if provided
        const dataToUpdate: any = { ...updateData };
        if (updateData.password) {
          const saltRounds = 12;
          dataToUpdate.password = await bcrypt.hash(
            updateData.password,
            saltRounds,
          );
        }

        // Convert validatedAt string to Date if provided
        if (updateData.validatedAt) {
          dataToUpdate.validatedAt = new Date(updateData.validatedAt);
        }

        const user = await prisma.userEntity.update({
          where: { id },
          data: dataToUpdate,
          select: {
            id: true,
            email: true,
            name: true,
            imageUrl: true,
            isAdmin: true,
            isActive: true,
            validatedAt: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        return reply.status(200).send(user);
      } catch (error) {
        fastify.log.error(error);
        if (error.code === "P2002") {
          return reply
            .status(400)
            .send({ error: "User with this email already exists" });
        }
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // DELETE /users/:id - Delete user
  fastify.delete(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Users"],
        description: "Delete user by ID",
        params: idParamsSchema,
        response: {
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
        const { id } = request.params as { id: string };

        // Check if user exists
        const existingUser = await prisma.userEntity.findUnique({
          where: { id },
          include: {
            SessionEntity: true,
          },
        });

        if (!existingUser) {
          return reply.status(404).send({ error: "User not found" });
        }

        // Check if user has active sessions
        if (existingUser.SessionEntity.length > 0) {
          return reply.status(400).send({
            error:
              "Cannot delete user with active sessions. Please delete sessions first.",
          });
        }

        await prisma.userEntity.delete({
          where: { id },
        });

        return reply.status(200).send({ message: "User deleted successfully" });
      } catch (error) {
        fastify.log.error(error);
        if (error.code === "P2003") {
          return reply.status(400).send({
            error: "Cannot delete user due to existing references",
          });
        }
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );
};

export default routes;
