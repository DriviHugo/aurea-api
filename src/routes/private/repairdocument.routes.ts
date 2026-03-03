import type { FastifyPluginAsync } from "fastify";
import type { PrismaClient } from "@prisma/client";

const repairDocumentResponseSchema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    name: { type: "string" },
    size: { type: "integer" },
    storagePath: { type: "string" },
    status: { type: "string" },
    errorMessage: { type: "string", nullable: true },
    uploadedBy: { type: "string", format: "uuid" },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
};

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // =========== REPAIR DOCUMENTS ===========

  // GET /repair-document - List all repair documents
  fastify.get(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Repairs"],
        description: "List all repair documents",
        response: {
          200: {
            type: "object",
            properties: {
              data: { type: "array", items: repairDocumentResponseSchema },
              total: { type: "integer" },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      try {
        const data = await prisma.repairDocument.findMany({
          orderBy: { createdAt: "desc" },
        });
        return reply.status(200).send({ data, total: data.length });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // GET /repair-document/:id
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
        response: {
          200: repairDocumentResponseSchema,
          404: { type: "object", properties: { error: { type: "string" } } },
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const doc = await prisma.repairDocument.findUnique({ where: { id } });
        if (!doc) return reply.status(404).send({ error: "Repair document not found" });
        return reply.status(200).send(doc);
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // POST /repair-document - Create (typically created during file upload processing)
  fastify.post(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Repairs"],
        body: {
          type: "object",
          properties: {
            name: { type: "string" },
            size: { type: "integer" },
            storagePath: { type: "string" },
            status: { type: "string" },
            uploadedBy: { type: "string", format: "uuid" },
          },
          required: ["name", "size", "storagePath", "uploadedBy"],
        },
        response: { 201: repairDocumentResponseSchema },
      },
    },
    async (request, reply) => {
      try {
        const data = request.body as {
          name: string;
          size: number;
          storagePath: string;
          status?: string;
          uploadedBy: string;
        };

        const doc = await prisma.repairDocument.create({
          data: {
            name: data.name,
            size: data.size,
            storagePath: data.storagePath,
            status: data.status || "processing",
            uploadedBy: data.uploadedBy,
          },
        });

        return reply.status(201).send(doc);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // PUT /repair-document/:id - Update status
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
            status: { type: "string" },
            errorMessage: { type: "string", nullable: true },
          },
        },
        response: {
          200: repairDocumentResponseSchema,
          404: { type: "object", properties: { error: { type: "string" } } },
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = request.body as { status?: string; errorMessage?: string | null };
        const existing = await prisma.repairDocument.findUnique({ where: { id } });
        if (!existing) return reply.status(404).send({ error: "Not found" });

        const doc = await prisma.repairDocument.update({ where: { id }, data: data as any });
        return reply.status(200).send(doc);
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // DELETE /repair-document/:id - Delete document and cascading data
  fastify.delete(
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
        response: {
          200: { type: "object", properties: { message: { type: "string" } } },
          404: { type: "object", properties: { error: { type: "string" } } },
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const existing = await prisma.repairDocument.findUnique({ where: { id } });
        if (!existing) return reply.status(404).send({ error: "Not found" });

        // Cascade delete handled by Prisma schema
        await prisma.repairDocument.delete({ where: { id } });
        return reply.status(200).send({ message: "Repair document and related data deleted" });
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );
};

export default routes;
