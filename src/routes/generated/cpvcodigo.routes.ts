import type { FastifyPluginAsync } from "fastify";
import type { PrismaClient } from "@prisma/client";

const cpvCodigoBodySchema = {
  type: "object",
  required: ["codigo", "descripcion", "nivel"],
  properties: {
    codigo: { type: "string", minLength: 1, maxLength: 20 },
    descripcion: { type: "string", minLength: 1, maxLength: 500 },
    descripcionEn: { type: "string", maxLength: 500 },
    nivel: { type: "integer", minimum: 1, maximum: 10 },
    codigoPadre: { type: "string", maxLength: 20 },
    activo: { type: "boolean" },
  },
  additionalProperties: false,
};

const cpvCodigoUpdateSchema = {
  type: "object",
  properties: {
    codigo: { type: "string", minLength: 1, maxLength: 20 },
    descripcion: { type: "string", minLength: 1, maxLength: 500 },
    descripcionEn: { type: "string", maxLength: 500 },
    nivel: { type: "integer", minimum: 1, maximum: 10 },
    codigoPadre: { type: "string", maxLength: 20 },
    activo: { type: "boolean" },
  },
  additionalProperties: false,
};

const cpvCodigoResponseSchema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    codigo: { type: "string" },
    descripcion: { type: "string" },
    descripcionEn: { type: "string" },
    nivel: { type: "integer" },
    codigoPadre: { type: "string" },
    activo: { type: "boolean" },
    createdAt: { type: "string", format: "date-time" },
  },
};

const paginationQuerySchema = {
  type: "object",
  properties: {
    page: { type: "integer", minimum: 1, default: 1 },
    limit: { type: "integer", minimum: 1, maximum: 100, default: 10 },
    codigo: { type: "string" },
    descripcion: { type: "string" },
    nivel: { type: "integer" },
    activo: { type: "boolean" },
  },
};

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // GET /cpv-codigos - List CPV codes with pagination and filters
  fastify.get(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["CPV Códigos"],
        description: "Get paginated list of CPV codes with optional filters",
        querystring: paginationQuerySchema,
        response: {
          200: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: cpvCodigoResponseSchema,
              },
              total: { type: "integer" },
              page: { type: "integer" },
              limit: { type: "integer" },
              totalPages: { type: "integer" },
            },
          },
          500: {
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
        const {
          page = 1,
          limit = 10,
          codigo,
          descripcion,
          nivel,
          activo,
        } = request.query as any;
        const skip = (page - 1) * limit;

        const where: any = {};

        if (codigo) {
          where.codigo = {
            contains: codigo,
            mode: "insensitive",
          };
        }

        if (descripcion) {
          where.OR = [
            {
              descripcion: {
                contains: descripcion,
                mode: "insensitive",
              },
            },
            {
              descripcionEn: {
                contains: descripcion,
                mode: "insensitive",
              },
            },
          ];
        }

        if (nivel !== undefined) {
          where.nivel = nivel;
        }

        if (activo !== undefined) {
          where.activo = activo;
        }

        const [data, total] = await Promise.all([
          prisma.cpvCodigo.findMany({
            where,
            skip,
            take: limit,
            orderBy: [{ nivel: "asc" }, { codigo: "asc" }],
          }),
          prisma.cpvCodigo.count({ where }),
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
        fastify.log.error(error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // GET /cpv-codigos/:id - Get CPV code by ID
  fastify.get(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["CPV Códigos"],
        description: "Get CPV code by ID",
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", format: "uuid" },
          },
        },
        response: {
          200: cpvCodigoResponseSchema,
          404: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
          500: {
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

        const cpvCodigo = await prisma.cpvCodigo.findUnique({
          where: { id },
        });

        if (!cpvCodigo) {
          return reply.status(404).send({ error: "CPV code not found" });
        }

        return reply.status(200).send(cpvCodigo);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // POST /cpv-codigos - Create new CPV code
  fastify.post(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["CPV Códigos"],
        description: "Create new CPV code",
        body: cpvCodigoBodySchema,
        response: {
          201: cpvCodigoResponseSchema,
          400: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
          500: {
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

        // Validate parent code exists if provided
        if (data.codigoPadre) {
          const parentExists = await prisma.cpvCodigo.findFirst({
            where: { codigo: data.codigoPadre },
          });

          if (!parentExists) {
            return reply
              .status(400)
              .send({ error: "Parent code does not exist" });
          }
        }

        const cpvCodigo = await prisma.cpvCodigo.create({
          data: {
            codigo: data.codigo,
            descripcion: data.descripcion,
            descripcionEn: data.descripcionEn || null,
            nivel: data.nivel,
            codigoPadre: data.codigoPadre || null,
            activo: data.activo ?? true,
          },
        });

        return reply.status(201).send(cpvCodigo);
      } catch (error: any) {
        fastify.log.error(error);

        if (error.code === "P2002" && error.meta?.target?.includes("codigo")) {
          return reply.status(400).send({ error: "CPV code already exists" });
        }

        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // PUT /cpv-codigos/:id - Update CPV code
  fastify.put(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["CPV Códigos"],
        description: "Update CPV code by ID",
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", format: "uuid" },
          },
        },
        body: cpvCodigoUpdateSchema,
        response: {
          200: cpvCodigoResponseSchema,
          400: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
          404: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
          500: {
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

        // Check if CPV code exists
        const existingCpvCodigo = await prisma.cpvCodigo.findUnique({
          where: { id },
        });

        if (!existingCpvCodigo) {
          return reply.status(404).send({ error: "CPV code not found" });
        }

        // Validate parent code exists if provided and changed
        if (
          data.codigoPadre &&
          data.codigoPadre !== existingCpvCodigo.codigoPadre
        ) {
          const parentExists = await prisma.cpvCodigo.findFirst({
            where: { codigo: data.codigoPadre },
          });

          if (!parentExists) {
            return reply
              .status(400)
              .send({ error: "Parent code does not exist" });
          }
        }

        const updateData: any = {};

        if (data.codigo !== undefined) updateData.codigo = data.codigo;
        if (data.descripcion !== undefined)
          updateData.descripcion = data.descripcion;
        if (data.descripcionEn !== undefined)
          updateData.descripcionEn = data.descripcionEn;
        if (data.nivel !== undefined) updateData.nivel = data.nivel;
        if (data.codigoPadre !== undefined)
          updateData.codigoPadre = data.codigoPadre;
        if (data.activo !== undefined) updateData.activo = data.activo;

        const cpvCodigo = await prisma.cpvCodigo.update({
          where: { id },
          data: updateData,
        });

        return reply.status(200).send(cpvCodigo);
      } catch (error: any) {
        fastify.log.error(error);

        if (error.code === "P2002" && error.meta?.target?.includes("codigo")) {
          return reply.status(400).send({ error: "CPV code already exists" });
        }

        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // DELETE /cpv-codigos/:id - Delete CPV code
  fastify.delete(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["CPV Códigos"],
        description: "Delete CPV code by ID",
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
          400: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
          404: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
          500: {
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

        // Check if CPV code exists
        const existingCpvCodigo = await prisma.cpvCodigo.findUnique({
          where: { id },
        });

        if (!existingCpvCodigo) {
          return reply.status(404).send({ error: "CPV code not found" });
        }

        // Check if there are child codes that depend on this code
        const childCodes = await prisma.cpvCodigo.findFirst({
          where: { codigoPadre: existingCpvCodigo.codigo },
        });

        if (childCodes) {
          return reply.status(400).send({
            error:
              "Cannot delete CPV code with child codes. Delete child codes first.",
          });
        }

        await prisma.cpvCodigo.delete({
          where: { id },
        });

        return reply.status(200).send({
          message: "CPV code deleted successfully",
        });
      } catch (error: any) {
        fastify.log.error(error);

        if (error.code === "P2003") {
          return reply.status(400).send({
            error: "Cannot delete CPV code due to existing references",
          });
        }

        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );
};

export default routes;
