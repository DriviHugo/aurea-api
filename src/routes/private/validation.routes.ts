import type { FastifyPluginAsync } from "fastify";
import type { PrismaClient } from "@prisma/client";

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // GET /validations - List validations with pagination
  fastify.get(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Validations"],
        description: "Get paginated list of validations",
        querystring: {
          type: "object",
          properties: {
            page: { type: "integer", minimum: 1, default: 1 },
            limit: { type: "integer", minimum: 1, maximum: 100, default: 10 },
            caseId: { type: "string", format: "uuid" },
            ruleId: { type: "string", format: "uuid" },
            passed: { type: "boolean" },
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
                    id: { type: "string", format: "uuid" },
                    caseId: { type: "string", format: "uuid" },
                    documentId: { type: ["string", "null"], format: "uuid" },
                    ruleId: { type: "string", format: "uuid" },
                    passed: { type: "boolean" },
                    foundValue: { type: ["string", "null"] },
                    explanation: { type: "string" },
                    structureScore: { type: ["integer", "null"] },
                    contentScore: { type: ["integer", "null"] },
                    userId: { type: "string", format: "uuid" },
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
        const {
          page = 1,
          limit = 10,
          caseId,
          ruleId,
          passed,
        } = request.query as any;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (caseId) where.caseId = caseId;
        if (ruleId) where.ruleId = ruleId;
        if (passed !== undefined) where.passed = passed;

        const [validations, total] = await Promise.all([
          prisma.validation.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
          }),
          prisma.validation.count({ where }),
        ]);

        const totalPages = Math.ceil(total / limit);

        return reply.status(200).send({
          data: validations,
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

  // GET /validations/:id - Get validation by ID
  fastify.get(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Validations"],
        description: "Get validation by ID",
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
              caseId: { type: "string", format: "uuid" },
              documentId: { type: ["string", "null"], format: "uuid" },
              ruleId: { type: "string", format: "uuid" },
              passed: { type: "boolean" },
              foundValue: { type: ["string", "null"] },
              explanation: { type: "string" },
              structureScore: { type: ["integer", "null"] },
              contentScore: { type: ["integer", "null"] },
              userId: { type: "string", format: "uuid" },
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

        const validation = await prisma.validation.findUnique({
          where: { id },
        });

        if (!validation) {
          return reply.status(404).send({ error: "Validation not found" });
        }

        return reply.status(200).send(validation);
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // POST /validations - Create new validation
  fastify.post(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Validations"],
        description: "Create new validation",
        body: {
          type: "object",
          required: ["caseId", "ruleId", "passed", "explanation", "userId"],
          properties: {
            caseId: { type: "string", format: "uuid" },
            documentId: { type: ["string", "null"], format: "uuid" },
            ruleId: { type: "string", format: "uuid" },
            passed: { type: "boolean" },
            foundValue: { type: ["string", "null"] },
            explanation: { type: "string", minLength: 1 },
            structureScore: {
              type: ["integer", "null"],
              minimum: 0,
              maximum: 100,
            },
            contentScore: {
              type: ["integer", "null"],
              minimum: 0,
              maximum: 100,
            },
            userId: { type: "string", format: "uuid" },
          },
        },
        response: {
          404: { type: "object", properties: { error: { type: "string" } } },
          500: { type: "object", properties: { error: { type: "string" } } },
          201: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              caseId: { type: "string", format: "uuid" },
              documentId: { type: ["string", "null"], format: "uuid" },
              ruleId: { type: "string", format: "uuid" },
              passed: { type: "boolean" },
              foundValue: { type: ["string", "null"] },
              explanation: { type: "string" },
              structureScore: { type: ["integer", "null"] },
              contentScore: { type: ["integer", "null"] },
              userId: { type: "string", format: "uuid" },
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
        const data = request.body as any;

        // Verify related entities exist
        const [caseRecord, rule, user, document] = await Promise.all([
          prisma.case.findUnique({ where: { id: data.caseId } }),
          prisma.rule.findUnique({ where: { id: data.ruleId } }),
          prisma.profile.findUnique({ where: { id: data.userId } }),
          data.documentId
            ? prisma.document.findUnique({ where: { id: data.documentId } })
            : null,
        ]);

        if (!caseRecord) {
          return reply.status(400).send({ error: "Case not found" });
        }
        if (!rule) {
          return reply.status(400).send({ error: "Rule not found" });
        }
        if (!user) {
          return reply.status(400).send({ error: "User not found" });
        }
        if (data.documentId && !document) {
          return reply.status(400).send({ error: "Document not found" });
        }

        const validation = await prisma.validation.create({
          data: {
            caseId: data.caseId,
            documentId: data.documentId,
            ruleId: data.ruleId,
            passed: data.passed,
            foundValue: data.foundValue,
            explanation: data.explanation,
            structureScore: data.structureScore,
            contentScore: data.contentScore,
            userId: data.userId,
          },
        });

        return reply.status(201).send(validation);
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // PUT /validations/:id - Update validation
  fastify.put(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Validations"],
        description: "Update validation by ID",
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
            caseId: { type: "string", format: "uuid" },
            documentId: { type: ["string", "null"], format: "uuid" },
            ruleId: { type: "string", format: "uuid" },
            passed: { type: "boolean" },
            foundValue: { type: ["string", "null"] },
            explanation: { type: "string", minLength: 1 },
            structureScore: {
              type: ["integer", "null"],
              minimum: 0,
              maximum: 100,
            },
            contentScore: {
              type: ["integer", "null"],
              minimum: 0,
              maximum: 100,
            },
            userId: { type: "string", format: "uuid" },
          },
        },
        response: {
          400: { type: "object", properties: { error: { type: "string" } } },
          500: { type: "object", properties: { error: { type: "string" } } },
          200: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              caseId: { type: "string", format: "uuid" },
              documentId: { type: ["string", "null"], format: "uuid" },
              ruleId: { type: "string", format: "uuid" },
              passed: { type: "boolean" },
              foundValue: { type: ["string", "null"] },
              explanation: { type: "string" },
              structureScore: { type: ["integer", "null"] },
              contentScore: { type: ["integer", "null"] },
              userId: { type: "string", format: "uuid" },
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
        const data = request.body as any;

        const existingValidation = await prisma.validation.findUnique({
          where: { id },
        });

        if (!existingValidation) {
          return reply.status(404).send({ error: "Validation not found" });
        }

        // Verify related entities exist if they are being updated
        const verifications = [];
        if (data.caseId) {
          verifications.push(
            prisma.case
              .findUnique({ where: { id: data.caseId } })
              .then((result) => ({ type: "case", result })),
          );
        }
        if (data.ruleId) {
          verifications.push(
            prisma.rule
              .findUnique({ where: { id: data.ruleId } })
              .then((result) => ({ type: "rule", result })),
          );
        }
        if (data.userId) {
          verifications.push(
            prisma.profile
              .findUnique({ where: { id: data.userId } })
              .then((result) => ({ type: "user", result })),
          );
        }
        if (data.documentId) {
          verifications.push(
            prisma.document
              .findUnique({ where: { id: data.documentId } })
              .then((result) => ({ type: "document", result })),
          );
        }

        const results = await Promise.all(verifications);
        for (const { type, result } of results) {
          if (!result) {
            return reply.status(400).send({
              error: `${type.charAt(0).toUpperCase() + type.slice(1)} not found`,
            });
          }
        }

        const validation = await prisma.validation.update({
          where: { id },
          data: {
            ...(data.caseId && { caseId: data.caseId }),
            ...(data.documentId !== undefined && {
              documentId: data.documentId,
            }),
            ...(data.ruleId && { ruleId: data.ruleId }),
            ...(data.passed !== undefined && { passed: data.passed }),
            ...(data.foundValue !== undefined && {
              foundValue: data.foundValue,
            }),
            ...(data.explanation && { explanation: data.explanation }),
            ...(data.structureScore !== undefined && {
              structureScore: data.structureScore,
            }),
            ...(data.contentScore !== undefined && {
              contentScore: data.contentScore,
            }),
            ...(data.userId && { userId: data.userId }),
          },
        });

        return reply.status(200).send(validation);
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // DELETE /validations/:id - Delete validation
  fastify.delete(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Validations"],
        description: "Delete validation by ID",
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

        const existingValidation = await prisma.validation.findUnique({
          where: { id },
        });

        if (!existingValidation) {
          return reply.status(404).send({ error: "Validation not found" });
        }

        await prisma.validation.delete({
          where: { id },
        });

        return reply
          .status(200)
          .send({ message: "Validation deleted successfully" });
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );
};

export default routes;
