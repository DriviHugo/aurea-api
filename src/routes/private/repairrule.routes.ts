import type { FastifyPluginAsync } from "fastify";
import type { PrismaClient } from "@prisma/client";

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // GET /repair-rule?documentId=xxx&active=true - List rules
  fastify.get(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Repairs"],
        description: "List repair rules, optionally filtered",
        querystring: {
          type: "object",
          properties: {
            documentId: { type: "string", format: "uuid" },
            active: { type: "boolean" },
            orderBy: { type: "string" },
            order: { type: "string", enum: ["asc", "desc"] },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { documentId, active, orderBy, order } = request.query as {
          documentId?: string;
          active?: boolean;
          orderBy?: string;
          order?: "asc" | "desc";
        };

        const where: any = {};
        if (documentId) where.documentId = documentId;
        if (active !== undefined) where.active = active;

        const orderClause: any = {};
        if (orderBy) {
          orderClause[orderBy] = order || "asc";
        } else {
          orderClause.priority = "asc";
        }

        const data = await prisma.repairRule.findMany({
          where,
          orderBy: orderClause,
        });

        return reply.status(200).send({ data, total: data.length });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // GET /repair-rule/consolidated - Get active rules grouped by section and category
  fastify.get(
    "/consolidated",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Repairs"],
        description: "Get consolidated active rules grouped by section and category",
      },
    },
    async (_request, reply) => {
      try {
        const rules = await prisma.repairRule.findMany({
          where: { active: true },
          orderBy: [{ caseSection: "asc" }, { priority: "asc" }],
        });

        // Group by caseSection then by category
        const grouped: Record<string, Record<string, typeof rules>> = {};
        for (const rule of rules) {
          const section = rule.caseSection;
          const cat = rule.category;
          if (!grouped[section]) {
            grouped[section] = {};
          }
          if (!grouped[section]![cat]) {
            grouped[section]![cat] = [];
          }
          grouped[section]![cat]!.push(rule);
        }

        return reply.status(200).send(grouped);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // GET /repair-rule/:id
  fastify.get(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Repairs"],
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
        const rule = await prisma.repairRule.findUnique({ where: { id } });
        if (!rule) return reply.status(404).send({ error: "Not found" });
        return reply.status(200).send(rule);
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // POST /repair-rule - Create
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
            extractionId: { type: "string", format: "uuid", nullable: true },
            caseSection: { type: "string" },
            category: { type: "string" },
            type: { type: "string", enum: ["do", "dont"] },
            content: { type: "string" },
            priority: { type: "integer" },
            active: { type: "boolean" },
          },
          required: ["documentId", "caseSection", "category", "type", "content"],
        },
      },
    },
    async (request, reply) => {
      try {
        const data = request.body as any;
        const rule = await prisma.repairRule.create({ data });
        return reply.status(201).send(rule);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // PUT /repair-rule/:id - Update (used for toggling active status)
  fastify.put(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Repairs"],
        params: {
          type: "object",
          properties: { id: { type: "string", format: "uuid" } },
          required: ["id"],
        },
        body: {
          type: "object",
          properties: {
            active: { type: "boolean" },
            content: { type: "string" },
            priority: { type: "integer" },
            category: { type: "string" },
            caseSection: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = request.body as any;
        const existing = await prisma.repairRule.findUnique({ where: { id } });
        if (!existing) return reply.status(404).send({ error: "Not found" });

        const rule = await prisma.repairRule.update({ where: { id }, data });
        return reply.status(200).send(rule);
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );
};

export default routes;
