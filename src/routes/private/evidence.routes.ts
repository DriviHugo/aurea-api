import type { FastifyPluginAsync } from "fastify";
import type { PrismaClient } from "@prisma/client";

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // List evidence with pagination
  fastify.get(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Evidence"],
        description: "Get list of evidence with pagination",
        querystring: {
          type: "object",
          properties: {
            page: { type: "integer", minimum: 1, default: 1 },
            limit: { type: "integer", minimum: 1, maximum: 100, default: 10 },
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
                    sourceType: { type: "string" },
                    sourceId: { type: "string" },
                    sourceName: { type: "string" },
                    section: { type: "string", nullable: true },
                    range: { type: "string", nullable: true },
                    version: { type: "string" },
                    validityStart: { type: "string", format: "date" },
                    validityEnd: {
                      type: "string",
                      format: "date",
                      nullable: true,
                    },
                    textFragment: { type: "string" },
                    metadata: { type: "object" },
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

        const [evidence, total] = await Promise.all([
          prisma.evidence.findMany({
            skip,
            take: limit,
            orderBy: { validityStart: "desc" },
          }),
          prisma.evidence.count(),
        ]);

        const totalPages = Math.ceil(total / limit);

        return reply.status(200).send({
          data: evidence,
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

  // Get evidence by ID
  fastify.get(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Evidence"],
        description: "Get evidence by ID",
        params: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
          },
          required: ["id"],
        },
        response: {
          200: {
            type: "object",
            properties: {
              id: { type: "string" },
              sourceType: { type: "string" },
              sourceId: { type: "string" },
              sourceName: { type: "string" },
              section: { type: "string", nullable: true },
              range: { type: "string", nullable: true },
              version: { type: "string" },
              validityStart: { type: "string", format: "date" },
              validityEnd: {
                type: "string",
                format: "date",
                nullable: true,
              },
              textFragment: { type: "string" },
              metadata: { type: "object" },
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

        const evidence = await prisma.evidence.findUnique({
          where: { id },
        });

        if (!evidence) {
          return reply.status(404).send({ error: "Evidence not found" });
        }

        return reply.status(200).send(evidence);
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // Create evidence
  fastify.post(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Evidence"],
        description: "Create new evidence",
        body: {
          type: "object",
          properties: {
            sourceType: {
              type: "string",
              enum: [
                "law",
                "decree",
                "resolution",
                "circular",
                "concept",
                "jurisprudence",
                "doctrine",
              ],
            },
            sourceId: { type: "string" },
            sourceName: { type: "string" },
            section: { type: "string", nullable: true },
            range: { type: "string", nullable: true },
            version: { type: "string" },
            validityStart: { type: "string", format: "date" },
            validityEnd: {
              type: "string",
              format: "date",
              nullable: true,
            },
            textFragment: { type: "string" },
            metadata: { type: "object", default: {} },
          },
          required: [
            "sourceType",
            "sourceId",
            "sourceName",
            "version",
            "validityStart",
            "textFragment",
          ],
        },
        response: {
          201: {
            type: "object",
            properties: {
              id: { type: "string" },
              sourceType: { type: "string" },
              sourceId: { type: "string" },
              sourceName: { type: "string" },
              section: { type: "string", nullable: true },
              range: { type: "string", nullable: true },
              version: { type: "string" },
              validityStart: { type: "string", format: "date" },
              validityEnd: {
                type: "string",
                format: "date",
                nullable: true,
              },
              textFragment: { type: "string" },
              metadata: { type: "object" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const data = request.body as {
          sourceType: string;
          sourceId: string;
          sourceName: string;
          section?: string;
          range?: string;
          version: string;
          validityStart: string;
          validityEnd?: string;
          textFragment: string;
          metadata?: object;
        };

        const evidence = await prisma.evidence.create({
          data: {
            sourceType: data.sourceType as any,
            sourceId: data.sourceId,
            sourceName: data.sourceName,
            section: data.section,
            range: data.range,
            version: data.version,
            validityStart: new Date(data.validityStart),
            validityEnd: data.validityEnd ? new Date(data.validityEnd) : null,
            textFragment: data.textFragment,
            metadata: data.metadata || {},
          },
        });

        return reply.status(201).send(evidence);
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // Update evidence
  fastify.put(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Evidence"],
        description: "Update evidence by ID",
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
            sourceType: {
              type: "string",
              enum: [
                "law",
                "decree",
                "resolution",
                "circular",
                "concept",
                "jurisprudence",
                "doctrine",
              ],
            },
            sourceId: { type: "string" },
            sourceName: { type: "string" },
            section: { type: "string", nullable: true },
            range: { type: "string", nullable: true },
            version: { type: "string" },
            validityStart: { type: "string", format: "date" },
            validityEnd: {
              type: "string",
              format: "date",
              nullable: true,
            },
            textFragment: { type: "string" },
            metadata: { type: "object" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              id: { type: "string" },
              sourceType: { type: "string" },
              sourceId: { type: "string" },
              sourceName: { type: "string" },
              section: { type: "string", nullable: true },
              range: { type: "string", nullable: true },
              version: { type: "string" },
              validityStart: { type: "string", format: "date" },
              validityEnd: {
                type: "string",
                format: "date",
                nullable: true,
              },
              textFragment: { type: "string" },
              metadata: { type: "object" },
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
          sourceType?: string;
          sourceId?: string;
          sourceName?: string;
          section?: string;
          range?: string;
          version?: string;
          validityStart?: string;
          validityEnd?: string;
          textFragment?: string;
          metadata?: object;
        };

        const existingEvidence = await prisma.evidence.findUnique({
          where: { id },
        });

        if (!existingEvidence) {
          return reply.status(404).send({ error: "Evidence not found" });
        }

        const updateData: any = {};
        if (data.sourceType !== undefined)
          updateData.sourceType = data.sourceType;
        if (data.sourceId !== undefined) updateData.sourceId = data.sourceId;
        if (data.sourceName !== undefined)
          updateData.sourceName = data.sourceName;
        if (data.section !== undefined) updateData.section = data.section;
        if (data.range !== undefined) updateData.range = data.range;
        if (data.version !== undefined) updateData.version = data.version;
        if (data.validityStart !== undefined)
          updateData.validityStart = new Date(data.validityStart);
        if (data.validityEnd !== undefined)
          updateData.validityEnd = data.validityEnd
            ? new Date(data.validityEnd)
            : null;
        if (data.textFragment !== undefined)
          updateData.textFragment = data.textFragment;
        if (data.metadata !== undefined) updateData.metadata = data.metadata;

        const evidence = await prisma.evidence.update({
          where: { id },
          data: updateData,
        });

        return reply.status(200).send(evidence);
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // Delete evidence
  fastify.delete(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Evidence"],
        description: "Delete evidence by ID",
        params: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
          },
          required: ["id"],
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

        const existingEvidence = await prisma.evidence.findUnique({
          where: { id },
        });

        if (!existingEvidence) {
          return reply.status(404).send({ error: "Evidence not found" });
        }

        await prisma.evidence.delete({
          where: { id },
        });

        return reply
          .status(200)
          .send({ message: "Evidence deleted successfully" });
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );
};

export default routes;
