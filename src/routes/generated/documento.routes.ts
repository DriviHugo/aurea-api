import type { FastifyPluginAsync } from "fastify";
import type { PrismaClient } from "@prisma/client";

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // List documentos with pagination
  fastify.get(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Documentos"],
        description: "Get list of documentos with pagination",
        querystring: {
          type: "object",
          properties: {
            page: { type: "integer", minimum: 1, default: 1 },
            limit: { type: "integer", minimum: 1, maximum: 100, default: 10 },
            expedienteId: { type: "string", format: "uuid" },
            tipo: { type: "string" },
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
                    expedienteId: { type: "string" },
                    tipo: { type: "string" },
                    nombre: { type: "string" },
                    version: { type: "integer" },
                    hash: { type: "string", nullable: true },
                    estado: { type: "string" },
                    contenido: { type: "object", nullable: true },
                    urlDocx: { type: "string", nullable: true },
                    urlPdf: { type: "string", nullable: true },
                    creadorId: { type: "string" },
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
          expedienteId,
          tipo,
          estado,
        } = request.query as any;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (expedienteId) where.expedienteId = expedienteId;
        if (tipo) where.tipo = tipo;
        if (estado) where.estado = estado;

        const [documentos, total] = await Promise.all([
          prisma.documento.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
            include: {
              expediente: {
                select: { id: true, numero: true, titulo: true },
              },
              creador: {
                select: { id: true, nombre: true, apellido: true },
              },
            },
          }),
          prisma.documento.count({ where }),
        ]);

        const totalPages = Math.ceil(total / limit);

        return reply.status(200).send({
          data: documentos,
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

  // Get documento by ID
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
              expedienteId: { type: "string" },
              tipo: { type: "string" },
              nombre: { type: "string" },
              version: { type: "integer" },
              hash: { type: "string", nullable: true },
              estado: { type: "string" },
              contenido: { type: "object", nullable: true },
              urlDocx: { type: "string", nullable: true },
              urlPdf: { type: "string", nullable: true },
              creadorId: { type: "string" },
              createdAt: { type: "string", format: "date-time" },
              updatedAt: { type: "string", format: "date-time" },
              expediente: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  numero: { type: "string" },
                  titulo: { type: "string" },
                },
              },
              creador: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  nombre: { type: "string" },
                  apellido: { type: "string" },
                },
              },
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

        const documento = await prisma.documento.findUnique({
          where: { id },
          include: {
            expediente: {
              select: { id: true, numero: true, titulo: true },
            },
            creador: {
              select: { id: true, nombre: true, apellido: true },
            },
            secciones: {
              orderBy: { orden: "asc" },
            },
            versiones: {
              orderBy: { version: "desc" },
              take: 5,
            },
          },
        });

        if (!documento) {
          return reply.status(404).send({ error: "Documento not found" });
        }

        return reply.status(200).send(documento);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // Create new documento
  fastify.post(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Documentos"],
        description: "Create new documento",
        body: {
          type: "object",
          required: ["expedienteId", "tipo", "nombre", "creadorId"],
          properties: {
            expedienteId: { type: "string", format: "uuid" },
            tipo: { type: "string" },
            nombre: { type: "string", minLength: 1, maxLength: 255 },
            hash: { type: "string", nullable: true },
            estado: { type: "string", default: "pendiente" },
            contenido: { type: "object", nullable: true },
            urlDocx: { type: "string", nullable: true },
            urlPdf: { type: "string", nullable: true },
            creadorId: { type: "string", format: "uuid" },
          },
        },
        response: {
          201: {
            type: "object",
            properties: {
              id: { type: "string" },
              expedienteId: { type: "string" },
              tipo: { type: "string" },
              nombre: { type: "string" },
              version: { type: "integer" },
              hash: { type: "string", nullable: true },
              estado: { type: "string" },
              contenido: { type: "object", nullable: true },
              urlDocx: { type: "string", nullable: true },
              urlPdf: { type: "string", nullable: true },
              creadorId: { type: "string" },
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

        // Verify expediente exists
        const expediente = await prisma.expediente.findUnique({
          where: { id: data.expedienteId },
        });

        if (!expediente) {
          return reply.status(400).send({ error: "Expediente not found" });
        }

        // Verify creador exists
        const creador = await prisma.profile.findUnique({
          where: { id: data.creadorId },
        });

        if (!creador) {
          return reply.status(400).send({ error: "Creador not found" });
        }

        const documento = await prisma.documento.create({
          data: {
            expedienteId: data.expedienteId,
            tipo: data.tipo,
            nombre: data.nombre,
            hash: data.hash,
            estado: data.estado || "pendiente",
            contenido: data.contenido,
            urlDocx: data.urlDocx,
            urlPdf: data.urlPdf,
            creadorId: data.creadorId,
          },
        });

        return reply.status(201).send(documento);
      } catch (error) {
        fastify.log.error(error);
        if (error.code === "P2002") {
          return reply.status(400).send({ error: "Duplicate entry" });
        }
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // Update documento
  fastify.put(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Documentos"],
        description: "Update documento by ID",
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
            tipo: { type: "string" },
            nombre: { type: "string", minLength: 1, maxLength: 255 },
            hash: { type: "string", nullable: true },
            estado: { type: "string" },
            contenido: { type: "object", nullable: true },
            urlDocx: { type: "string", nullable: true },
            urlPdf: { type: "string", nullable: true },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              id: { type: "string" },
              expedienteId: { type: "string" },
              tipo: { type: "string" },
              nombre: { type: "string" },
              version: { type: "integer" },
              hash: { type: "string", nullable: true },
              estado: { type: "string" },
              contenido: { type: "object", nullable: true },
              urlDocx: { type: "string", nullable: true },
              urlPdf: { type: "string", nullable: true },
              creadorId: { type: "string" },
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

        // Check if documento exists
        const existingDocumento = await prisma.documento.findUnique({
          where: { id },
        });

        if (!existingDocumento) {
          return reply.status(404).send({ error: "Documento not found" });
        }

        const updateData: any = {};
        if (data.tipo !== undefined) updateData.tipo = data.tipo;
        if (data.nombre !== undefined) updateData.nombre = data.nombre;
        if (data.hash !== undefined) updateData.hash = data.hash;
        if (data.estado !== undefined) updateData.estado = data.estado;
        if (data.contenido !== undefined) updateData.contenido = data.contenido;
        if (data.urlDocx !== undefined) updateData.urlDocx = data.urlDocx;
        if (data.urlPdf !== undefined) updateData.urlPdf = data.urlPdf;

        const documento = await prisma.documento.update({
          where: { id },
          data: updateData,
        });

        return reply.status(200).send(documento);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // Delete documento
  fastify.delete(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Documentos"],
        description: "Delete documento by ID",
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

        // Check if documento exists
        const existingDocumento = await prisma.documento.findUnique({
          where: { id },
        });

        if (!existingDocumento) {
          return reply.status(404).send({ error: "Documento not found" });
        }

        await prisma.documento.delete({
          where: { id },
        });

        return reply
          .status(200)
          .send({ message: "Documento deleted successfully" });
      } catch (error) {
        fastify.log.error(error);
        if (error.code === "P2003") {
          return reply
            .status(400)
            .send({ error: "Cannot delete documento with related records" });
        }
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );
};

export default routes;
