import type { FastifyPluginAsync } from "fastify";
import type { PrismaClient } from "@prisma/client";

const issueSchema = {
  type: "object",
  properties: {
    userId: { type: "string", format: "uuid" },
    location: { type: "string", minLength: 1 },
    functionality: { type: "string", minLength: 1 },
    description: { type: "string", minLength: 1 },
    expectedBehavior: { type: "string", minLength: 1 },
    screenshotUrl: { type: "string", nullable: true },
    status: {
      type: "string",
      enum: ["pending", "in_progress", "resolved", "closed"],
    },
  },
  required: [
    "userId",
    "location",
    "functionality",
    "description",
    "expectedBehavior",
  ],
};

const issueResponseSchema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    userId: { type: "string", format: "uuid" },
    location: { type: "string" },
    functionality: { type: "string" },
    description: { type: "string" },
    expectedBehavior: { type: "string" },
    screenshotUrl: { type: "string", nullable: true },
    status: { type: "string" },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
};

const paginationQuerySchema = {
  type: "object",
  properties: {
    page: { type: "integer", minimum: 1, default: 1 },
    limit: { type: "integer", minimum: 1, maximum: 100, default: 10 },
  },
};

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // GET /issues - List with pagination
  fastify.get(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Issues"],
        description: "Get all issues with pagination",
        querystring: paginationQuerySchema,
        response: {
          200: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: issueResponseSchema,
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
        const { page = 1, limit = 10 } = request.query as {
          page?: number;
          limit?: number;
        };
        const skip = (page - 1) * limit;

        const [issues, total] = await Promise.all([
          prisma.issue.findMany({
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
          }),
          prisma.issue.count(),
        ]);

        const totalPages = Math.ceil(total / limit);

        return reply.status(200).send({
          data: issues,
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

  // GET /issues/:id - Get by ID
  fastify.get(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Issues"],
        description: "Get issue by ID",
        params: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
          },
          required: ["id"],
        },
        response: {
          200: issueResponseSchema,
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

        const issue = await prisma.issue.findUnique({
          where: { id },
        });

        if (!issue) {
          return reply.status(404).send({ error: "Issue not found" });
        }

        return reply.status(200).send(issue);
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // POST /issues - Create
  fastify.post(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Issues"],
        description: "Create new issue",
        body: issueSchema,
        response: {
          201: issueResponseSchema,
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
        const data = request.body as {
          userId: string;
          location: string;
          functionality: string;
          description: string;
          expectedBehavior: string;
          screenshotUrl?: string;
          status?: string;
        };

        // Verify user exists
        const userExists = await prisma.profile.findUnique({
          where: { id: data.userId },
        });

        if (!userExists) {
          return reply.status(400).send({ error: "User not found" });
        }

        const issue = await prisma.issue.create({
          data: {
            ...data,
            status: data.status || "pending",
          },
        });

        return reply.status(201).send(issue);
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // PUT /issues/:id - Update
  fastify.put(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Issues"],
        description: "Update issue by ID",
        params: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
          },
          required: ["id"],
        },
        body: {
          type: "object",
          properties: {
            location: { type: "string", minLength: 1 },
            functionality: { type: "string", minLength: 1 },
            description: { type: "string", minLength: 1 },
            expectedBehavior: { type: "string", minLength: 1 },
            screenshotUrl: { type: "string", nullable: true },
            status: {
              type: "string",
              enum: ["pending", "in_progress", "resolved", "closed"],
            },
          },
        },
        response: {
          200: issueResponseSchema,
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
        const data = request.body as {
          location?: string;
          functionality?: string;
          description?: string;
          expectedBehavior?: string;
          screenshotUrl?: string;
          status?: string;
        };

        const existingIssue = await prisma.issue.findUnique({
          where: { id },
        });

        if (!existingIssue) {
          return reply.status(404).send({ error: "Issue not found" });
        }

        const issue = await prisma.issue.update({
          where: { id },
          data,
        });

        return reply.status(200).send(issue);
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // DELETE /issues/:id - Delete
  fastify.delete(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Issues"],
        description: "Delete issue by ID",
        params: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
          },
          required: ["id"],
        },
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
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };

        const existingIssue = await prisma.issue.findUnique({
          where: { id },
        });

        if (!existingIssue) {
          return reply.status(404).send({ error: "Issue not found" });
        }

        await prisma.issue.delete({
          where: { id },
        });

        return reply
          .status(200)
          .send({ message: "Issue deleted successfully" });
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );
};

export default routes;
