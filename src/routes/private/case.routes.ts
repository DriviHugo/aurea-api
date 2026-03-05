import type { FastifyPluginAsync } from "fastify";
import type {
  PrismaClient,
  CaseStatus,
  ContractType,
  ProcedureType,
} from "@prisma/client";

/**
 * Convert snake_case enum value to camelCase for Prisma
 */
function snakeToCamelValue(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Convert camelCase enum value to snake_case for frontend
 */
function camelToSnakeValue(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Normalize case for API response (convert enum values to snake_case)
 */
function normalizeCase(caseData: any): any {
  if (!caseData) return caseData;
  return {
    ...caseData,
    status: camelToSnakeValue(caseData.status),
    contractType: camelToSnakeValue(caseData.contractType),
    proposedProcedure: camelToSnakeValue(caseData.proposedProcedure),
    selectedProcedure: camelToSnakeValue(caseData.selectedProcedure),
    riskLevel: caseData.riskLevel,
  };
}

/**
 * Map of valid enum values (both snake_case and camelCase accepted)
 */
const PROCEDURE_VALUES = [
  "open",
  "open_simplified",
  "openSimplified",
  "open_super_simplified",
  "openSuperSimplified",
  "restricted",
  "negotiated_no_publicity",
  "negotiatedNoPublicity",
  "negotiated_with_publicity",
  "negotiatedWithPublicity",
  "competitive_dialogue",
  "competitiveDialogue",
  "innovation_partnership",
  "innovationPartnership",
  "minor",
  "based_contract",
  "basedContract",
];

const CONTRACT_TYPE_VALUES = [
  "works",
  "services",
  "supplies",
  "works_concession",
  "worksConcession",
  "services_concession",
  "servicesConcession",
  "mixed",
];

const STATUS_VALUES = [
  "intake",
  "draft",
  "alternatives",
  "validated",
  "approved",
  "review",
  "incident",
  "in_drafting",
  "inDrafting",
  "with_observations",
  "withObservations",
  "ready_validation",
  "readyValidation",
  "in_intervention",
  "inIntervention",
  "closed",
];

const caseSchema = {
  type: "object",
  properties: {
    code: { type: "string" },
    unit: { type: "string" },
    department: { type: "string" },
    creatorId: { type: "string", format: "uuid" },
    status: {
      type: "string",
      enum: STATUS_VALUES,
    },
    contractType: {
      type: "string",
      enum: CONTRACT_TYPE_VALUES,
    },
    subject: { type: "string" },
    description: { type: "string" },
    estimatedContractValue: { type: "number" },
    baseTenderBudget: { type: "number" },
    vat: { type: "number" },
    extensionsAmount: { type: "number" },
    modificationsAmount: { type: "number" },
    proposedProcedure: {
      type: "string",
      enum: PROCEDURE_VALUES,
    },
    selectedProcedure: {
      type: "string",
      enum: PROCEDURE_VALUES,
    },
    selectedCpv: { type: "string" },
    hasLots: { type: "boolean" },
    lotsJustification: { type: "string" },
    numLots: { type: "integer" },
    isUrgent: { type: "boolean" },
    isEmergency: { type: "boolean" },
    urgencyJustification: { type: "string" },
    completionPercentage: { type: "integer", minimum: 0, maximum: 100 },
    riskLevel: {
      type: "string",
      enum: ["green", "amber", "red"],
    },
    lastPendingAction: { type: "string" },
    dueDate: { type: "string", format: "date-time" },
    metadata: { type: "object" },
  },
  required: [
    "code",
    "unit",
    "department",
    "creatorId",
    "contractType",
    "subject",
  ],
};

const caseResponseSchema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    ...caseSchema.properties,
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
};

const paginationQuerySchema = {
  type: "object",
  properties: {
    page: { type: "integer", minimum: 1, default: 1 },
    limit: { type: "integer", minimum: 1, maximum: 100, default: 10 },
  },
};

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // GET /cases - List with pagination
  fastify.get(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Cases"],
        description: "Get paginated list of cases",
        querystring: paginationQuerySchema,
        response: {
          400: { type: "object", properties: { error: { type: "string" } } },
          404: { type: "object", properties: { error: { type: "string" } } },
          500: { type: "object", properties: { error: { type: "string" } } },
          200: {
            type: "object",
            properties: {
              data: { type: "array", items: caseResponseSchema },
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
        const { page = 1, limit = 10 } = request.query as {
          page?: number;
          limit?: number;
        };
        const skip = (page - 1) * limit;

        const [cases, total] = await Promise.all([
          prisma.case.findMany({
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
          }),
          prisma.case.count(),
        ]);

        const totalPages = Math.ceil(total / limit);

        return reply.status(200).send({
          data: cases.map(normalizeCase),
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

  // GET /cases/:id - Get by ID
  fastify.get(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Cases"],
        description: "Get case by ID",
        params: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
          },
          required: ["id"],
        },
        response: {
          400: { type: "object", properties: { error: { type: "string" } } },
          500: { type: "object", properties: { error: { type: "string" } } },
          200: caseResponseSchema,
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

        const caseData = await prisma.case.findUnique({
          where: { id },
        });

        if (!caseData) {
          return reply.status(404).send({ error: "Case not found" });
        }

        return reply.status(200).send(normalizeCase(caseData));
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // POST /cases - Create
  fastify.post(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Cases"],
        description: "Create new case",
        body: caseSchema,
        response: {
          404: { type: "object", properties: { error: { type: "string" } } },
          500: { type: "object", properties: { error: { type: "string" } } },
          201: caseResponseSchema,
          400: {
            type: "object",
            properties: {
              error: { type: "string" },
              message: { type: "string" },
              details: { type: "object" },
            },
          },
        },
      },
      attachValidation: true,
    },
    async (request, reply) => {
      // Check for validation errors
      if (request.validationError) {
        fastify.log.error(
          {
            validationError: request.validationError,
            body: request.body,
          },
          "Validation error on case creation",
        );
        return reply.status(400).send({
          error: "Validation error",
          message: request.validationError.message,
          details: request.validationError.validation,
        });
      }

      try {
        fastify.log.info({ body: request.body }, "Creating case");
        const data = request.body as any;

        // Convert snake_case enum values to camelCase for Prisma
        const caseData = await prisma.case.create({
          data: {
            code: data.code,
            unit: data.unit,
            department: data.department,
            creatorId: data.creatorId,
            status: (snakeToCamelValue(data.status) || "draft") as CaseStatus,
            contractType: snakeToCamelValue(data.contractType) as ContractType,
            subject: data.subject,
            description: data.description,
            estimatedContractValue: data.estimatedContractValue
              ? parseFloat(data.estimatedContractValue)
              : null,
            baseTenderBudget: data.baseTenderBudget
              ? parseFloat(data.baseTenderBudget)
              : null,
            vat: data.vat ? parseFloat(data.vat) : null,
            extensionsAmount: data.extensionsAmount
              ? parseFloat(data.extensionsAmount)
              : null,
            modificationsAmount: data.modificationsAmount
              ? parseFloat(data.modificationsAmount)
              : null,
            proposedProcedure: snakeToCamelValue(
              data.proposedProcedure,
            ) as ProcedureType | null,
            selectedProcedure: snakeToCamelValue(
              data.selectedProcedure,
            ) as ProcedureType | null,
            selectedCpv: data.selectedCpv,
            hasLots: data.hasLots || false,
            lotsJustification: data.lotsJustification,
            numLots: data.numLots,
            isUrgent: data.isUrgent || false,
            isEmergency: data.isEmergency || false,
            urgencyJustification: data.urgencyJustification,
            completionPercentage: data.completionPercentage || 0,
            riskLevel: data.riskLevel || "green",
            lastPendingAction: data.lastPendingAction,
            dueDate: data.dueDate ? new Date(data.dueDate) : null,
            metadata: data.metadata || {},
          },
        });

        return reply.status(201).send(normalizeCase(caseData));
      } catch (error: any) {
        fastify.log.error(
          {
            error: error.message,
            code: error.code,
            body: request.body,
            stack: error.stack,
            details: error,
          },
          "Error creating case (detailed)",
        );
        if (error.code === "P2002") {
          return reply
            .status(400)
            .send({ error: "Case with this code already exists" });
        }
        // If error is a validation error, return details
        if (error.validation) {
          return reply
            .status(400)
            .send({ error: "Validation error", details: error.validation });
        }
        return reply
          .status(500)
          .send({ error: error.message || "Internal server error" });
      }
    },
  );

  // PUT /cases/:id - Update
  fastify.put(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Cases"],
        description: "Update case by ID",
        params: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
          },
          required: ["id"],
        },
        body: {
          type: "object",
          properties: caseSchema.properties,
          additionalProperties: true,
        },
        response: {
          500: { type: "object", properties: { error: { type: "string" } } },
          200: caseResponseSchema,
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

        fastify.log.info({ body: data }, "Updating case");

        const existingCase = await prisma.case.findUnique({
          where: { id },
        });

        if (!existingCase) {
          return reply.status(404).send({ error: "Case not found" });
        }

        // Build update data excluding non-updatable fields
        const updateData: Record<string, unknown> = {};

        const allowedFields = [
          "code",
          "unit",
          "department",
          "subject",
          "description",
          "selectedCpv",
          "hasLots",
          "lotsJustification",
          "numLots",
          "isUrgent",
          "isEmergency",
          "urgencyJustification",
          "completionPercentage",
          "lastPendingAction",
          "metadata",
        ];

        for (const field of allowedFields) {
          if (data[field] !== undefined) {
            updateData[field] = data[field];
          }
        }

        // Handle enum fields with conversion
        if (data.status !== undefined) {
          updateData["status"] = snakeToCamelValue(data.status);
        }
        if (data.contractType !== undefined) {
          updateData["contractType"] = snakeToCamelValue(data.contractType);
        }
        if (data.proposedProcedure !== undefined) {
          updateData["proposedProcedure"] = snakeToCamelValue(
            data.proposedProcedure,
          );
        }
        if (data.selectedProcedure !== undefined) {
          updateData["selectedProcedure"] = snakeToCamelValue(
            data.selectedProcedure,
          );
        }
        if (data.riskLevel !== undefined) {
          updateData["riskLevel"] = data.riskLevel;
        }

        // Handle numeric fields
        if (data.estimatedContractValue !== undefined) {
          updateData["estimatedContractValue"] = parseFloat(
            data.estimatedContractValue,
          );
        }
        if (data.baseTenderBudget !== undefined) {
          updateData["baseTenderBudget"] = parseFloat(data.baseTenderBudget);
        }
        if (data.vat !== undefined) {
          updateData["vat"] = parseFloat(data.vat);
        }
        if (data.extensionsAmount !== undefined) {
          updateData["extensionsAmount"] = parseFloat(data.extensionsAmount);
        }
        if (data.modificationsAmount !== undefined) {
          updateData["modificationsAmount"] = parseFloat(
            data.modificationsAmount,
          );
        }

        // Handle date field
        if (data.dueDate !== undefined) {
          updateData["dueDate"] = new Date(data.dueDate);
        }

        fastify.log.info({ updateData }, "Prepared update data");

        const caseData = await prisma.case.update({
          where: { id },
          data: updateData,
        });

        return reply.status(200).send(normalizeCase(caseData));
      } catch (error: any) {
        fastify.log.error(
          { error: error.message, code: error.code },
          "Error updating case",
        );
        if (error.code === "P2002") {
          return reply
            .status(400)
            .send({ error: "Case with this code already exists" });
        }
        return reply
          .status(500)
          .send({ error: error.message || "Internal server error" });
      }
    },
  );

  // DELETE /cases/:id - Delete
  fastify.delete(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Cases"],
        description: "Delete case by ID",
        params: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
          },
          required: ["id"],
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

        const existingCase = await prisma.case.findUnique({
          where: { id },
        });

        if (!existingCase) {
          return reply.status(404).send({ error: "Case not found" });
        }

        await prisma.case.delete({
          where: { id },
        });

        return reply.status(200).send({ message: "Case deleted successfully" });
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );
};

export default routes;
