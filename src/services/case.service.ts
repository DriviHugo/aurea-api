import { PrismaClient, Prisma } from "@prisma/client";

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
  metadata?: Record<string, unknown>;
}

export interface UpdateCaseInput extends Partial<CreateCaseInput> {}

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

export class CaseService {
  constructor(private prisma: PrismaClient) {}

  async findAll(params: PaginationParams): Promise<PaginatedResult<any>> {
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

  async findById(id: string): Promise<any | null> {
    const caseData = await this.prisma.case.findUnique({
      where: { id },
    });

    return caseData ? normalizeCase(caseData) : null;
  }

  async findByCode(code: string): Promise<any | null> {
    const caseData = await this.prisma.case.findFirst({
      where: { code },
    });

    return caseData ? normalizeCase(caseData) : null;
  }

  async create(input: CreateCaseInput): Promise<any> {
    const caseData = await this.prisma.case.create({
      data: {
        code: input.code,
        unit: input.unit,
        department: input.department,
        creatorId: input.creatorId,
        status: snakeToCamelValue(input.status) || "draft",
        contractType: snakeToCamelValue(input.contractType)!,
        subject: input.subject,
        description: input.description,
        estimatedContractValue: input.estimatedContractValue ?? null,
        baseTenderBudget: input.baseTenderBudget ?? null,
        vat: input.vat ?? null,
        extensionsAmount: input.extensionsAmount ?? null,
        modificationsAmount: input.modificationsAmount ?? null,
        proposedProcedure: snakeToCamelValue(input.proposedProcedure),
        selectedProcedure: snakeToCamelValue(input.selectedProcedure),
        selectedCpv: input.selectedCpv,
        hasLots: input.hasLots ?? false,
        lotsJustification: input.lotsJustification,
        numLots: input.numLots,
        isUrgent: input.isUrgent ?? false,
        isEmergency: input.isEmergency ?? false,
        urgencyJustification: input.urgencyJustification,
        completionPercentage: input.completionPercentage ?? 0,
        riskLevel: input.riskLevel || "green",
        lastPendingAction: input.lastPendingAction,
        dueDate: input.dueDate ?? null,
        metadata: input.metadata ?? {},
      },
    });

    return normalizeCase(caseData);
  }

  async update(id: string, input: UpdateCaseInput): Promise<any | null> {
    const existingCase = await this.prisma.case.findUnique({
      where: { id },
    });

    if (!existingCase) {
      return null;
    }

    const updateData: Prisma.CaseUpdateInput = {};

    if (input.code !== undefined) updateData.code = input.code;
    if (input.unit !== undefined) updateData.unit = input.unit;
    if (input.department !== undefined) updateData.department = input.department;
    if (input.status !== undefined)
      updateData.status = snakeToCamelValue(input.status) as any;
    if (input.contractType !== undefined)
      updateData.contractType = snakeToCamelValue(input.contractType) as any;
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
    if (input.proposedProcedure !== undefined)
      updateData.proposedProcedure = snakeToCamelValue(
        input.proposedProcedure
      ) as any;
    if (input.selectedProcedure !== undefined)
      updateData.selectedProcedure = snakeToCamelValue(
        input.selectedProcedure
      ) as any;
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
    if (input.riskLevel !== undefined) updateData.riskLevel = input.riskLevel;
    if (input.lastPendingAction !== undefined)
      updateData.lastPendingAction = input.lastPendingAction;
    if (input.dueDate !== undefined) updateData.dueDate = input.dueDate;
    if (input.metadata !== undefined)
      updateData.metadata = input.metadata as any;

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
    params: PaginationParams
  ): Promise<PaginatedResult<any>> {
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
