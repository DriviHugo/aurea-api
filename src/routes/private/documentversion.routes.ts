import type { FastifyPluginAsync } from "fastify";
import type { PrismaClient } from "@prisma/client";

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // GET /document-versions - List with pagination
  fastify.get(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["DocumentVersion"],
        description: "Get paginated list of document versions",
        querystring: {
          type: "object",
          properties: {
            page: { type: "integer", minimum: 1, default: 1 },
            limit: { type: "integer", minimum: 1, maximum: 100, default: 10 },
            documentId: { type: "string", format: "uuid" },
          },
        },
        response: {
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
                    documentId: { type: "string", format: "uuid" },
                    version: { type: "integer" },
                    contentSnapshot: { type: "object" },
                    sectionsSnapshot: { type: "object", nullable: true },
                    changeDescription: { type: "string", nullable: true },
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
        const { page = 1, limit = 10, documentId } = request.query as any;
        const skip = (page - 1) * limit;

        const where = documentId ? { documentId } : {};

        const [data, total] = await Promise.all([
          prisma.documentVersion.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
          }),
          prisma.documentVersion.count({ where }),
        ]);

        const totalPages = Math.ceil(total / limit);

        return reply.status(200).send({
          data,
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

  // GET /document-versions/:id - Get by ID
  fastify.get(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["DocumentVersion"],
        description: "Get document version by ID",
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", format: "uuid" },
          },
        },
        response: {
          500: { type: "object", properties: { error: { type: "string" } } },
          200: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              documentId: { type: "string", format: "uuid" },
              version: { type: "integer" },
              contentSnapshot: { type: "object" },
              sectionsSnapshot: { type: "object", nullable: true },
              changeDescription: { type: "string", nullable: true },
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

        const documentVersion = await prisma.documentVersion.findUnique({
          where: { id },
        });

        if (!documentVersion) {
          return reply
            .status(404)
            .send({ error: "Document version not found" });
        }

        return reply.status(200).send(documentVersion);
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // POST /document-versions - Create
  fastify.post(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["DocumentVersion"],
        description: "Create new document version",
        body: {
          type: "object",
          required: ["documentId", "version", "contentSnapshot", "userId"],
          properties: {
            documentId: { type: "string", format: "uuid" },
            version: { type: "integer", minimum: 1 },
            contentSnapshot: { type: "object" },
            sectionsSnapshot: { type: "object", nullable: true },
            changeDescription: { type: "string", nullable: true },
            userId: { type: "string", format: "uuid" },
          },
        },
        response: {
          500: { type: "object", properties: { error: { type: "string" } } },
          201: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              documentId: { type: "string", format: "uuid" },
              version: { type: "integer" },
              contentSnapshot: { type: "object" },
              sectionsSnapshot: { type: "object", nullable: true },
              changeDescription: { type: "string", nullable: true },
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

        const documentVersion = await prisma.documentVersion.create({
          data,
        });

        return reply.status(201).send(documentVersion);
      } catch (error: any) {
        if (error.code === "P2002") {
          return reply
            .status(400)
            .send({ error: "Version already exists for this document" });
        }
        if (error.code === "P2003") {
          return reply
            .status(400)
            .send({ error: "Referenced document or user does not exist" });
        }
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // PUT /document-versions/:id - Update
  fastify.put(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["DocumentVersion"],
        description: "Update document version by ID",
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
            contentSnapshot: { type: "object" },
            sectionsSnapshot: { type: "object", nullable: true },
            changeDescription: { type: "string", nullable: true },
          },
        },
        response: {
          500: { type: "object", properties: { error: { type: "string" } } },
          200: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              documentId: { type: "string", format: "uuid" },
              version: { type: "integer" },
              contentSnapshot: { type: "object" },
              sectionsSnapshot: { type: "object", nullable: true },
              changeDescription: { type: "string", nullable: true },
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

        const existingVersion = await prisma.documentVersion.findUnique({
          where: { id },
        });

        if (!existingVersion) {
          return reply
            .status(404)
            .send({ error: "Document version not found" });
        }

        const documentVersion = await prisma.documentVersion.update({
          where: { id },
          data,
        });

        return reply.status(200).send(documentVersion);
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // DELETE /document-versions/:id - Delete
  fastify.post(
    "/:id/restore",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["DocumentVersion"],
        description:
          "Restore document to a previous version and create backup/restore snapshots",
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
            userId: { type: "string", format: "uuid" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              restoredFrom: { type: "integer" },
              newVersion: { type: "integer" },
            },
          },
          400: { type: "object", properties: { error: { type: "string" } } },
          404: { type: "object", properties: { error: { type: "string" } } },
          500: { type: "object", properties: { error: { type: "string" } } },
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = (request.body || {}) as {
          documentId?: string;
          userId?: string;
        };

        const targetVersion = await prisma.documentVersion.findUnique({
          where: { id },
        });

        if (!targetVersion) {
          return reply
            .status(404)
            .send({ error: "Document version not found" });
        }

        const documentId = body.documentId || targetVersion.documentId;
        const userId = (request as any).userId || body.userId;

        if (!documentId || !userId) {
          return reply
            .status(400)
            .send({ error: "Missing required fields: documentId and userId" });
        }

        const result = await prisma.$transaction(async (tx) => {
          const currentDocument = await tx.document.findUnique({
            where: { id: documentId },
            select: { id: true, content: true, version: true },
          });

          if (!currentDocument) {
            throw new Error("Document not found");
          }

          const currentSections = await tx.documentSection.findMany({
            where: { documentId },
            orderBy: { order: "asc" },
          });

          const backupVersionNumber = (currentDocument.version || 0) + 1;

          await tx.documentVersion.create({
            data: {
              documentId,
              version: backupVersionNumber,
              contentSnapshot: ((currentDocument.content as unknown) ||
                {}) as any,
              sectionsSnapshot: {
                secciones: currentSections,
              } as any,
              changeDescription: `Backup before restoring from version ${targetVersion.version}`,
              userId,
            },
          });

          const snapshot =
            (targetVersion.sectionsSnapshot as Record<
              string,
              unknown
            > | null) || {};
          const restoredSectionsRaw =
            (snapshot["secciones"] as Array<Record<string, unknown>>) || [];

          if (restoredSectionsRaw.length > 0) {
            await tx.documentSection.deleteMany({ where: { documentId } });

            await tx.documentSection.createMany({
              data: restoredSectionsRaw.map((sectionRaw) => {
                const section = sectionRaw as any;
                return {
                  documentId,
                  order: Number(section["order"] ?? section["orden"] ?? 0),
                  title: String(
                    section["title"] ?? section["titulo"] ?? "Untitled",
                  ),
                  description: (section["description"] ??
                    section["descripcion"] ??
                    null) as string | null,
                  content: (section["content"] ??
                    section["contenido"] ??
                    null) as string | null,
                  status: String(
                    section["status"] ?? section["estado"] ?? "edited",
                  ),
                  tokensUsed:
                    section["tokensUsed"] != null
                      ? Number(section["tokensUsed"])
                      : section["tokens_usados"] != null
                        ? Number(section["tokens_usados"])
                        : null,
                  generationTimeMs:
                    section["generationTimeMs"] != null
                      ? Number(section["generationTimeMs"])
                      : section["tiempo_generacion_ms"] != null
                        ? Number(section["tiempo_generacion_ms"])
                        : null,
                  aiProvider: (section["aiProvider"] ??
                    section["ai_provider"] ??
                    null) as string | null,
                  aiModel: (section["aiModel"] ??
                    section["ai_model"] ??
                    null) as string | null,
                  lcspArticles: Array.isArray(
                    section["lcspArticles"] ?? section["articulos_lcsp"],
                  )
                    ? ((section["lcspArticles"] ??
                        section["articulos_lcsp"]) as string[])
                    : [],
                };
              }),
            });
          }

          const restoredVersionNumber = backupVersionNumber + 1;

          await tx.document.update({
            where: { id: documentId },
            data: {
              content: ((targetVersion.contentSnapshot as unknown) ||
                {}) as any,
              version: restoredVersionNumber,
            },
          });

          await tx.documentVersion.create({
            data: {
              documentId,
              version: restoredVersionNumber,
              contentSnapshot: ((targetVersion.contentSnapshot as unknown) ||
                {}) as any,
              sectionsSnapshot: ((targetVersion.sectionsSnapshot as unknown) ||
                {}) as any,
              changeDescription: `Restored from version ${targetVersion.version}`,
              userId,
            },
          });

          return {
            restoredFrom: targetVersion.version,
            newVersion: restoredVersionNumber,
          };
        });

        return reply.status(200).send(result);
      } catch (error: any) {
        if (error instanceof Error && error.message === "Document not found") {
          return reply.status(404).send({ error: error.message });
        }
        fastify.log.error({ error }, "Failed to restore document version");
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // DELETE /document-versions/:id - Delete
  fastify.delete(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["DocumentVersion"],
        description: "Delete document version by ID",
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", format: "uuid" },
          },
        },
        response: {
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

        const existingVersion = await prisma.documentVersion.findUnique({
          where: { id },
        });

        if (!existingVersion) {
          return reply
            .status(404)
            .send({ error: "Document version not found" });
        }

        await prisma.documentVersion.delete({
          where: { id },
        });

        return reply
          .status(200)
          .send({ message: "Document version deleted successfully" });
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );
};

export default routes;
