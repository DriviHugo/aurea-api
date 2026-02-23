import { PrismaClient, Prisma } from "@prisma/client";
import { PaginationParams, PaginatedResult } from "./case.service";

export interface IssueFilters {
  userId?: string;
  status?: string;
}

export interface CreateIssueInput {
  userId: string;
  location: string;
  functionality: string;
  description: string;
  expectedBehavior: string;
  screenshotUrl?: string;
  status?: string;
}

export interface UpdateIssueInput extends Partial<CreateIssueInput> {}

export class IssueService {
  constructor(private prisma: PrismaClient) {}

  async findAll(
    params: PaginationParams,
    filters?: IssueFilters
  ): Promise<PaginatedResult<any>> {
    const { page, limit } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.IssueWhereInput = {};
    if (filters?.userId) where.userId = filters.userId;
    if (filters?.status) where.status = filters.status as any;

    const [issues, total] = await Promise.all([
      this.prisma.issue.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.issue.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: issues,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findById(id: string): Promise<any | null> {
    return this.prisma.issue.findUnique({
      where: { id },
      include: {
        user: {
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

  async findByUser(
    userId: string,
    params: PaginationParams
  ): Promise<PaginatedResult<any>> {
    return this.findAll(params, { userId });
  }

  async create(input: CreateIssueInput): Promise<any> {
    return this.prisma.issue.create({
      data: {
        userId: input.userId,
        location: input.location,
        functionality: input.functionality,
        description: input.description,
        expectedBehavior: input.expectedBehavior,
        screenshotUrl: input.screenshotUrl,
        status: (input.status as any) || "pending",
      },
      include: {
        user: {
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

  async update(id: string, input: UpdateIssueInput): Promise<any | null> {
    const existing = await this.prisma.issue.findUnique({
      where: { id },
    });

    if (!existing) {
      return null;
    }

    const updateData: Prisma.IssueUpdateInput = {};

    if (input.location !== undefined) updateData.location = input.location;
    if (input.functionality !== undefined)
      updateData.functionality = input.functionality;
    if (input.description !== undefined)
      updateData.description = input.description;
    if (input.expectedBehavior !== undefined)
      updateData.expectedBehavior = input.expectedBehavior;
    if (input.screenshotUrl !== undefined)
      updateData.screenshotUrl = input.screenshotUrl;
    if (input.status !== undefined) updateData.status = input.status as any;

    return this.prisma.issue.update({
      where: { id },
      data: updateData,
      include: {
        user: {
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
    const existing = await this.prisma.issue.findUnique({
      where: { id },
    });

    if (!existing) {
      return false;
    }

    await this.prisma.issue.delete({
      where: { id },
    });

    return true;
  }

  async updateStatus(id: string, status: string): Promise<any | null> {
    return this.update(id, { status });
  }
}
