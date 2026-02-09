import type { FastifyPluginAsync } from "fastify";
import type { PrismaClient } from "@prisma/client";

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // Schemas
  const profileSchema = {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      email: { type: ["string", "null"], format: "email" },
      nombre: { type: "string", minLength: 1, maxLength: 255 },
      apellidos: { type: ["string", "null"], maxLength: 255 },
      unidad: { type: ["string", "null"], maxLength: 255 },
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
      email: { type: ["string", "null"], format: "email" },
      nombre: { type: "string", minLength: 1, maxLength: 255 },
      apellidos: { type: ["string", "null"], maxLength: 255 },
      unidad: { type: ["string", "null"], maxLength: 255 },
      activo: { type: "boolean", default: true },
      mostrarAyudaWizard: { type: "boolean", default: true },
    },
    additionalProperties: false,
  };

  const updateProfileSchema = {
    type: "object",
    properties: {
      email: { type: ["string", "null"], format: "email" },
      nombre: { type: "string", minLength: 1, maxLength: 255 },
      apellidos: { type: ["string", "null"], maxLength: 255 },
      unidad: { type: ["string", "null"], maxLength: 255 },
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
      search: { type: "string" },
      activo: { type: "boolean" },
    },
  };

  const idParamsSchema = {
    type: "object",
    required: ["id"],
    properties: {
      id: { type: "string", format: "uuid" },
    },
  };

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
        const {
          page = 1,
          limit = 10,
          search,
          activo,
        } = request.query as {
          page?: number;
          limit?: number;
          search?: string;
          activo?: boolean;
        };

        const skip = (page - 1) * limit;

        // Build where clause
        const where: any = {};

        if (activo !== undefined) {
          where.activo = activo;
        }

        if (search) {
          where.OR = [
            { nombre: { contains: search, mode: "insensitive" } },
            { apellidos: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { unidad: { contains: search, mode: "insensitive" } },
          ];
        }

        const [profiles, total] = await Promise.all([
          prisma.profile.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
          }),
          prisma.profile.count({ where }),
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
        params: idParamsSchema,
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
        description: "Create new profile",
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
          email?: string | null;
          nombre: string;
          apellidos?: string | null;
          unidad?: string | null;
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
            id: fastify.generateUUID(),
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
        params: idParamsSchema,
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
          email?: string | null;
          nombre?: string;
          apellidos?: string | null;
          unidad?: string | null;
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

        // Check if email already exists (if being updated)
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
        params: idParamsSchema,
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
