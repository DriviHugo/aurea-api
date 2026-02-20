import type { FastifyPluginAsync } from "fastify";
import type { PrismaClient } from "@prisma/client";

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // GET /revisions - List revisions with pagination
  fastify.get(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Revisions"],
        description: "Get paginated list of revisions",
        querystring: {
          type: "object",
          properties: {
            page: { type: "integer", minimum: 1, default: 1 },
            limit: { type: "integer", minimum: 1, maximum: 100, default: 10 },
            caseId: { type: "string", format: "uuid" },
            userId: { type: "string", format: "uuid" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    caseId: { type: "string" },
                    documentId: { type: ["string", "null"] },
                    userId: { type: "string" },
                    role: { type: "string" },
                    changeDescription: { type: "string" },
                    decision: { type: "string" },
                    reason: { type: ["string", "null"] },
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
        const { page = 1, limit = 10, caseId, userId } = request.query as any;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (caseId) where.caseId = caseId;
        if (userId) where.userId = userId;

        const [revisions, total] = await Promise.all([
          prisma.review.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
          }),
          prisma.review.count({ where }),
        ]);

        const totalPages = Math.ceil(total / limit);

        return reply.status(200).send({
          data: revisions,
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

  // GET /revisions/:id - Get revision by ID
  fastify.get(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Revisions"],
        description: "Get revision by ID",
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", format: "uuid" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              id: { type: "string" },
              expedienteId: { type: "string" },
              documentoId: { type: ["string", "null"] },
              usuarioId: { type: "string" },
              rol: { type: "string" },
              cambioDescripcion: { type: "string" },
              decision: { type: "string" },
              motivo: { type: ["string", "null"] },
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

        const revision = await prisma.review.findUnique({
          where: { id },
        });

        if (!revision) {
          return reply.status(404).send({ error: "Revision not found" });
        }

        return reply.status(200).send(revision);
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // POST /revisions - Create new revision
  fastify.post(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Revisions"],
        description: "Create new revision",
        body: {
          type: "object",
          required: [
            "caseId",
            "userId",
            "role",
            "changeDescription",
            "decision",
          ],
          properties: {
            caseId: { type: "string", format: "uuid" },
            documentId: { type: "string", format: "uuid" },
            userId: { type: "string", format: "uuid" },
            role: {
              type: "string",
              enum: ["processor", "legal", "auditor", "supervisor", "admin"],
            },
            changeDescription: {
              type: "string",
              minLength: 1,
              maxLength: 1000,
            },
            decision: {
              type: "string",
              enum: ["approved", "rejected", "pending", "in_review"],
            },
            reason: { type: "string", maxLength: 500 },
          },
        },
        response: {
          201: {
            type: "object",
            properties: {
              id: { type: "string" },
              caseId: { type: "string" },
              documentId: { type: ["string", "null"] },
              userId: { type: "string" },
              role: { type: "string" },
              changeDescription: { type: "string" },
              decision: { type: "string" },
              reason: { type: ["string", "null"] },
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

        // Verify case exists
        const caseRecord = await prisma.case.findUnique({
          where: { id: data.caseId },
        });

        if (!caseRecord) {
          return reply.status(400).send({ error: "Case not found" });
        }

        // Verify document exists if provided
        if (data.documentId) {
          const document = await prisma.document.findUnique({
            where: { id: data.documentId },
          });

          if (!document) {
            return reply.status(400).send({ error: "Document not found" });
          }
        }

        // Verify user exists
        const user = await prisma.profile.findUnique({
          where: { id: data.userId },
        });

        if (!user) {
          return reply.status(400).send({ error: "User not found" });
        }

        const revision = await prisma.review.create({
          data: {
            caseId: data.caseId,
            documentId: data.documentId || null,
            userId: data.userId,
            role: data.role,
            changeDescription: data.changeDescription,
            decision: data.decision,
            reason: data.reason || null,
          },
        });

        return reply.status(201).send(revision);
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // PUT /revisions/:id - Update revision
  fastify.put(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Revisions"],
        description: "Update revision by ID",
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
            documentId: { type: "string", format: "uuid" },
            role: {
              type: "string",
              enum: ["processor", "legal", "auditor", "supervisor", "admin"],
            },
            changeDescription: {
              type: "string",
              minLength: 1,
              maxLength: 1000,
            },
            decision: {
              type: "string",
              enum: ["approved", "rejected", "pending", "in_review"],
            },
            reason: { type: "string", maxLength: 500 },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              id: { type: "string" },
              caseId: { type: "string" },
              documentId: { type: ["string", "null"] },
              userId: { type: "string" },
              role: { type: "string" },
              changeDescription: { type: "string" },
              decision: { type: "string" },
              reason: { type: ["string", "null"] },
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

        const existingRevision = await prisma.review.findUnique({
          where: { id },
        });

        if (!existingRevision) {
          return reply.status(404).send({ error: "Revision not found" });
        }

        // Verify document exists if provided
        if (data.documentId) {
          const document = await prisma.document.findUnique({
            where: { id: data.documentId },
          });

          if (!document) {
            return reply.status(400).send({ error: "Document not found" });
          }
        }

        const updateData: any = {};
        if (data.documentId !== undefined)
          updateData.documentId = data.documentId;
        if (data.role !== undefined) updateData.role = data.role;
        if (data.changeDescription !== undefined)
          updateData.changeDescription = data.changeDescription;
        if (data.decision !== undefined) updateData.decision = data.decision;
        if (data.reason !== undefined) updateData.reason = data.reason;

        const revision = await prisma.review.update({
          where: { id },
          data: updateData,
        });

        return reply.status(200).send(revision);
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // DELETE /revisions/:id - Delete revision
  fastify.delete(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Revisions"],
        description: "Delete revision by ID",
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", format: "uuid" },
          },
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

        const existingRevision = await prisma.review.findUnique({
          where: { id },
        });

        if (!existingRevision) {
          return reply.status(404).send({ error: "Revision not found" });
        }

        await prisma.review.delete({
          where: { id },
        });

        return reply
          .status(200)
          .send({ message: "Revision deleted successfully" });
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );
};

export default routes;
