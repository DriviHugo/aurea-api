import type { FastifyPluginAsync } from "fastify";
import type { PrismaClient } from "@prisma/client";

// Convert snake_case type to camelCase for Prisma enum
function convertDocumentType(type: string): string {
  const typeMap: Record<string, string> = {
    memoria: "report",
    report: "report",
    ppt: "technicalSpecs",
    technicalSpecs: "technicalSpecs",
    pcap: "adminClauses",
    adminClauses: "adminClauses",
    anexo_tecnico: "technicalAnnex",
    technicalAnnex: "technicalAnnex",
    anexo_economico: "economicAnnex",
    economicAnnex: "economicAnnex",
    informe_necesidad: "needsReport",
    needsReport: "needsReport",
    justificacion_procedimiento: "procedureJustification",
    procedureJustification: "procedureJustification",
  };
  return typeMap[type] || type;
}

// Convert snake_case status to camelCase for Prisma enum
function convertReviewStatus(status: string): string {
  const statusMap: Record<string, string> = {
    pendiente: "pending",
    pending: "pending",
    en_revision: "inReview",
    inReview: "inReview",
    aprobado: "approved",
    approved: "approved",
    rechazado: "rejected",
    rejected: "rejected",
    corregir: "toCorrect",
    toCorrect: "toCorrect",
  };
  return statusMap[status] || "pending";
}

// Convert camelCase status back to snake_case for API response
function convertStatusToSnakeCase(status: string): string {
  const statusMap: Record<string, string> = {
    pending: "pendiente",
    inReview: "en_revision",
    approved: "aprobado",
    rejected: "rechazado",
    toCorrect: "corregir",
  };
  return statusMap[status] || status;
}

// Convert camelCase type back to snake_case for API response (backward compatibility)
function convertTypeToSnakeCase(type: string): string {
  const typeMap: Record<string, string> = {
    report: "memoria",
    technicalSpecs: "ppt",
    adminClauses: "pcap",
    technicalAnnex: "anexo_tecnico",
    economicAnnex: "anexo_economico",
    needsReport: "informe_necesidad",
    procedureJustification: "justificacion_procedimiento",
  };
  return typeMap[type] || type;
}

// Helper to normalize document response
function normalizeDocument(doc: any) {
  return {
    ...doc,
    type: convertTypeToSnakeCase(doc.type),
    status: convertStatusToSnakeCase(doc.status),
  };
}

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // GET /documentos - List with pagination
  fastify.get(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Documentos"],
        description: "Get paginated list of documentos",
        querystring: {
          type: "object",
          properties: {
            page: { type: "integer", minimum: 1, default: 1 },
            limit: { type: "integer", minimum: 1, maximum: 100, default: 10 },
            caseId: { type: "string", format: "uuid" },
            type: { type: "string" },
            status: { type: "string" },
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
                    type: { type: "string" },
                    name: { type: "string" },
                    version: { type: "integer" },
                    hash: { type: "string", nullable: true },
                    status: { type: "string" },
                    content: { type: "object", nullable: true },
                    docxUrl: { type: "string", nullable: true },
                    pdfUrl: { type: "string", nullable: true },
                    creatorId: { type: "string" },
                    createdAt: { type: "string", format: "date-time" },
                    updatedAt: { type: "string", format: "date-time" },
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
          type,
          status,
        } = request.query as any;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (caseId) where.caseId = caseId;
        // Convert type from snake_case to camelCase for Prisma query
        if (type) where.type = convertDocumentType(type);
        if (status) where.status = convertReviewStatus(status);

        const [documents, total] = await Promise.all([
          prisma.document.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
          }),
          prisma.document.count({ where }),
        ]);

        const totalPages = Math.ceil(total / limit);

        return reply.status(200).send({
          data: documents.map(normalizeDocument),
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

  // GET /documentos/:id - Get single documento
  fastify.get(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Documentos"],
        description: "Get documento by ID",
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
              caseId: { type: "string" },
              type: { type: "string" },
              name: { type: "string" },
              version: { type: "integer" },
              hash: { type: "string", nullable: true },
              status: { type: "string" },
              content: { type: "object", nullable: true },
              docxUrl: { type: "string", nullable: true },
              pdfUrl: { type: "string", nullable: true },
              creatorId: { type: "string" },
              createdAt: { type: "string", format: "date-time" },
              updatedAt: { type: "string", format: "date-time" },
              case: { type: "object" },
              creator: { type: "object" },
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

        const document = await prisma.document.findUnique({
          where: { id },
        });

        if (!document) {
          return reply.status(404).send({ error: "Document not found" });
        }

        return reply.status(200).send(normalizeDocument(document));
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // POST /documentos - Create documento
  fastify.post(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Documentos"],
        description: "Create new document",
        body: {
          type: "object",
          required: ["caseId", "type", "name", "creatorId"],
          properties: {
            caseId: { type: "string", format: "uuid" },
            type: { type: "string" },
            name: { type: "string", minLength: 1 },
            version: { type: "integer", minimum: 1 },
            hash: { type: "string" },
            status: { type: "string" },
            content: { type: "object" },
            docxUrl: { type: "string" },
            pdfUrl: { type: "string" },
            creatorId: { type: "string", format: "uuid" },
          },
        },
        response: {
          201: {
            type: "object",
            properties: {
              id: { type: "string" },
              caseId: { type: "string" },
              type: { type: "string" },
              name: { type: "string" },
              version: { type: "integer" },
              hash: { type: "string", nullable: true },
              status: { type: "string" },
              content: { type: "object", nullable: true },
              docxUrl: { type: "string", nullable: true },
              pdfUrl: { type: "string", nullable: true },
              creatorId: { type: "string" },
              createdAt: { type: "string", format: "date-time" },
              updatedAt: { type: "string", format: "date-time" },
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
        fastify.log.info({ body: data }, "POST /documents - received data");

        // Verify case exists
        const caseEntity = await prisma.case.findUnique({
          where: { id: data.caseId },
        });

        if (!caseEntity) {
          fastify.log.warn({ caseId: data.caseId }, "Case not found");
          return reply.status(400).send({ error: "Case not found" });
        }

        // Verify creator exists
        const creator = await prisma.profile.findUnique({
          where: { id: data.creatorId },
        });

        if (!creator) {
          fastify.log.warn({ creatorId: data.creatorId }, "Creator not found");
          return reply.status(400).send({ error: "Creator not found" });
        }

        const document = await prisma.document.create({
          data: {
            caseId: data.caseId,
            type: convertDocumentType(data.type) as any,
            name: data.name,
            version: data.version || 1,
            hash: data.hash,
            status: convertReviewStatus(data.status || "pending") as any,
            content: data.content,
            docxUrl: data.docxUrl,
            pdfUrl: data.pdfUrl,
            creatorId: data.creatorId,
          },
        });

        fastify.log.info(
          { documentId: document.id },
          "Document created successfully",
        );
        return reply.status(201).send(normalizeDocument(document));
      } catch (error) {
        fastify.log.error(
          { error, body: request.body },
          "POST /documents - error creating document",
        );
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // PUT /documents/:id - Update document
  fastify.put(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Documents"],
        description: "Update document by ID",
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
            type: { type: "string" },
            name: { type: "string", minLength: 1 },
            version: { type: "integer", minimum: 1 },
            hash: { type: "string" },
            status: { type: "string" },
            content: { type: "object" },
            docxUrl: { type: "string" },
            pdfUrl: { type: "string" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              id: { type: "string" },
              caseId: { type: "string" },
              type: { type: "string" },
              name: { type: "string" },
              version: { type: "integer" },
              hash: { type: "string", nullable: true },
              status: { type: "string" },
              content: { type: "object", nullable: true },
              docxUrl: { type: "string", nullable: true },
              pdfUrl: { type: "string", nullable: true },
              creatorId: { type: "string" },
              createdAt: { type: "string", format: "date-time" },
              updatedAt: { type: "string", format: "date-time" },
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

        const existingDocument = await prisma.document.findUnique({
          where: { id },
        });

        if (!existingDocument) {
          return reply.status(404).send({ error: "Document not found" });
        }

        const document = await prisma.document.update({
          where: { id },
          data: {
            type: data.type
              ? (convertDocumentType(data.type) as any)
              : undefined,
            name: data.name,
            version: data.version,
            hash: data.hash,
            status: data.status
              ? (convertReviewStatus(data.status) as any)
              : undefined,
            content: data.content,
            docxUrl: data.docxUrl,
            pdfUrl: data.pdfUrl,
          },
        });

        return reply.status(200).send(normalizeDocument(document));
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // DELETE /documents/:id - Delete document
  fastify.delete(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Documents"],
        description: "Delete document by ID",
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

        const existingDocument = await prisma.document.findUnique({
          where: { id },
        });

        if (!existingDocument) {
          return reply.status(404).send({ error: "Document not found" });
        }

        await prisma.document.delete({
          where: { id },
        });

        return reply
          .status(200)
          .send({ message: "Document deleted successfully" });
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );
};

export default routes;
