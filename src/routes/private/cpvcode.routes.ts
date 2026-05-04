import type { FastifyPluginAsync } from "fastify";
import type { PrismaClient } from "@prisma/client";

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // List CpvCodigos with pagination
  fastify.get(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["CpvCodigo"],
        description: "Get list of CPV codes with pagination",
        querystring: {
          type: "object",
          properties: {
            page: { type: "integer", minimum: 1, default: 1 },
            limit: { type: "integer", minimum: 1, maximum: 100, default: 10 },
            active: { type: "boolean" },
            level: { type: "integer", minimum: 1 },
            code: { type: "string" },
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
                    id: { type: "string" },
                    code: { type: "string" },
                    description: { type: "string" },
                    descriptionEn: { type: "string", nullable: true },
                    level: { type: "integer" },
                    parentCode: { type: "string", nullable: true },
                    active: { type: "boolean" },
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
          active,
          level,
          code,
        } = request.query as any;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (active !== undefined) where.active = active;
        if (level !== undefined) where.level = level;
        if (code) where.code = { contains: code, mode: "insensitive" };

        const [data, total] = await Promise.all([
          prisma.cpvCode.findMany({
            where,
            skip,
            take: limit,
            orderBy: { code: "asc" },
          }),
          prisma.cpvCode.count({ where }),
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

  // Get CpvCodigo by ID
  fastify.get(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["CpvCodigo"],
        description: "Get CPV code by ID",
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
              id: { type: "string" },
              code: { type: "string" },
              description: { type: "string" },
              descriptionEn: { type: "string", nullable: true },
              level: { type: "integer" },
              parentCode: { type: "string", nullable: true },
              active: { type: "boolean" },
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

        const cpvCodigo = await prisma.cpvCode.findUnique({
          where: { id },
        });

        if (!cpvCodigo) {
          return reply.status(404).send({ error: "CPV code not found" });
        }

        return reply.status(200).send(cpvCodigo);
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // Create CpvCodigo
  fastify.post(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["CpvCodigo"],
        description: "Create new CPV code",
        body: {
          type: "object",
          required: ["code", "description", "level"],
          properties: {
            code: { type: "string", minLength: 1 },
            description: { type: "string", minLength: 1 },
            descriptionEn: { type: "string", nullable: true },
            level: { type: "integer", minimum: 1 },
            parentCode: { type: "string", nullable: true },
            active: { type: "boolean", default: true },
          },
        },
        response: {
          404: { type: "object", properties: { error: { type: "string" } } },
          500: { type: "object", properties: { error: { type: "string" } } },
          201: {
            type: "object",
            properties: {
              id: { type: "string" },
              code: { type: "string" },
              description: { type: "string" },
              descriptionEn: { type: "string", nullable: true },
              level: { type: "integer" },
              parentCode: { type: "string", nullable: true },
              active: { type: "boolean" },
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

        const cpvCodigo = await prisma.cpvCode.create({ data });

        return reply.status(201).send(cpvCodigo);
      } catch (error: any) {
        if (error.code === "P2002") {
          return reply.status(400).send({ error: "CPV code already exists" });
        }
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // Update CpvCodigo
  fastify.put(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["CpvCodigo"],
        description: "Update CPV code by ID",
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
            code: { type: "string", minLength: 1 },
            description: { type: "string", minLength: 1 },
            descriptionEn: { type: "string", nullable: true },
            level: { type: "integer", minimum: 1 },
            parentCode: { type: "string", nullable: true },
            active: { type: "boolean" },
          },
        },
        response: {
          500: { type: "object", properties: { error: { type: "string" } } },
          200: {
            type: "object",
            properties: {
              id: { type: "string" },
              code: { type: "string" },
              description: { type: "string" },
              descriptionEn: { type: "string", nullable: true },
              level: { type: "integer" },
              parentCode: { type: "string", nullable: true },
              active: { type: "boolean" },
              createdAt: { type: "string", format: "date-time" },
            },
          },
          404: {
            type: "object",
            properties: {
              error: { type: "string" },
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
        const { id } = request.params as { id: string };
        const data = request.body as any;

        const existingCpvCodigo = await prisma.cpvCode.findUnique({
          where: { id },
        });

        if (!existingCpvCodigo) {
          return reply.status(404).send({ error: "CPV code not found" });
        }

        const cpvCodigo = await prisma.cpvCode.update({
          where: { id },
          data,
        });

        return reply.status(200).send(cpvCodigo);
      } catch (error: any) {
        if (error.code === "P2002") {
          return reply.status(400).send({ error: "CPV code already exists" });
        }
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // Delete CpvCodigo
  fastify.delete(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["CpvCodigo"],
        description: "Delete CPV code by ID",
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

        const existingCpvCodigo = await prisma.cpvCode.findUnique({
          where: { id },
        });

        if (!existingCpvCodigo) {
          return reply.status(404).send({ error: "CPV code not found" });
        }

        await prisma.cpvCode.delete({
          where: { id },
        });

        return reply
          .status(200)
          .send({ message: "CPV code deleted successfully" });
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );
};

export default routes;
