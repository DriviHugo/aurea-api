import type { FastifyPluginAsync } from "fastify";
import type { PrismaClient } from "@prisma/client";

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // GET /rules - List rules with pagination
  fastify.get(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Rules"],
        description: "Get paginated list of rules",
        querystring: {
          type: "object",
          properties: {
            page: { type: "integer", minimum: 1, default: 1 },
            limit: { type: "integer", minimum: 1, maximum: 100, default: 10 },
          },
        },
        response: {
          400: { type: "object", properties: { error: { type: "string" } } },
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
                    id: { type: "string" },
                    code: { type: "string" },
                    name: { type: "string" },
                    description: { type: "string" },
                    severity: { type: "string" },
                    evidenceId: { type: "string", nullable: true },
                    condition: { type: "string" },
                    message: { type: "string" },
                    version: { type: "integer" },
                    status: { type: "string" },
                    approverId: { type: "string", nullable: true },
                    approverRole: { type: "string", nullable: true },
                    approvalDate: { type: "string", nullable: true },
                    createdAt: { type: "string" },
                    updatedAt: { type: "string" },
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
        const { page = 1, limit = 10 } = request.query as {
          page?: number;
          limit?: number;
        };
        const skip = (page - 1) * limit;

        const [rules, total] = await Promise.all([
          prisma.rule.findMany({
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
          }),
          prisma.rule.count(),
        ]);

        const totalPages = Math.ceil(total / limit);

        return reply.status(200).send({
          data: rules,
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

  // GET /rules/:id - Get rule by ID
  fastify.get(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Rules"],
        description: "Get rule by ID",
        params: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
          },
          required: ["id"],
        },
        response: {
          400: { type: "object", properties: { error: { type: "string" } } },
          500: { type: "object", properties: { error: { type: "string" } } },
          200: {
            type: "object",
            properties: {
              id: { type: "string" },
              code: { type: "string" },
              name: { type: "string" },
              description: { type: "string" },
              severity: { type: "string" },
              evidenceId: { type: "string", nullable: true },
              condition: { type: "string" },
              message: { type: "string" },
              version: { type: "integer" },
              status: { type: "string" },
              approverId: { type: "string", nullable: true },
              approverRole: { type: "string", nullable: true },
              approvalDate: { type: "string", nullable: true },
              createdAt: { type: "string" },
              updatedAt: { type: "string" },
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

        const rule = await prisma.rule.findUnique({
          where: { id },
        });

        if (!rule) {
          return reply.status(404).send({ error: "Rule not found" });
        }

        return reply.status(200).send(rule);
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // POST /rules - Create new rule
  fastify.post(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Rules"],
        description: "Create new rule",
        body: {
          type: "object",
          properties: {
            code: { type: "string", minLength: 1 },
            name: { type: "string", minLength: 1 },
            description: { type: "string", minLength: 1 },
            severity: {
              type: "string",
              enum: ["blocking", "warning", "recommendation"],
            },
            evidenceId: { type: "string", format: "uuid" },
            condition: { type: "string", minLength: 1 },
            message: { type: "string", minLength: 1 },
            version: { type: "integer", minimum: 1 },
            status: { type: "string" },
            approverId: { type: "string", format: "uuid" },
            approverRole: {
              type: "string",
              enum: ["processor", "legal", "auditor", "supervisor", "admin"],
            },
            approvalDate: { type: "string", format: "date-time" },
          },
          required: [
            "code",
            "name",
            "description",
            "severity",
            "condition",
            "message",
          ],
        },
        response: {
          404: { type: "object", properties: { error: { type: "string" } } },
          500: { type: "object", properties: { error: { type: "string" } } },
          201: {
            type: "object",
            properties: {
              id: { type: "string" },
              code: { type: "string" },
              name: { type: "string" },
              description: { type: "string" },
              severity: { type: "string" },
              evidenceId: { type: "string", nullable: true },
              condition: { type: "string" },
              message: { type: "string" },
              version: { type: "integer" },
              status: { type: "string" },
              approverId: { type: "string", nullable: true },
              approverRole: { type: "string", nullable: true },
              approvalDate: { type: "string", nullable: true },
              createdAt: { type: "string" },
              updatedAt: { type: "string" },
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
        const data = request.body as {
          code: string;
          name: string;
          description: string;
          severity: string;
          evidenceId?: string;
          condition: string;
          message: string;
          version?: number;
          status?: string;
          approverId?: string;
          approverRole?: string;
          approvalDate?: string;
        };

        const rule = await prisma.rule.create({
          data: {
            code: data.code,
            name: data.name,
            description: data.description,
            severity: data.severity as any,
            condition: data.condition,
            message: data.message,
            approvalDate: data.approvalDate
              ? new Date(data.approvalDate)
              : null,
            ...(data.evidenceId !== undefined && {
              evidenceId: data.evidenceId,
            }),
            ...(data.version !== undefined && { version: data.version }),
            ...(data.status !== undefined && { status: data.status }),
            ...(data.approverId !== undefined && {
              approverId: data.approverId,
            }),
            ...(data.approverRole !== undefined && {
              approverRole: data.approverRole as any,
            }),
          },
        });

        return reply.status(201).send(rule);
      } catch (error: any) {
        if (error.code === "P2002") {
          return reply.status(400).send({ error: "Code already exists" });
        }
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // PUT /rules/:id - Update rule
  fastify.put(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Rules"],
        description: "Update rule by ID",
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
            code: { type: "string", minLength: 1 },
            name: { type: "string", minLength: 1 },
            description: { type: "string", minLength: 1 },
            severity: {
              type: "string",
              enum: ["blocking", "warning", "recommendation"],
            },
            evidenceId: { type: "string", nullable: true, format: "uuid" },
            condition: { type: "string", minLength: 1 },
            message: { type: "string", minLength: 1 },
            version: { type: "integer", minimum: 1 },
            status: { type: "string" },
            approverId: { type: "string", nullable: true, format: "uuid" },
            approverRole: {
              type: "string",
              nullable: true,
              enum: ["processor", "legal", "auditor", "supervisor", "admin"],
            },
            approvalDate: {
              type: "string",
              nullable: true,
              format: "date-time",
            },
          },
        },
        response: {
          400: { type: "object", properties: { error: { type: "string" } } },
          500: { type: "object", properties: { error: { type: "string" } } },
          200: {
            type: "object",
            properties: {
              id: { type: "string" },
              code: { type: "string" },
              name: { type: "string" },
              description: { type: "string" },
              severity: { type: "string" },
              evidenceId: { type: "string", nullable: true },
              condition: { type: "string" },
              message: { type: "string" },
              version: { type: "integer" },
              status: { type: "string" },
              approverId: { type: "string", nullable: true },
              approverRole: { type: "string", nullable: true },
              approvalDate: { type: "string", nullable: true },
              createdAt: { type: "string" },
              updatedAt: { type: "string" },
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
        const data = request.body as {
          code?: string;
          name?: string;
          description?: string;
          severity?: string;
          evidenceId?: string | null;
          condition?: string;
          message?: string;
          version?: number;
          status?: string;
          approverId?: string | null;
          approverRole?: string | null;
          approvalDate?: string | null;
        };

        const existingRule = await prisma.rule.findUnique({
          where: { id },
        });

        if (!existingRule) {
          return reply.status(404).send({ error: "Rule not found" });
        }

        const rule = await prisma.rule.update({
          where: { id },
          data: {
            approvalDate: data.approvalDate
              ? new Date(data.approvalDate)
              : null,
            ...(data.code !== undefined && { code: data.code }),
            ...(data.name !== undefined && { name: data.name }),
            ...(data.description !== undefined && {
              description: data.description,
            }),
            ...(data.severity !== undefined && {
              severity: data.severity as any,
            }),
            ...(data.evidenceId !== undefined && {
              evidenceId: data.evidenceId,
            }),
            ...(data.condition !== undefined && { condition: data.condition }),
            ...(data.message !== undefined && { message: data.message }),
            ...(data.version !== undefined && { version: data.version }),
            ...(data.status !== undefined && { status: data.status }),
            ...(data.approverId !== undefined && {
              approverId: data.approverId,
            }),
            ...(data.approverRole !== undefined && {
              approverRole: data.approverRole as any,
            }),
          },
        });

        return reply.status(200).send(rule);
      } catch (error: any) {
        if (error.code === "P2002") {
          return reply.status(400).send({ error: "Code already exists" });
        }
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // DELETE /rules/:id - Delete rule
  fastify.delete(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Rules"],
        description: "Delete rule by ID",
        params: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
          },
          required: ["id"],
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

        const existingRule = await prisma.rule.findUnique({
          where: { id },
        });

        if (!existingRule) {
          return reply.status(404).send({ error: "Rule not found" });
        }

        await prisma.rule.delete({
          where: { id },
        });

        return reply.status(200).send({ message: "Rule deleted successfully" });
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );
};

export default routes;
