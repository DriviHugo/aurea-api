import {
  Prisma,
  type PrismaClient,
  type CaseStatus,
  type ContractType,
  type ProcedureType,
  type RiskLevel,
} from "@prisma/client";

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateCaseInput {
  code: string;
  unit: string;
  department: string;
  creatorId: string;
  status?: string;
  contractType: string;
  subject: string;
  description?: string;
  estimatedContractValue?: number;
  baseTenderBudget?: number;
  vat?: number;
  extensionsAmount?: number;
  modificationsAmount?: number;
  proposedProcedure?: string;
  selectedProcedure?: string;
  selectedCpv?: string;
  hasLots?: boolean;
  lotsJustification?: string;
  numLots?: number;
  isUrgent?: boolean;
  isEmergency?: boolean;
  urgencyJustification?: string;
  completionPercentage?: number;
  riskLevel?: string;
  lastPendingAction?: string;
  dueDate?: Date;
  metadata?: Prisma.InputJsonValue;
}

export type UpdateCaseInput = Partial<CreateCaseInput>;

/**
 * Convert snake_case enum value to camelCase for Prisma
 */
function snakeToCamelValue(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return value.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Convert camelCase enum value to snake_case for frontend
 */
function camelToSnakeValue(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Normalize case for API response (convert enum values to snake_case)
 */
function normalizeCase(caseData: unknown): unknown {
  if (
    caseData === null ||
    caseData === undefined ||
    typeof caseData !== "object"
  ) {
    return caseData;
  }
  const data = caseData as Record<string, unknown>;
  return {
    ...data,
    status: camelToSnakeValue(data["status"] as string),
    contractType: camelToSnakeValue(data["contractType"] as string),
    proposedProcedure: camelToSnakeValue(data["proposedProcedure"] as string),
    selectedProcedure: camelToSnakeValue(data["selectedProcedure"] as string),
    riskLevel: data["riskLevel"],
  };
}

export class CaseService {
  constructor(private prisma: PrismaClient) {}

  async findAll(params: PaginationParams): Promise<PaginatedResult<unknown>> {
    const { page, limit } = params;
    const skip = (page - 1) * limit;

    const [cases, total] = await Promise.all([
      this.prisma.case.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.case.count(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: cases.map(normalizeCase),
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findById(id: string): Promise<unknown | null> {
    const caseData = await this.prisma.case.findUnique({
      where: { id },
    });

    return caseData ? normalizeCase(caseData) : null;
  }

  async findByCode(code: string): Promise<unknown | null> {
    const caseData = await this.prisma.case.findFirst({
      where: { code },
    });

    return caseData ? normalizeCase(caseData) : null;
  }

  async create(input: CreateCaseInput): Promise<unknown> {
    const statusValue = snakeToCamelValue(input.status) ?? "draft";
    const contractTypeValue = snakeToCamelValue(input.contractType);
    const proposedProcedureValue = snakeToCamelValue(input.proposedProcedure);
    const selectedProcedureValue = snakeToCamelValue(input.selectedProcedure);
    const riskLevelValue =
      (input.riskLevel as RiskLevel | undefined) ?? "green";

    const data: Prisma.CaseCreateInput = {
      code: input.code,
      unit: input.unit,
      department: input.department,
      creator: { connect: { id: input.creatorId } },
      status: statusValue as CaseStatus,
      contractType: contractTypeValue as ContractType,
      subject: input.subject,
      hasLots: input.hasLots ?? false,
      isUrgent: input.isUrgent ?? false,
      isEmergency: input.isEmergency ?? false,
      completionPercentage: input.completionPercentage ?? 0,
      riskLevel: riskLevelValue,
    };

    // Add optional fields only if defined
    if (input.description !== undefined) data.description = input.description;
    if (input.estimatedContractValue !== undefined)
      data.estimatedContractValue = input.estimatedContractValue;
    if (input.baseTenderBudget !== undefined)
      data.baseTenderBudget = input.baseTenderBudget;
    if (input.vat !== undefined) data.vat = input.vat;
    if (input.extensionsAmount !== undefined)
      data.extensionsAmount = input.extensionsAmount;
    if (input.modificationsAmount !== undefined)
      data.modificationsAmount = input.modificationsAmount;
    if (proposedProcedureValue !== null) {
      data.proposedProcedure = proposedProcedureValue as ProcedureType;
    }
    if (selectedProcedureValue !== null) {
      data.selectedProcedure = selectedProcedureValue as ProcedureType;
    }
    if (input.selectedCpv !== undefined) data.selectedCpv = input.selectedCpv;
    if (input.lotsJustification !== undefined)
      data.lotsJustification = input.lotsJustification;
    if (input.numLots !== undefined) data.numLots = input.numLots;
    if (input.urgencyJustification !== undefined)
      data.urgencyJustification = input.urgencyJustification;
    if (input.lastPendingAction !== undefined)
      data.lastPendingAction = input.lastPendingAction;
    if (input.dueDate !== undefined) data.dueDate = input.dueDate;
    if (input.metadata !== undefined) {
      data.metadata = input.metadata ?? Prisma.JsonNull;
    }

    const caseData = await this.prisma.case.create({ data });

    return normalizeCase(caseData);
  }

  async update(id: string, input: UpdateCaseInput): Promise<unknown | null> {
    const existingCase = await this.prisma.case.findUnique({
      where: { id },
    });

    if (!existingCase) {
      return null;
    }

    const updateData: Prisma.CaseUpdateInput = {};

    if (input.code !== undefined) updateData.code = input.code;
    if (input.unit !== undefined) updateData.unit = input.unit;
    if (input.department !== undefined)
      updateData.department = input.department;
    if (input.status !== undefined) {
      const statusValue = snakeToCamelValue(input.status);
      updateData.status = statusValue as CaseStatus;
    }
    if (input.contractType !== undefined) {
      const contractTypeValue = snakeToCamelValue(input.contractType);
      updateData.contractType = contractTypeValue as ContractType;
    }
    if (input.subject !== undefined) updateData.subject = input.subject;
    if (input.description !== undefined)
      updateData.description = input.description;
    if (input.estimatedContractValue !== undefined)
      updateData.estimatedContractValue = input.estimatedContractValue;
    if (input.baseTenderBudget !== undefined)
      updateData.baseTenderBudget = input.baseTenderBudget;
    if (input.vat !== undefined) updateData.vat = input.vat;
    if (input.extensionsAmount !== undefined)
      updateData.extensionsAmount = input.extensionsAmount;
    if (input.modificationsAmount !== undefined)
      updateData.modificationsAmount = input.modificationsAmount;
    if (input.proposedProcedure !== undefined) {
      const procedureValue = snakeToCamelValue(input.proposedProcedure);
      updateData.proposedProcedure = procedureValue as ProcedureType | null;
    }
    if (input.selectedProcedure !== undefined) {
      const procedureValue = snakeToCamelValue(input.selectedProcedure);
      updateData.selectedProcedure = procedureValue as ProcedureType | null;
    }
    if (input.selectedCpv !== undefined)
      updateData.selectedCpv = input.selectedCpv;
    if (input.hasLots !== undefined) updateData.hasLots = input.hasLots;
    if (input.lotsJustification !== undefined)
      updateData.lotsJustification = input.lotsJustification;
    if (input.numLots !== undefined) updateData.numLots = input.numLots;
    if (input.isUrgent !== undefined) updateData.isUrgent = input.isUrgent;
    if (input.isEmergency !== undefined)
      updateData.isEmergency = input.isEmergency;
    if (input.urgencyJustification !== undefined)
      updateData.urgencyJustification = input.urgencyJustification;
    if (input.completionPercentage !== undefined)
      updateData.completionPercentage = input.completionPercentage;
    if (input.riskLevel !== undefined)
      updateData.riskLevel = input.riskLevel as RiskLevel;
    if (input.lastPendingAction !== undefined)
      updateData.lastPendingAction = input.lastPendingAction;
    if (input.dueDate !== undefined) updateData.dueDate = input.dueDate;
    if (input.metadata !== undefined) updateData.metadata = input.metadata;

    const updatedCase = await this.prisma.case.update({
      where: { id },
      data: updateData,
    });

    return normalizeCase(updatedCase);
  }

  async delete(id: string): Promise<boolean> {
    const existingCase = await this.prisma.case.findUnique({
      where: { id },
    });

    if (!existingCase) {
      return false;
    }

    await this.prisma.case.delete({
      where: { id },
    });

    return true;
  }

  async findByCreator(
    creatorId: string,
    params: PaginationParams,
  ): Promise<PaginatedResult<unknown>> {
    const { page, limit } = params;
    const skip = (page - 1) * limit;

    const [cases, total] = await Promise.all([
      this.prisma.case.findMany({
        where: { creatorId },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.case.count({ where: { creatorId } }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: cases.map(normalizeCase),
      total,
      page,
      limit,
      totalPages,
    };
  }
}
