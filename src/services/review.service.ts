import type {
  PrismaClient,
  Prisma,
  ReviewDecision,
  UserRole,
} from "@prisma/client";
import type { PaginationParams, PaginatedResult } from "./case.service.js";

export interface ReviewFilters {
  caseId?: string;
  userId?: string;
  decision?: string;
}

export interface CreateReviewInput {
  caseId: string;
  documentId?: string | null;
  userId: string;
  role: string;
  changeDescription: string;
  decision: string;
  reason?: string | null;
}

export type UpdateReviewInput = Partial<
  Omit<CreateReviewInput, "caseId" | "userId">
>;

export class ReviewService {
  constructor(private prisma: PrismaClient) {}

  async findAll(
    params: PaginationParams,
    filters?: ReviewFilters,
  ): Promise<PaginatedResult<unknown>> {
    const { page, limit } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.ReviewWhereInput = {};
    if (filters?.caseId !== undefined && filters.caseId !== "") {
      where.caseId = filters.caseId;
    }
    if (filters?.userId !== undefined && filters.userId !== "") {
      where.userId = filters.userId;
    }
    if (filters?.decision !== undefined && filters.decision !== "") {
      where.decision = filters.decision as ReviewDecision;
    }

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              lastName: true,
              email: true,
            },
          },
          comments: true,
        },
      }),
      this.prisma.review.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: reviews,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findById(id: string): Promise<unknown | null> {
    return this.prisma.review.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
          },
        },
        comments: true,
      },
    });
  }

  async findByCase(
    caseId: string,
    params: PaginationParams,
  ): Promise<PaginatedResult<unknown>> {
    return this.findAll(params, { caseId });
  }

  async findByUser(
    userId: string,
    params: PaginationParams,
  ): Promise<PaginatedResult<unknown>> {
    return this.findAll(params, { userId });
  }

  async create(input: CreateReviewInput): Promise<unknown> {
    return this.prisma.review.create({
      data: {
        caseId: input.caseId,
        documentId: input.documentId ?? null,
        userId: input.userId,
        role: input.role as UserRole,
        changeDescription: input.changeDescription,
        decision: input.decision as ReviewDecision,
        reason: input.reason ?? null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
          },
        },
        comments: true,
      },
    });
  }

  async update(id: string, input: UpdateReviewInput): Promise<unknown | null> {
    const existing = await this.prisma.review.findUnique({
      where: { id },
    });

    if (!existing) {
      return null;
    }

    const updateData: Prisma.ReviewUpdateInput = {};

    if (input.documentId !== undefined) {
      if (input.documentId !== null && input.documentId !== "") {
        updateData.document = { connect: { id: input.documentId } };
      } else {
        updateData.document = { disconnect: true };
      }
    }
    if (input.role !== undefined) updateData.role = input.role as UserRole;
    if (input.changeDescription !== undefined)
      updateData.changeDescription = input.changeDescription;
    if (input.decision !== undefined)
      updateData.decision = input.decision as ReviewDecision;
    if (input.reason !== undefined) updateData.reason = input.reason;

    return this.prisma.review.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
          },
        },
        comments: true,
      },
    });
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.prisma.review.findUnique({
      where: { id },
    });

    if (!existing) {
      return false;
    }

    await this.prisma.review.delete({
      where: { id },
    });

    return true;
  }
}
