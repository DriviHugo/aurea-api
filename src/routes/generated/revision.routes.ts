import type { FastifyPluginAsync } from "fastify";
import type { PrismaClient } from "@prisma/client";

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // GET /revisions - List revisions with pagination
  fastify.get(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Revisions"],
        description: "Get paginated list of revisions",
        querystring: {
          type: "object",
          properties: {
            page: { type: "integer", minimum: 1, default: 1 },
            limit: { type: "integer", minimum: 1, maximum: 100, default: 10 },
            expedienteId: { type: "string", format: "uuid" },
            usuarioId: { type: "string", format: "uuid" },
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
                    documentoId: { type: ["string", "null"] },
                    usuarioId: { type: "string" },
                    rol: { type: "string" },
                    cambioDescripcion: { type: "string" },
                    decision: { type: "string" },
                    motivo: { type: ["string", "null"] },
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
          expedienteId,
          usuarioId,
        } = request.query as any;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (expedienteId) where.expedienteId = expedienteId;
        if (usuarioId) where.usuarioId = usuarioId;

        const [revisions, total] = await Promise.all([
          prisma.revision.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
          }),
          prisma.revision.count({ where }),
        ]);

        const totalPages = Math.ceil(total / limit);

        return reply.status(200).send({
          data: revisions,
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

  // GET /revisions/:id - Get revision by ID
  fastify.get(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Revisions"],
        description: "Get revision by ID",
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
              documentoId: { type: ["string", "null"] },
              usuarioId: { type: "string" },
              rol: { type: "string" },
              cambioDescripcion: { type: "string" },
              decision: { type: "string" },
              motivo: { type: ["string", "null"] },
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

        const revision = await prisma.revision.findUnique({
          where: { id },
        });

        if (!revision) {
          return reply.status(404).send({ error: "Revision not found" });
        }

        return reply.status(200).send(revision);
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // POST /revisions - Create new revision
  fastify.post(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Revisions"],
        description: "Create new revision",
        body: {
          type: "object",
          required: [
            "expedienteId",
            "usuarioId",
            "rol",
            "cambioDescripcion",
            "decision",
          ],
          properties: {
            expedienteId: { type: "string", format: "uuid" },
            documentoId: { type: "string", format: "uuid" },
            usuarioId: { type: "string", format: "uuid" },
            rol: {
              type: "string",
              enum: ["ADMINISTRADOR", "COORDINADOR", "ANALISTA", "CONSULTOR"],
            },
            cambioDescripcion: {
              type: "string",
              minLength: 1,
              maxLength: 1000,
            },
            decision: {
              type: "string",
              enum: ["APROBADO", "RECHAZADO", "PENDIENTE", "REVISION"],
            },
            motivo: { type: "string", maxLength: 500 },
          },
        },
        response: {
          201: {
            type: "object",
            properties: {
              id: { type: "string" },
              expedienteId: { type: "string" },
              documentoId: { type: ["string", "null"] },
              usuarioId: { type: "string" },
              rol: { type: "string" },
              cambioDescripcion: { type: "string" },
              decision: { type: "string" },
              motivo: { type: ["string", "null"] },
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

        // Verify expediente exists
        const expediente = await prisma.expediente.findUnique({
          where: { id: data.expedienteId },
        });

        if (!expediente) {
          return reply.status(400).send({ error: "Expediente not found" });
        }

        // Verify documento exists if provided
        if (data.documentoId) {
          const documento = await prisma.documento.findUnique({
            where: { id: data.documentoId },
          });

          if (!documento) {
            return reply.status(400).send({ error: "Documento not found" });
          }
        }

        // Verify usuario exists
        const usuario = await prisma.profile.findUnique({
          where: { id: data.usuarioId },
        });

        if (!usuario) {
          return reply.status(400).send({ error: "Usuario not found" });
        }

        const revision = await prisma.revision.create({
          data: {
            expedienteId: data.expedienteId,
            documentoId: data.documentoId || null,
            usuarioId: data.usuarioId,
            rol: data.rol,
            cambioDescripcion: data.cambioDescripcion,
            decision: data.decision,
            motivo: data.motivo || null,
          },
        });

        return reply.status(201).send(revision);
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // PUT /revisions/:id - Update revision
  fastify.put(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Revisions"],
        description: "Update revision by ID",
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
            documentoId: { type: "string", format: "uuid" },
            rol: {
              type: "string",
              enum: ["ADMINISTRADOR", "COORDINADOR", "ANALISTA", "CONSULTOR"],
            },
            cambioDescripcion: {
              type: "string",
              minLength: 1,
              maxLength: 1000,
            },
            decision: {
              type: "string",
              enum: ["APROBADO", "RECHAZADO", "PENDIENTE", "REVISION"],
            },
            motivo: { type: "string", maxLength: 500 },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              id: { type: "string" },
              expedienteId: { type: "string" },
              documentoId: { type: ["string", "null"] },
              usuarioId: { type: "string" },
              rol: { type: "string" },
              cambioDescripcion: { type: "string" },
              decision: { type: "string" },
              motivo: { type: ["string", "null"] },
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

        const existingRevision = await prisma.revision.findUnique({
          where: { id },
        });

        if (!existingRevision) {
          return reply.status(404).send({ error: "Revision not found" });
        }

        // Verify documento exists if provided
        if (data.documentoId) {
          const documento = await prisma.documento.findUnique({
            where: { id: data.documentoId },
          });

          if (!documento) {
            return reply.status(400).send({ error: "Documento not found" });
          }
        }

        const updateData: any = {};
        if (data.documentoId !== undefined)
          updateData.documentoId = data.documentoId;
        if (data.rol !== undefined) updateData.rol = data.rol;
        if (data.cambioDescripcion !== undefined)
          updateData.cambioDescripcion = data.cambioDescripcion;
        if (data.decision !== undefined) updateData.decision = data.decision;
        if (data.motivo !== undefined) updateData.motivo = data.motivo;

        const revision = await prisma.revision.update({
          where: { id },
          data: updateData,
        });

        return reply.status(200).send(revision);
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // DELETE /revisions/:id - Delete revision
  fastify.delete(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Revisions"],
        description: "Delete revision by ID",
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

        const existingRevision = await prisma.revision.findUnique({
          where: { id },
        });

        if (!existingRevision) {
          return reply.status(404).send({ error: "Revision not found" });
        }

        await prisma.revision.delete({
          where: { id },
        });

        return reply
          .status(200)
          .send({ message: "Revision deleted successfully" });
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );
};

export default routes;
