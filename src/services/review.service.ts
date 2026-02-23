import { PrismaClient, Prisma } from "@prisma/client";
import { PaginationParams, PaginatedResult } from "./case.service";

export interface ReviewFilters {
  caseId?: string;
  reviewerId?: string;
  status?: string;
}

export interface CreateReviewInput {
  caseId: string;
  reviewerId: string;
  comments?: string;
  status?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateReviewInput extends Partial<CreateReviewInput> {}

export class ReviewService {
  constructor(private prisma: PrismaClient) {}

  async findAll(
    params: PaginationParams,
    filters?: ReviewFilters
  ): Promise<PaginatedResult<any>> {
    const { page, limit } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.ReviewWhereInput = {};
    if (filters?.caseId) where.caseId = filters.caseId;
    if (filters?.reviewerId) where.reviewerId = filters.reviewerId;
    if (filters?.status) where.status = filters.status as any;

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          reviewer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
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

  async findById(id: string): Promise<any | null> {
    return this.prisma.review.findUnique({
      where: { id },
      include: {
        reviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async findByCase(
    caseId: string,
    params: PaginationParams
  ): Promise<PaginatedResult<any>> {
    return this.findAll(params, { caseId });
  }

  async findByReviewer(
    reviewerId: string,
    params: PaginationParams
  ): Promise<PaginatedResult<any>> {
    return this.findAll(params, { reviewerId });
  }

  async create(input: CreateReviewInput): Promise<any> {
    return this.prisma.review.create({
      data: {
        caseId: input.caseId,
        reviewerId: input.reviewerId,
        comments: input.comments,
        status: (input.status as any) || "pending",
        metadata: input.metadata ?? {},
      },
      include: {
        reviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async update(id: string, input: UpdateReviewInput): Promise<any | null> {
    const existing = await this.prisma.review.findUnique({
      where: { id },
    });

    if (!existing) {
      return null;
    }

    const updateData: Prisma.ReviewUpdateInput = {};

    if (input.comments !== undefined) updateData.comments = input.comments;
    if (input.status !== undefined) updateData.status = input.status as any;
    if (input.metadata !== undefined) updateData.metadata = input.metadata as any;

    return this.prisma.review.update({
      where: { id },
      data: updateData,
      include: {
        reviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
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
