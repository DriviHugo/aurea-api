import type { FastifyPluginAsync } from "fastify";
import type { PrismaClient } from "@prisma/client";

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // GET /repair-extraction?documentId=xxx - List extractions for a document
  fastify.get(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Repairs"],
        description: "List extractions, optionally filtered by documentId",
        querystring: {
          type: "object",
          properties: {
            documentId: { type: "string", format: "uuid" },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { documentId } = request.query as { documentId?: string };

        const where =
          documentId != null && documentId.length > 0 ? { documentId } : {};
        const data = await prisma.repairExtraction.findMany({
          where,
          orderBy: { createdAt: "asc" },
        });

        return reply.status(200).send({ data, total: data.length });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // GET /repair-extraction/:id
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
        const extraction = await prisma.repairExtraction.findUnique({
          where: { id },
        });
        if (!extraction) return reply.status(404).send({ error: "Not found" });
        return reply.status(200).send(extraction);
      } catch {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // POST /repair-extraction - Create
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
            affectedSection: { type: "string", nullable: true },
            errorType: { type: "string", nullable: true },
            literalDescription: { type: "string" },
            normReference: { type: "string", nullable: true },
            consequence: { type: "string", nullable: true },
            originalText: { type: "string", nullable: true },
          },
          required: ["documentId", "literalDescription"],
        },
      },
    },
    async (request, reply) => {
      try {
        const data = request.body as {
          documentId: string;
          affectedSection?: string | null;
          errorType?: string | null;
          literalDescription: string;
          normReference?: string | null;
          consequence?: string | null;
          originalText?: string | null;
        };

        const extraction = await prisma.repairExtraction.create({
          data: {
            documentId: data.documentId,
            affectedSection: data.affectedSection ?? null,
            errorType: data.errorType ?? null,
            literalDescription: data.literalDescription,
            normReference: data.normReference ?? null,
            consequence: data.consequence ?? null,
            originalText: data.originalText ?? null,
          },
        });
        return reply.status(201).send(extraction);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );
};

export default routes;
