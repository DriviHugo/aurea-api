import type { FastifyPluginAsync } from "fastify";
import type { PrismaClient } from "@prisma/client";

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // GET /documento-secciones - List with pagination
  fastify.get(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["DocumentoSeccion"],
        description: "Get paginated list of documento secciones",
        querystring: {
          type: "object",
          properties: {
            page: { type: "integer", minimum: 1, default: 1 },
            limit: { type: "integer", minimum: 1, maximum: 100, default: 10 },
            documentoId: { type: "string", format: "uuid" },
            estado: { type: "string" },
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
                    documentoId: { type: "string" },
                    orden: { type: "integer" },
                    titulo: { type: "string" },
                    descripcion: { type: ["string", "null"] },
                    contenido: { type: ["string", "null"] },
                    estado: { type: "string" },
                    tokensUsados: { type: ["integer", "null"] },
                    tiempoGeneracionMs: { type: ["integer", "null"] },
                    articulosLcsp: { type: "array", items: { type: "string" } },
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
          documentoId,
          estado,
        } = request.query as any;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (documentoId) where.documentoId = documentoId;
        if (estado) where.estado = estado;

        const [data, total] = await Promise.all([
          prisma.documentSection.findMany({
            where,
            skip,
            take: limit,
            orderBy: [{ documentoId: "asc" }, { orden: "asc" }],
          }),
          prisma.documentSection.count({ where }),
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

  // GET /documento-secciones/:id - Get by ID
  fastify.get(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["DocumentoSeccion"],
        description: "Get documento seccion by ID",
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
              documentoId: { type: "string" },
              orden: { type: "integer" },
              titulo: { type: "string" },
              descripcion: { type: ["string", "null"] },
              contenido: { type: ["string", "null"] },
              estado: { type: "string" },
              tokensUsados: { type: ["integer", "null"] },
              tiempoGeneracionMs: { type: ["integer", "null"] },
              articulosLcsp: { type: "array", items: { type: "string" } },
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

        const documentoSeccion = await prisma.documentSection.findUnique({
          where: { id },
        });

        if (!documentoSeccion) {
          return reply
            .status(404)
            .send({ error: "DocumentoSeccion not found" });
        }

        return reply.status(200).send(documentoSeccion);
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // POST /documento-secciones - Create (handles array for batch insert)
  fastify.post(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["DocumentoSeccion"],
        description: "Create new documento seccion(s)",
        // No body validation - handle arrays in handler
        response: {
          201: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: true,
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
        const rawBody = request.body as any;

        // Handle both array and single object
        const items = Array.isArray(rawBody) ? rawBody : [rawBody];

        fastify.log.info(
          { count: items.length, firstItem: items[0] },
          "POST /documento-seccion - creating secciones",
        );

        const created = [];
        for (const data of items) {
          const documentoSeccion = await prisma.documentSection.create({
            data: {
              documentoId: data.documentoId,
              orden: data.orden,
              titulo: data.titulo,
              descripcion: data.descripcion,
              contenido: data.contenido,
              estado: data.estado || "pendiente",
              tokensUsados: data.tokensUsados,
              tiempoGeneracionMs: data.tiempoGeneracionMs,
              articulosLcsp: data.articulosLcsp || [],
            },
          });
          created.push(documentoSeccion);
        }

        fastify.log.info(
          { count: created.length },
          "DocumentoSecciones created",
        );
        return reply.status(201).send(created);
      } catch (error: any) {
        fastify.log.error({ error }, "POST /documento-seccion - error");
        if (error.code === "P2002") {
          return reply.status(400).send({
            error:
              "DocumentoSeccion with this documento and orden already exists",
          });
        }
        if (error.code === "P2003") {
          return reply
            .status(400)
            .send({ error: "Referenced documento does not exist" });
        }
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // PUT /documento-secciones/:id - Update
  fastify.put(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["DocumentoSeccion"],
        description: "Update documento seccion by ID",
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
            orden: { type: "integer", minimum: 1 },
            titulo: { type: "string", minLength: 1 },
            descripcion: { type: "string" },
            contenido: { type: "string" },
            estado: { type: "string" },
            tokensUsados: { type: "integer", minimum: 0 },
            tiempoGeneracionMs: { type: "integer", minimum: 0 },
            articulosLcsp: { type: "array", items: { type: "string" } },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              id: { type: "string" },
              documentoId: { type: "string" },
              orden: { type: "integer" },
              titulo: { type: "string" },
              descripcion: { type: ["string", "null"] },
              contenido: { type: ["string", "null"] },
              estado: { type: "string" },
              tokensUsados: { type: ["integer", "null"] },
              tiempoGeneracionMs: { type: ["integer", "null"] },
              articulosLcsp: { type: "array", items: { type: "string" } },
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

        const existingDocumentoSeccion =
          await prisma.documentSection.findUnique({
            where: { id },
          });

        if (!existingDocumentoSeccion) {
          return reply
            .status(404)
            .send({ error: "DocumentoSeccion not found" });
        }

        const updateData: any = {};
        if (data.orden !== undefined) updateData.orden = data.orden;
        if (data.titulo !== undefined) updateData.titulo = data.titulo;
        if (data.descripcion !== undefined)
          updateData.descripcion = data.descripcion;
        if (data.contenido !== undefined) updateData.contenido = data.contenido;
        if (data.estado !== undefined) updateData.estado = data.estado;
        if (data.tokensUsados !== undefined)
          updateData.tokensUsados = data.tokensUsados;
        if (data.tiempoGeneracionMs !== undefined)
          updateData.tiempoGeneracionMs = data.tiempoGeneracionMs;
        if (data.articulosLcsp !== undefined)
          updateData.articulosLcsp = data.articulosLcsp;

        const documentoSeccion = await prisma.documentSection.update({
          where: { id },
          data: updateData,
        });

        return reply.status(200).send(documentoSeccion);
      } catch (error: any) {
        if (error.code === "P2002") {
          return reply.status(400).send({
            error:
              "DocumentoSeccion with this documento and orden already exists",
          });
        }
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // DELETE /documento-secciones/:id - Delete
  fastify.delete(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["DocumentoSeccion"],
        description: "Delete documento seccion by ID",
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

        const existingDocumentoSeccion =
          await prisma.documentSection.findUnique({
            where: { id },
          });

        if (!existingDocumentoSeccion) {
          return reply
            .status(404)
            .send({ error: "DocumentoSeccion not found" });
        }

        await prisma.documentSection.delete({
          where: { id },
        });

        return reply
          .status(200)
          .send({ message: "DocumentoSeccion deleted successfully" });
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );
};

export default routes;
