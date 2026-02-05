import type { FastifyPluginAsync } from "fastify";
import type { PrismaClient } from "@prisma/client";

const sessionEntitySchema = {
  type: "object",
  properties: {
    sessionId: { type: "string", minLength: 64, maxLength: 64 },
    userId: { type: "string" },
    refreshToken: { type: "string", minLength: 128, maxLength: 128 },
    fingerprint: { type: "string" },
    ip: { type: "string" },
    userAgent: { type: "string" },
    expiresAt: { type: "string", format: "date-time" },
    revoked: { type: "boolean" },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
};

const createSessionEntitySchema = {
  type: "object",
  required: [
    "sessionId",
    "userId",
    "refreshToken",
    "fingerprint",
    "ip",
    "userAgent",
    "expiresAt",
  ],
  properties: {
    sessionId: { type: "string", minLength: 64, maxLength: 64 },
    userId: { type: "string" },
    refreshToken: { type: "string", minLength: 128, maxLength: 128 },
    fingerprint: { type: "string" },
    ip: { type: "string" },
    userAgent: { type: "string" },
    expiresAt: { type: "string", format: "date-time" },
    revoked: { type: "boolean", default: false },
  },
};

const updateSessionEntitySchema = {
  type: "object",
  properties: {
    refreshToken: { type: "string", minLength: 128, maxLength: 128 },
    fingerprint: { type: "string" },
    ip: { type: "string" },
    userAgent: { type: "string" },
    expiresAt: { type: "string", format: "date-time" },
    revoked: { type: "boolean" },
  },
};

const paginationQuerySchema = {
  type: "object",
  properties: {
    page: { type: "integer", minimum: 1, default: 1 },
    limit: { type: "integer", minimum: 1, maximum: 100, default: 10 },
  },
};

const sessionIdParamSchema = {
  type: "object",
  required: ["sessionId"],
  properties: {
    sessionId: { type: "string", minLength: 64, maxLength: 64 },
  },
};

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // GET /sessions - List sessions with pagination
  fastify.get(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Sessions"],
        description: "Get paginated list of sessions",
        querystring: paginationQuerySchema,
        response: {
          200: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: sessionEntitySchema,
              },
              total: { type: "integer" },
              page: { type: "integer" },
              limit: { type: "integer" },
              totalPages: { type: "integer" },
            },
          },
          500: {
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
        const { page = 1, limit = 10 } = request.query as {
          page?: number;
          limit?: number;
        };
        const skip = (page - 1) * limit;

        const [sessions, total] = await Promise.all([
          prisma.sessionEntity.findMany({
            skip,
            take: limit,
            include: {
              User: {
                select: {
                  id: true,
                  email: true,
                  username: true,
                },
              },
            },
            orderBy: {
              createdAt: "desc",
            },
          }),
          prisma.sessionEntity.count(),
        ]);

        const totalPages = Math.ceil(total / limit);

        return reply.status(200).send({
          data: sessions,
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

  // GET /sessions/:sessionId - Get session by ID
  fastify.get(
    "/:sessionId",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Sessions"],
        description: "Get session by ID",
        params: sessionIdParamSchema,
        response: {
          200: sessionEntitySchema,
          404: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
          500: {
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
        const { sessionId } = request.params as { sessionId: string };

        const session = await prisma.sessionEntity.findUnique({
          where: { sessionId },
          include: {
            User: {
              select: {
                id: true,
                email: true,
                username: true,
              },
            },
          },
        });

        if (!session) {
          return reply.status(404).send({ error: "Session not found" });
        }

        return reply.status(200).send(session);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // POST /sessions - Create new session
  fastify.post(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Sessions"],
        description: "Create new session",
        body: createSessionEntitySchema,
        response: {
          201: sessionEntitySchema,
          400: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
          500: {
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
        const sessionData = request.body as {
          sessionId: string;
          userId: string;
          refreshToken: string;
          fingerprint: string;
          ip: string;
          userAgent: string;
          expiresAt: string;
          revoked?: boolean;
        };

        // Check if user exists
        const userExists = await prisma.userEntity.findUnique({
          where: { id: sessionData.userId },
        });

        if (!userExists) {
          return reply.status(400).send({ error: "User not found" });
        }

        // Check for existing session with same userId and fingerprint
        const existingSession = await prisma.sessionEntity.findUnique({
          where: {
            userId_fingerprint: {
              userId: sessionData.userId,
              fingerprint: sessionData.fingerprint,
            },
          },
        });

        if (existingSession) {
          return reply.status(400).send({
            error: "Session already exists for this user and fingerprint",
          });
        }

        const session = await prisma.sessionEntity.create({
          data: {
            ...sessionData,
            expiresAt: new Date(sessionData.expiresAt),
          },
          include: {
            User: {
              select: {
                id: true,
                email: true,
                username: true,
              },
            },
          },
        });

        return reply.status(201).send(session);
      } catch (error) {
        fastify.log.error(error);
        if (error.code === "P2002") {
          return reply
            .status(400)
            .send({ error: "Session ID or refresh token already exists" });
        }
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // PUT /sessions/:sessionId - Update session
  fastify.put(
    "/:sessionId",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Sessions"],
        description: "Update session by ID",
        params: sessionIdParamSchema,
        body: updateSessionEntitySchema,
        response: {
          200: sessionEntitySchema,
          400: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
          404: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
          500: {
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
        const { sessionId } = request.params as { sessionId: string };
        const updateData = request.body as {
          refreshToken?: string;
          fingerprint?: string;
          ip?: string;
          userAgent?: string;
          expiresAt?: string;
          revoked?: boolean;
        };

        // Check if session exists
        const existingSession = await prisma.sessionEntity.findUnique({
          where: { sessionId },
        });

        if (!existingSession) {
          return reply.status(404).send({ error: "Session not found" });
        }

        const session = await prisma.sessionEntity.update({
          where: { sessionId },
          data: {
            ...updateData,
            ...(updateData.expiresAt && {
              expiresAt: new Date(updateData.expiresAt),
            }),
          },
          include: {
            User: {
              select: {
                id: true,
                email: true,
                username: true,
              },
            },
          },
        });

        return reply.status(200).send(session);
      } catch (error) {
        fastify.log.error(error);
        if (error.code === "P2002") {
          return reply
            .status(400)
            .send({ error: "Refresh token already exists" });
        }
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // DELETE /sessions/:sessionId - Delete session
  fastify.delete(
    "/:sessionId",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Sessions"],
        description: "Delete session by ID",
        params: sessionIdParamSchema,
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
          500: {
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
        const { sessionId } = request.params as { sessionId: string };

        // Check if session exists
        const existingSession = await prisma.sessionEntity.findUnique({
          where: { sessionId },
        });

        if (!existingSession) {
          return reply.status(404).send({ error: "Session not found" });
        }

        await prisma.sessionEntity.delete({
          where: { sessionId },
        });

        return reply
          .status(200)
          .send({ message: "Session deleted successfully" });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );
};

export default routes;
