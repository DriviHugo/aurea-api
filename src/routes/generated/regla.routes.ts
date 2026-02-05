import type { FastifyPluginAsync } from "fastify";
import type { PrismaClient } from "@prisma/client";

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // List Reglas with pagination
  fastify.get(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Reglas"],
        description: "Get list of reglas with pagination",
        querystring: {
          type: "object",
          properties: {
            page: { type: "integer", minimum: 1, default: 1 },
            limit: { type: "integer", minimum: 1, maximum: 100, default: 10 },
            search: { type: "string" },
            severidad: {
              type: "string",
              enum: ["CRITICA", "ALTA", "MEDIA", "BAJA"],
            },
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
                    codigo: { type: "string" },
                    nombre: { type: "string" },
                    descripcion: { type: "string" },
                    severidad: { type: "string" },
                    evidenciaId: { type: ["string", "null"] },
                    condicion: { type: "string" },
                    mensaje: { type: "string" },
                    version: { type: "integer" },
                    estado: { type: "string" },
                    aprobadorId: { type: ["string", "null"] },
                    aprobadorRol: { type: ["string", "null"] },
                    fechaAprobacion: { type: ["string", "null"] },
                    createdAt: { type: "string" },
                    updatedAt: { type: "string" },
                    evidencia: {
                      type: ["object", "null"],
                      properties: {
                        id: { type: "string" },
                        nombre: { type: "string" },
                      },
                    },
                    aprobador: {
                      type: ["object", "null"],
                      properties: {
                        id: { type: "string" },
                        nombre: { type: "string" },
                        apellido: { type: "string" },
                      },
                    },
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
          search,
          severidad,
          estado,
        } = request.query as any;
        const skip = (page - 1) * limit;

        const where: any = {};

        if (search) {
          where.OR = [
            { codigo: { contains: search, mode: "insensitive" } },
            { nombre: { contains: search, mode: "insensitive" } },
            { descripcion: { contains: search, mode: "insensitive" } },
          ];
        }

        if (severidad) {
          where.severidad = severidad;
        }

        if (estado) {
          where.estado = estado;
        }

        const [reglas, total] = await Promise.all([
          prisma.regla.findMany({
            where,
            skip,
            take: limit,
            include: {
              evidencia: {
                select: {
                  id: true,
                  nombre: true,
                },
              },
              aprobador: {
                select: {
                  id: true,
                  nombre: true,
                  apellido: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
          }),
          prisma.regla.count({ where }),
        ]);

        const totalPages = Math.ceil(total / limit);

        return reply.status(200).send({
          data: reglas,
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

  // Get Regla by ID
  fastify.get(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Reglas"],
        description: "Get regla by ID",
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
              codigo: { type: "string" },
              nombre: { type: "string" },
              descripcion: { type: "string" },
              severidad: { type: "string" },
              evidenciaId: { type: ["string", "null"] },
              condicion: { type: "string" },
              mensaje: { type: "string" },
              version: { type: "integer" },
              estado: { type: "string" },
              aprobadorId: { type: ["string", "null"] },
              aprobadorRol: { type: ["string", "null"] },
              fechaAprobacion: { type: ["string", "null"] },
              createdAt: { type: "string" },
              updatedAt: { type: "string" },
              evidencia: {
                type: ["object", "null"],
                properties: {
                  id: { type: "string" },
                  nombre: { type: "string" },
                  descripcion: { type: "string" },
                },
              },
              aprobador: {
                type: ["object", "null"],
                properties: {
                  id: { type: "string" },
                  nombre: { type: "string" },
                  apellido: { type: "string" },
                  email: { type: "string" },
                },
              },
              validaciones: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    resultado: { type: "string" },
                    createdAt: { type: "string" },
                  },
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

        const regla = await prisma.regla.findUnique({
          where: { id },
          include: {
            evidencia: {
              select: {
                id: true,
                nombre: true,
                descripcion: true,
              },
            },
            aprobador: {
              select: {
                id: true,
                nombre: true,
                apellido: true,
                email: true,
              },
            },
            validaciones: {
              select: {
                id: true,
                resultado: true,
                createdAt: true,
              },
              orderBy: { createdAt: "desc" },
              take: 10,
            },
          },
        });

        if (!regla) {
          return reply.status(404).send({ error: "Regla not found" });
        }

        return reply.status(200).send(regla);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // Create Regla
  fastify.post(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Reglas"],
        description: "Create new regla",
        body: {
          type: "object",
          required: [
            "codigo",
            "nombre",
            "descripcion",
            "severidad",
            "condicion",
            "mensaje",
          ],
          properties: {
            codigo: { type: "string", minLength: 1, maxLength: 50 },
            nombre: { type: "string", minLength: 1, maxLength: 200 },
            descripcion: { type: "string", minLength: 1 },
            severidad: {
              type: "string",
              enum: ["CRITICA", "ALTA", "MEDIA", "BAJA"],
            },
            evidenciaId: { type: "string", format: "uuid" },
            condicion: { type: "string", minLength: 1 },
            mensaje: { type: "string", minLength: 1 },
            estado: { type: "string", default: "borrador" },
          },
        },
        response: {
          201: {
            type: "object",
            properties: {
              id: { type: "string" },
              codigo: { type: "string" },
              nombre: { type: "string" },
              descripcion: { type: "string" },
              severidad: { type: "string" },
              evidenciaId: { type: ["string", "null"] },
              condicion: { type: "string" },
              mensaje: { type: "string" },
              version: { type: "integer" },
              estado: { type: "string" },
              createdAt: { type: "string" },
              updatedAt: { type: "string" },
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
        const data = request.body as {
          codigo: string;
          nombre: string;
          descripcion: string;
          severidad: "CRITICA" | "ALTA" | "MEDIA" | "BAJA";
          evidenciaId?: string;
          condicion: string;
          mensaje: string;
          estado?: string;
        };

        // Validate evidencia exists if provided
        if (data.evidenciaId) {
          const evidencia = await prisma.evidencia.findUnique({
            where: { id: data.evidenciaId },
          });
          if (!evidencia) {
            return reply.status(400).send({ error: "Evidencia not found" });
          }
        }

        // Check if codigo is unique
        const existingRegla = await prisma.regla.findUnique({
          where: { codigo: data.codigo },
        });
        if (existingRegla) {
          return reply.status(400).send({ error: "Codigo already exists" });
        }

        const regla = await prisma.regla.create({
          data: {
            codigo: data.codigo,
            nombre: data.nombre,
            descripcion: data.descripcion,
            severidad: data.severidad,
            evidenciaId: data.evidenciaId || null,
            condicion: data.condicion,
            mensaje: data.mensaje,
            estado: data.estado || "borrador",
          },
        });

        return reply.status(201).send(regla);
      } catch (error) {
        fastify.log.error(error);
        if (error.code === "P2002") {
          return reply.status(400).send({ error: "Codigo already exists" });
        }
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // Update Regla
  fastify.put(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Reglas"],
        description: "Update regla by ID",
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
            codigo: { type: "string", minLength: 1, maxLength: 50 },
            nombre: { type: "string", minLength: 1, maxLength: 200 },
            descripcion: { type: "string", minLength: 1 },
            severidad: {
              type: "string",
              enum: ["CRITICA", "ALTA", "MEDIA", "BAJA"],
            },
            evidenciaId: { type: ["string", "null"], format: "uuid" },
            condicion: { type: "string", minLength: 1 },
            mensaje: { type: "string", minLength: 1 },
            estado: { type: "string" },
            aprobadorId: { type: ["string", "null"], format: "uuid" },
            aprobadorRol: {
              type: ["string", "null"],
              enum: ["ADMIN", "JURIDICO", "SUPERVISOR", "USUARIO"],
            },
            fechaAprobacion: { type: ["string", "null"], format: "date-time" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              id: { type: "string" },
              codigo: { type: "string" },
              nombre: { type: "string" },
              descripcion: { type: "string" },
              severidad: { type: "string" },
              evidenciaId: { type: ["string", "null"] },
              condicion: { type: "string" },
              mensaje: { type: "string" },
              version: { type: "integer" },
              estado: { type: "string" },
              aprobadorId: { type: ["string", "null"] },
              aprobadorRol: { type: ["string", "null"] },
              fechaAprobacion: { type: ["string", "null"] },
              createdAt: { type: "string" },
              updatedAt: { type: "string" },
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
        const data = request.body as {
          codigo?: string;
          nombre?: string;
          descripcion?: string;
          severidad?: "CRITICA" | "ALTA" | "MEDIA" | "BAJA";
          evidenciaId?: string | null;
          condicion?: string;
          mensaje?: string;
          estado?: string;
          aprobadorId?: string | null;
          aprobadorRol?: "ADMIN" | "JURIDICO" | "SUPERVISOR" | "USUARIO" | null;
          fechaAprobacion?: string | null;
        };

        // Check if regla exists
        const existingRegla = await prisma.regla.findUnique({
          where: { id },
        });
        if (!existingRegla) {
          return reply.status(404).send({ error: "Regla not found" });
        }

        // Validate evidencia exists if provided
        if (data.evidenciaId) {
          const evidencia = await prisma.evidencia.findUnique({
            where: { id: data.evidenciaId },
          });
          if (!evidencia) {
            return reply.status(400).send({ error: "Evidencia not found" });
          }
        }

        // Validate aprobador exists if provided
        if (data.aprobadorId) {
          const aprobador = await prisma.profile.findUnique({
            where: { id: data.aprobadorId },
          });
          if (!aprobador) {
            return reply.status(400).send({ error: "Aprobador not found" });
          }
        }

        // Check if codigo is unique (if being updated)
        if (data.codigo && data.codigo !== existingRegla.codigo) {
          const codeExists = await prisma.regla.findUnique({
            where: { codigo: data.codigo },
          });
          if (codeExists) {
            return reply.status(400).send({ error: "Codigo already exists" });
          }
        }

        const updateData: any = { ...data };

        // Handle fechaAprobacion
        if (data.fechaAprobacion) {
          updateData.fechaAprobacion = new Date(data.fechaAprobacion);
        }

        const regla = await prisma.regla.update({
          where: { id },
          data: updateData,
        });

        return reply.status(200).send(regla);
      } catch (error) {
        fastify.log.error(error);
        if (error.code === "P2002") {
          return reply.status(400).send({ error: "Codigo already exists" });
        }
        if (error.code === "P2025") {
          return reply.status(404).send({ error: "Regla not found" });
        }
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // Delete Regla
  fastify.delete(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Reglas"],
        description: "Delete regla by ID",
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
              id: { type: "string" },
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

        // Check if regla exists
        const existingRegla = await prisma.regla.findUnique({
          where: { id },
          include: {
            validaciones: true,
          },
        });
        if (!existingRegla) {
          return reply.status(404).send({ error: "Regla not found" });
        }

        // Check if regla has validaciones
        if (existingRegla.validaciones.length > 0) {
          return reply.status(400).send({
            error: "Cannot delete regla with existing validaciones",
          });
        }

        await prisma.regla.delete({
          where: { id },
        });

        return reply.status(200).send({
          message: "Regla deleted successfully",
          id,
        });
      } catch (error) {
        fastify.log.error(error);
        if (error.code === "P2025") {
          return reply.status(404).send({ error: "Regla not found" });
        }
        if (error.code === "P2003") {
          return reply.status(400).send({
            error: "Cannot delete regla with existing validaciones",
          });
        }
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // Approve Regla
  fastify.post(
    "/:id/approve",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Reglas"],
        description: "Approve regla",
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", format: "uuid" },
          },
        },
        body: {
          type: "object",
          required: ["aprobadorId", "aprobadorRol"],
          properties: {
            aprobadorId: { type: "string", format: "uuid" },
            aprobadorRol: {
              type: "string",
              enum: ["ADMIN", "JURIDICO", "SUPERVISOR", "USUARIO"],
            },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              id: { type: "string" },
              codigo: { type: "string" },
              nombre: { type: "string" },
              estado: { type: "string" },
              aprobadorId: { type: "string" },
              aprobadorRol: { type: "string" },
              fechaAprobacion: { type: "string" },
              updatedAt: { type: "string" },
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
        const { aprobadorId, aprobadorRol } = request.body as {
          aprobadorId: string;
          aprobadorRol: "ADMIN" | "JURIDICO" | "SUPERVISOR" | "USUARIO";
        };

        // Check if regla exists
        const existingRegla = await prisma.regla.findUnique({
          where: { id },
        });
        if (!existingRegla) {
          return reply.status(404).send({ error: "Regla not found" });
        }

        // Check if regla is in draft state
        if (existingRegla.estado !== "borrador") {
          return reply
            .status(400)
            .send({ error: "Only draft reglas can be approved" });
        }

        // Validate aprobador exists
        const aprobador = await prisma.profile.findUnique({
          where: { id: aprobadorId },
        });
        if (!aprobador) {
          return reply.status(400).send({ error: "Aprobador not found" });
        }

        const regla = await prisma.regla.update({
          where: { id },
          data: {
            estado: "aprobado",
            aprobadorId,
            aprobadorRol,
            fechaAprobacion: new Date(),
          },
        });

        return reply.status(200).send(regla);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // Get Reglas by Evidencia
  fastify.get(
    "/evidencia/:evidenciaId",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Reglas"],
        description: "Get reglas by evidencia ID",
        params: {
          type: "object",
          required: ["evidenciaId"],
          properties: {
            evidenciaId: { type: "string", format: "uuid" },
          },
        },
        querystring: {
          type: "object",
          properties: {
            page: { type: "integer", minimum: 1, default: 1 },
            limit: { type: "integer", minimum: 1, maximum: 100, default: 10 },
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
                    codigo: { type: "string" },
                    nombre: { type: "string" },
                    descripcion: { type: "string" },
                    severidad: { type: "string" },
                    condicion: { type: "string" },
                    mensaje: { type: "string" },
                    version: { type: "integer" },
                    estado: { type: "string" },
                    createdAt: { type: "string" },
                    updatedAt: { type: "string" },
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
        const { evidenciaId } = request.params as { evidenciaId: string };
        const { page = 1, limit = 10, estado } = request.query as any;
        const skip = (page - 1) * limit;

        const where: any = { evidenciaId };
        if (estado) {
          where.estado = estado;
        }

        const [reglas, total] = await Promise.all([
          prisma.regla.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
          }),
          prisma.regla.count({ where }),
        ]);

        const totalPages = Math.ceil(total / limit);

        return reply.status(200).send({
          data: reglas,
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
};

export default routes;
