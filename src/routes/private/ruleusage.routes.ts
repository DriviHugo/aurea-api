import type { FastifyPluginAsync } from "fastify";
import type { PrismaClient } from "@prisma/client";

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // GET /rule-usage?documentId=xxx&sectionId=yyy - List rule usages with rule details
  fastify.get(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Repairs"],
        description: "List rule usages for a document section",
        querystring: {
          type: "object",
          properties: {
            documentId: { type: "string", format: "uuid" },
            sectionId: { type: "string", format: "uuid" },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { documentId, sectionId } = request.query as {
          documentId?: string;
          sectionId?: string;
        };

        const where: any = {};
        if (documentId) where.documentId = documentId;
        if (sectionId) where.sectionId = sectionId;

        const data = await prisma.ruleUsage.findMany({
          where,
          include: { rule: true },
        });

        return reply.status(200).send({ data, total: data.length });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // POST /rule-usage - Create
  fastify.post(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Repairs"],
        body: {
          type: "object",
          properties: {
            documentId: { type: "string", format: "uuid" },
            sectionId: { type: "string", format: "uuid" },
            ruleId: { type: "string", format: "uuid" },
          },
          required: ["documentId", "sectionId", "ruleId"],
        },
      },
    },
    async (request, reply) => {
      try {
        const data = request.body as {
          documentId: string;
          sectionId: string;
          ruleId: string;
        };

        const usage = await prisma.ruleUsage.create({ data });
        return reply.status(201).send(usage);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );
};

export default routes;
