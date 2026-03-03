import type { FastifyPluginAsync } from "fastify";
import type { PrismaClient, TestCaseStatus } from "@prisma/client";

const testCaseResponseSchema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    description: { type: "string" },
    observations: { type: "string", nullable: true },
    status: { type: "string" },
    promotingUnit: { type: "string", nullable: true },
    contractingBody: { type: "string", nullable: true },
    createdBy: { type: "string", format: "uuid", nullable: true },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
    creator: {
      type: "object",
      nullable: true,
      properties: {
        name: { type: "string" },
        lastName: { type: "string", nullable: true },
      },
    },
  },
};

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // GET /test-case - List with search
  fastify.get(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["TestCases"],
        description: "Get all test cases with optional search",
        querystring: {
          type: "object",
          properties: {
            search: { type: "string" },
            page: { type: "integer", minimum: 1, default: 1 },
            limit: { type: "integer", minimum: 1, maximum: 100, default: 50 },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              data: { type: "array", items: testCaseResponseSchema },
              total: { type: "integer" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const {
          search,
          page = 1,
          limit = 50,
        } = request.query as {
          search?: string;
          page?: number;
          limit?: number;
        };
        const skip = (page - 1) * limit;

        const trimmedSearch = search != null ? search.trim() : "";
        const where =
          trimmedSearch.length > 0
            ? {
                OR: [
                  {
                    description: {
                      contains: trimmedSearch,
                      mode: "insensitive" as const,
                    },
                  },
                  {
                    observations: {
                      contains: trimmedSearch,
                      mode: "insensitive" as const,
                    },
                  },
                ],
              }
            : {};

        const [testCases, total] = await Promise.all([
          prisma.testCase.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
          }),
          prisma.testCase.count({ where }),
        ]);

        // Fetch creator profiles
        const creatorIds = [
          ...new Set(testCases.map((tc) => tc.createdBy).filter(Boolean)),
        ] as string[];

        let profileMap = new Map<
          string,
          { name: string; lastName: string | null }
        >();
        if (creatorIds.length > 0) {
          const profiles = await prisma.profile.findMany({
            where: { id: { in: creatorIds } },
            select: { id: true, name: true, lastName: true },
          });
          profileMap = new Map(
            profiles.map((p) => [p.id, { name: p.name, lastName: p.lastName }]),
          );
        }

        const data = testCases.map((tc) => ({
          ...tc,
          creator:
            tc.createdBy != null
              ? (profileMap.get(tc.createdBy) ?? null)
              : null,
        }));

        return reply.status(200).send({ data, total });
      } catch (err) {
        fastify.log.error(err);
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // GET /test-case/:id
  fastify.get(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["TestCases"],
        description: "Get test case by ID",
        params: {
          type: "object",
          properties: { id: { type: "string", format: "uuid" } },
          required: ["id"],
        },
        response: {
          200: testCaseResponseSchema,
          404: { type: "object", properties: { error: { type: "string" } } },
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const testCase = await prisma.testCase.findUnique({ where: { id } });
        if (testCase == null)
          return reply.status(404).send({ error: "Test case not found" });
        return reply.status(200).send(testCase);
      } catch {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // POST /test-case - Create
  fastify.post(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["TestCases"],
        description: "Create a new test case",
        body: {
          type: "object",
          properties: {
            description: { type: "string", minLength: 1 },
            observations: { type: "string", nullable: true },
            status: {
              type: "string",
              enum: ["pending", "passed", "failed", "blocked", "validate"],
            },
            promotingUnit: { type: "string", nullable: true },
            contractingBody: { type: "string", nullable: true },
            createdBy: { type: "string", format: "uuid", nullable: true },
          },
          required: ["description"],
        },
        response: {
          201: testCaseResponseSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const data = request.body as {
          description: string;
          observations?: string | null;
          status?: string;
          promotingUnit?: string | null;
          contractingBody?: string | null;
          createdBy?: string | null;
        };

        const testCase = await prisma.testCase.create({
          data: {
            description: data.description,
            observations: data.observations ?? null,
            status:
              (data.status as
                | "pending"
                | "passed"
                | "failed"
                | "blocked"
                | "validate"
                | undefined) ?? "pending",
            promotingUnit: data.promotingUnit ?? null,
            contractingBody: data.contractingBody ?? null,
            createdBy: data.createdBy ?? null,
          },
        });

        return reply.status(201).send(testCase);
      } catch (err) {
        fastify.log.error(err);
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // PUT /test-case/:id - Update
  fastify.put(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["TestCases"],
        description: "Update a test case",
        params: {
          type: "object",
          properties: { id: { type: "string", format: "uuid" } },
          required: ["id"],
        },
        body: {
          type: "object",
          properties: {
            description: { type: "string", minLength: 1 },
            observations: { type: "string", nullable: true },
            status: {
              type: "string",
              enum: ["pending", "passed", "failed", "blocked", "validate"],
            },
            promotingUnit: { type: "string", nullable: true },
            contractingBody: { type: "string", nullable: true },
          },
        },
        response: {
          200: testCaseResponseSchema,
          404: { type: "object", properties: { error: { type: "string" } } },
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = request.body as {
          description?: string;
          observations?: string | null;
          status?: TestCaseStatus;
          promotingUnit?: string | null;
          contractingBody?: string | null;
        };

        const existing = await prisma.testCase.findUnique({ where: { id } });
        if (existing == null)
          return reply.status(404).send({ error: "Test case not found" });

        const testCase = await prisma.testCase.update({
          where: { id },
          data: {
            ...(data.description != null && { description: data.description }),
            ...(data.observations !== undefined && {
              observations: data.observations,
            }),
            ...(data.status != null && { status: data.status }),
            ...(data.promotingUnit !== undefined && {
              promotingUnit: data.promotingUnit,
            }),
            ...(data.contractingBody !== undefined && {
              contractingBody: data.contractingBody,
            }),
          },
        });

        return reply.status(200).send(testCase);
      } catch {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // DELETE /test-case/:id
  fastify.delete(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["TestCases"],
        description: "Delete a test case",
        params: {
          type: "object",
          properties: { id: { type: "string", format: "uuid" } },
          required: ["id"],
        },
        response: {
          200: { type: "object", properties: { message: { type: "string" } } },
          404: { type: "object", properties: { error: { type: "string" } } },
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const existing = await prisma.testCase.findUnique({ where: { id } });
        if (existing == null)
          return reply.status(404).send({ error: "Test case not found" });

        await prisma.testCase.delete({ where: { id } });
        return reply.status(200).send({ message: "Test case deleted" });
      } catch {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );
};

export default routes;
