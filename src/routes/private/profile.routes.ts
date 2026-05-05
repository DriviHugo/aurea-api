import type { FastifyPluginAsync } from "fastify";
import type { PrismaClient } from "@prisma/client";

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // GET /profiles - List profiles with pagination
  fastify.get(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Profile"],
        description: "Get list of profiles with pagination",
        querystring: {
          type: "object",
          properties: {
            page: { type: "integer", minimum: 1, default: 1 },
            limit: { type: "integer", minimum: 1, maximum: 100, default: 10 },
            active: { type: "boolean" },
          },
        },
        response: {
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
                    email: { type: "string", nullable: true },
                    name: { type: "string" },
                    lastName: { type: "string", nullable: true },
                    unit: { type: "string", nullable: true },
                    active: { type: "boolean" },
                    showWizardHelp: { type: "boolean" },
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
        const { page = 1, limit = 10, active } = request.query as any;
        const skip = (page - 1) * limit;

        const where = active !== undefined ? { active } : {};

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
        tags: ["Profile"],
        description: "Get profile by ID",
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string" },
          },
        },
        response: {
          400: { type: "object", properties: { error: { type: "string" } } },
          500: { type: "object", properties: { error: { type: "string" } } },
          200: {
            type: "object",
            properties: {
              id: { type: "string" },
              email: { type: "string", nullable: true },
              name: { type: "string" },
              lastName: { type: "string", nullable: true },
              unit: { type: "string", nullable: true },
              active: { type: "boolean" },
              showWizardHelp: { type: "boolean" },
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

        const profile = await prisma.profile.findUnique({
          where: { id },
        });

        if (!profile) {
          return reply.status(404).send({ error: "Profile not found" });
        }

        return reply.status(200).send(profile);
      } catch (error) {
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
        tags: ["Profile"],
        description: "Create new profile",
        body: {
          type: "object",
          required: ["id", "name"],
          properties: {
            id: { type: "string" },
            email: { type: "string", nullable: true },
            name: { type: "string", minLength: 1 },
            lastName: { type: "string", nullable: true },
            unit: { type: "string", nullable: true },
            active: { type: "boolean", default: true },
            showWizardHelp: { type: "boolean", default: true },
          },
        },
        response: {
          404: { type: "object", properties: { error: { type: "string" } } },
          500: { type: "object", properties: { error: { type: "string" } } },
          201: {
            type: "object",
            properties: {
              id: { type: "string" },
              email: { type: "string", nullable: true },
              name: { type: "string" },
              lastName: { type: "string", nullable: true },
              unit: { type: "string", nullable: true },
              active: { type: "boolean" },
              showWizardHelp: { type: "boolean" },
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
        const profileData = request.body as any;

        const profile = await prisma.profile.create({
          data: profileData,
        });

        return reply.status(201).send(profile);
      } catch (error: any) {
        if (error.code === "P2002") {
          return reply
            .status(400)
            .send({ error: "Profile with this ID already exists" });
        }
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
        tags: ["Profile"],
        description: "Update profile by ID",
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string" },
          },
        },
        body: {
          type: "object",
          properties: {
            email: { type: "string", nullable: true },
            name: { type: "string", minLength: 1 },
            lastName: { type: "string", nullable: true },
            unit: { type: "string", nullable: true },
            active: { type: "boolean" },
            showWizardHelp: { type: "boolean" },
          },
        },
        response: {
          400: { type: "object", properties: { error: { type: "string" } } },
          500: { type: "object", properties: { error: { type: "string" } } },
          200: {
            type: "object",
            properties: {
              id: { type: "string" },
              email: { type: "string", nullable: true },
              name: { type: "string" },
              lastName: { type: "string", nullable: true },
              unit: { type: "string", nullable: true },
              active: { type: "boolean" },
              showWizardHelp: { type: "boolean" },
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
        const updateData = request.body as any;

        const existingProfile = await prisma.profile.findUnique({
          where: { id },
        });

        if (!existingProfile) {
          return reply.status(404).send({ error: "Profile not found" });
        }

        if (updateData.active === false && existingProfile.active) {
          const isAdminRole =
            (await prisma.userRoleAssignment.findFirst({
              where: { userId: id, role: "admin" },
              select: { id: true },
            })) !== null;

          if (isAdminRole) {
            const adminAssignments = await prisma.userRoleAssignment.findMany({
              where: { role: "admin", userId: { not: id } },
              select: { userId: true },
            });

            const remainingAdmins = adminAssignments.length
              ? await prisma.profile.count({
                  where: {
                    id: {
                      in: adminAssignments.map(
                        (assignment) => assignment.userId,
                      ),
                    },
                    active: true,
                  },
                })
              : 0;

            if (remainingAdmins === 0) {
              return reply.status(400).send({
                error: "Debe existir al menos un administrador activo",
              });
            }
          }
        }

        const profile = await prisma.profile.update({
          where: { id },
          data: updateData,
        });

        return reply.status(200).send(profile);
      } catch (error) {
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
        tags: ["Profile"],
        description: "Delete profile by ID",
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string" },
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

        const existingProfile = await prisma.profile.findUnique({
          where: { id },
        });

        if (!existingProfile) {
          return reply.status(404).send({ error: "Profile not found" });
        }

        if (existingProfile.active) {
          const isAdminRole =
            (await prisma.userRoleAssignment.findFirst({
              where: { userId: id, role: "admin" },
              select: { id: true },
            })) !== null;

          if (isAdminRole) {
            const adminAssignments = await prisma.userRoleAssignment.findMany({
              where: { role: "admin", userId: { not: id } },
              select: { userId: true },
            });

            const remainingAdmins = adminAssignments.length
              ? await prisma.profile.count({
                  where: {
                    id: {
                      in: adminAssignments.map(
                        (assignment) => assignment.userId,
                      ),
                    },
                    active: true,
                  },
                })
              : 0;

            if (remainingAdmins === 0) {
              return reply.status(400).send({
                error: "Debe existir al menos un administrador activo",
              });
            }
          }
        }

        await prisma.profile.update({
          where: { id },
          data: { active: false },
        });

        return reply.status(200).send({ message: "Profile deactivated" });
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );
};

export default routes;
