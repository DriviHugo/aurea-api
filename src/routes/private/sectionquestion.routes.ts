import type { FastifyPluginAsync } from "fastify";
import type { PrismaClient } from "@prisma/client";

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // GET /section-question?sectionId=xxx - List questions for a section
  fastify.get(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Sufficiency"],
        description: "List section questions, optionally filtered",
        querystring: {
          type: "object",
          properties: {
            sectionId: { type: "string", format: "uuid" },
            documentId: { type: "string", format: "uuid" },
            pendingOnly: { type: "boolean" },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { sectionId, documentId, pendingOnly } = request.query as {
          sectionId?: string;
          documentId?: string;
          pendingOnly?: boolean;
        };

        const where: Record<string, unknown> = {};
        if (sectionId != null && sectionId.length > 0)
          where["sectionId"] = sectionId;
        if (documentId != null && documentId.length > 0)
          where["documentId"] = documentId;
        if (pendingOnly === true) where["answer"] = null;

        const data = await prisma.sectionQuestion.findMany({
          where,
          orderBy: [{ round: "asc" }, { order: "asc" }],
        });

        // If pendingOnly with documentId, return unique section IDs
        if (
          pendingOnly === true &&
          documentId != null &&
          documentId.length > 0
        ) {
          const sectionIds = [...new Set(data.map((d) => d.sectionId))];
          return reply
            .status(200)
            .send({ data: sectionIds, total: sectionIds.length });
        }

        return reply.status(200).send({ data, total: data.length });
      } catch (error: unknown) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // GET /section-question/:id
  fastify.get(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Sufficiency"],
        params: {
          type: "object",
          properties: { id: { type: "string", format: "uuid" } },
          required: ["id"],
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const question = await prisma.sectionQuestion.findUnique({
          where: { id },
        });
        if (!question) return reply.status(404).send({ error: "Not found" });
        return reply.status(200).send(question);
      } catch {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // POST /section-question - Create (batch insert)
  fastify.post(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Sufficiency"],
        body: {
          oneOf: [
            {
              type: "object",
              properties: {
                sectionId: { type: "string", format: "uuid" },
                documentId: { type: "string", format: "uuid" },
                question: { type: "string" },
                order: { type: "integer" },
                round: { type: "integer" },
              },
              required: ["sectionId", "documentId", "question", "order"],
            },
            {
              type: "array",
              items: {
                type: "object",
                properties: {
                  sectionId: { type: "string", format: "uuid" },
                  documentId: { type: "string", format: "uuid" },
                  question: { type: "string" },
                  order: { type: "integer" },
                  round: { type: "integer" },
                },
                required: ["sectionId", "documentId", "question", "order"],
              },
            },
          ],
        },
      },
    },
    async (request, reply) => {
      try {
        const body = request.body;

        if (Array.isArray(body)) {
          const items = body as Array<{
            sectionId: string;
            documentId: string;
            question: string;
            order: number;
            round?: number;
          }>;
          const result = await prisma.sectionQuestion.createMany({
            data: items.map((item) => ({
              sectionId: item.sectionId,
              documentId: item.documentId,
              question: item.question,
              order: item.order,
              round: item.round ?? 1,
            })),
          });
          return reply.status(201).send({ count: result.count });
        }

        const data = body as {
          sectionId: string;
          documentId: string;
          question: string;
          order: number;
          round?: number;
        };
        const question = await prisma.sectionQuestion.create({
          data: {
            sectionId: data.sectionId,
            documentId: data.documentId,
            question: data.question,
            order: data.order,
            round: data.round ?? 1,
          },
        });
        return reply.status(201).send(question);
      } catch (error: unknown) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // PUT /section-question/:id - Update (save answer)
  fastify.put(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Sufficiency"],
        params: {
          type: "object",
          properties: { id: { type: "string", format: "uuid" } },
          required: ["id"],
        },
        body: {
          type: "object",
          properties: {
            answer: { type: "string", nullable: true },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const { answer } = request.body as { answer?: string | null };

        const existing = await prisma.sectionQuestion.findUnique({
          where: { id },
        });
        if (!existing) return reply.status(404).send({ error: "Not found" });

        const question = await prisma.sectionQuestion.update({
          where: { id },
          data: { answer: answer ?? null },
        });
        return reply.status(200).send(question);
      } catch {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // POST /section-question/batch-answer - Save multiple answers
  fastify.post(
    "/batch-answer",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Sufficiency"],
        body: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              answer: { type: "string" },
            },
            required: ["id", "answer"],
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const answers = request.body as Array<{ id: string; answer: string }>;

        const results = await Promise.all(
          answers.map((a) =>
            prisma.sectionQuestion.update({
              where: { id: a.id },
              data: { answer: a.answer },
            }),
          ),
        );

        return reply.status(200).send({ updated: results.length });
      } catch (error: unknown) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );
};

export default routes;
