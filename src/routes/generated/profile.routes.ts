import type { FastifyPluginAsync } from "fastify";
import type { PrismaClient } from "@prisma/client";

const profileSchema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    email: { type: "string", format: "email", nullable: true },
    nombre: { type: "string", minLength: 1, maxLength: 255 },
    apellidos: { type: "string", maxLength: 255, nullable: true },
    unidad: { type: "string", maxLength: 255, nullable: true },
    activo: { type: "boolean" },
    mostrarAyudaWizard: { type: "boolean" },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
};

const createProfileSchema = {
  type: "object",
  required: ["nombre"],
  properties: {
    email: { type: "string", format: "email" },
    nombre: { type: "string", minLength: 1, maxLength: 255 },
    apellidos: { type: "string", maxLength: 255 },
    unidad: { type: "string", maxLength: 255 },
    activo: { type: "boolean", default: true },
    mostrarAyudaWizard: { type: "boolean", default: true },
  },
  additionalProperties: false,
};

const updateProfileSchema = {
  type: "object",
  properties: {
    email: { type: "string", format: "email" },
    nombre: { type: "string", minLength: 1, maxLength: 255 },
    apellidos: { type: "string", maxLength: 255 },
    unidad: { type: "string", maxLength: 255 },
    activo: { type: "boolean" },
    mostrarAyudaWizard: { type: "boolean" },
  },
  additionalProperties: false,
};

const paginationSchema = {
  type: "object",
  properties: {
    page: { type: "integer", minimum: 1, default: 1 },
    limit: { type: "integer", minimum: 1, maximum: 100, default: 10 },
  },
};

const idParamSchema = {
  type: "object",
  required: ["id"],
  properties: {
    id: { type: "string", format: "uuid" },
  },
};

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // GET /profiles - List profiles with pagination
  fastify.get(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Profiles"],
        description: "Get paginated list of profiles",
        querystring: paginationSchema,
        response: {
          200: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: profileSchema,
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
        const { page = 1, limit = 10 } = request.query as {
          page?: number;
          limit?: number;
        };
        const skip = (page - 1) * limit;

        const [profiles, total] = await Promise.all([
          prisma.profile.findMany({
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
          }),
          prisma.profile.count(),
        ]);

        const totalPages = Math.ceil(total / limit);

        return reply.status(200).send({
          data: profiles,
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

  // GET /profiles/:id - Get profile by ID
  fastify.get(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Profiles"],
        description: "Get profile by ID",
        params: idParamSchema,
        response: {
          200: profileSchema,
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

        const profile = await prisma.profile.findUnique({
          where: { id },
        });

        if (!profile) {
          return reply.status(404).send({ error: "Profile not found" });
        }

        return reply.status(200).send(profile);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // POST /profiles - Create new profile
  fastify.post(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Profiles"],
        description: "Create a new profile",
        body: createProfileSchema,
        response: {
          201: profileSchema,
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
        const profileData = request.body as {
          email?: string;
          nombre: string;
          apellidos?: string;
          unidad?: string;
          activo?: boolean;
          mostrarAyudaWizard?: boolean;
        };

        // Check if email already exists (if provided)
        if (profileData.email) {
          const existingProfile = await prisma.profile.findFirst({
            where: { email: profileData.email },
          });

          if (existingProfile) {
            return reply.status(400).send({ error: "Email already exists" });
          }
        }

        const profile = await prisma.profile.create({
          data: {
            id: fastify.generateId(),
            ...profileData,
          },
        });

        return reply.status(201).send(profile);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // PUT /profiles/:id - Update profile
  fastify.put(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Profiles"],
        description: "Update profile by ID",
        params: idParamSchema,
        body: updateProfileSchema,
        response: {
          200: profileSchema,
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
        const updateData = request.body as {
          email?: string;
          nombre?: string;
          apellidos?: string;
          unidad?: string;
          activo?: boolean;
          mostrarAyudaWizard?: boolean;
        };

        // Check if profile exists
        const existingProfile = await prisma.profile.findUnique({
          where: { id },
        });

        if (!existingProfile) {
          return reply.status(404).send({ error: "Profile not found" });
        }

        // Check if email already exists (if being updated and different from current)
        if (updateData.email && updateData.email !== existingProfile.email) {
          const emailExists = await prisma.profile.findFirst({
            where: {
              email: updateData.email,
              id: { not: id },
            },
          });

          if (emailExists) {
            return reply.status(400).send({ error: "Email already exists" });
          }
        }

        const profile = await prisma.profile.update({
          where: { id },
          data: updateData,
        });

        return reply.status(200).send(profile);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // DELETE /profiles/:id - Delete profile
  fastify.delete(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Profiles"],
        description: "Delete profile by ID",
        params: idParamSchema,
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

        // Check if profile exists
        const existingProfile = await prisma.profile.findUnique({
          where: { id },
        });

        if (!existingProfile) {
          return reply.status(404).send({ error: "Profile not found" });
        }

        // Check for related records that would prevent deletion
        const [
          expedientesCount,
          documentosCount,
          validacionesCount,
          revisionesCount,
          comentariosCount,
          auditLogsCount,
          reglasCount,
          funcionVersionesCount,
        ] = await Promise.all([
          prisma.expediente.count({ where: { creadorId: id } }),
          prisma.documento.count({ where: { creadorId: id } }),
          prisma.validacion.count({ where: { profileId: id } }),
          prisma.revision.count({ where: { profileId: id } }),
          prisma.comentario.count({ where: { profileId: id } }),
          prisma.auditLog.count({ where: { profileId: id } }),
          prisma.regla.count({ where: { aprobadorId: id } }),
          prisma.aiFunctionVersion.count({ where: { creatorId: id } }),
        ]);

        const totalRelatedRecords =
          expedientesCount +
          documentosCount +
          validacionesCount +
          revisionesCount +
          comentariosCount +
          auditLogsCount +
          reglasCount +
          funcionVersionesCount;

        if (totalRelatedRecords > 0) {
          return reply.status(400).send({
            error:
              "Cannot delete profile with associated records. Consider deactivating instead.",
          });
        }

        await prisma.profile.delete({
          where: { id },
        });

        return reply
          .status(200)
          .send({ message: "Profile deleted successfully" });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );
};

export default routes;
