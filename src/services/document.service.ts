import {
  Prisma,
  type PrismaClient,
  type DocumentType,
  type ReviewStatus,
} from "@prisma/client";
import type { PaginationParams, PaginatedResult } from "./case.service.js";

// Convert snake_case type to camelCase for Prisma enum
const documentTypeMap = new Map<string, string>([
  ["memoria", "report"],
  ["report", "report"],
  ["ppt", "technicalSpecs"],
  ["technicalSpecs", "technicalSpecs"],
  ["pcap", "adminClauses"],
  ["adminClauses", "adminClauses"],
  ["anexo_tecnico", "technicalAnnex"],
  ["technicalAnnex", "technicalAnnex"],
  ["anexo_economico", "economicAnnex"],
  ["economicAnnex", "economicAnnex"],
  ["informe_necesidad", "needsReport"],
  ["needsReport", "needsReport"],
  ["justificacion_procedimiento", "procedureJustification"],
  ["procedureJustification", "procedureJustification"],
]);

function convertDocumentType(type: string): string {
  return documentTypeMap.get(type) ?? type;
}

// Convert camelCase type back to snake_case for API response
const typeToSnakeCaseMap = new Map<string, string>([
  ["report", "memoria"],
  ["technicalSpecs", "ppt"],
  ["adminClauses", "pcap"],
  ["technicalAnnex", "anexo_tecnico"],
  ["economicAnnex", "anexo_economico"],
  ["needsReport", "informe_necesidad"],
  ["procedureJustification", "justificacion_procedimiento"],
]);

function convertTypeToSnakeCase(type: string): string {
  return typeToSnakeCaseMap.get(type) ?? type;
}

// Normalize document for API response
function normalizeDocument(doc: unknown): unknown {
  if (doc === null || doc === undefined || typeof doc !== "object") {
    return null;
  }
  const data = doc as Record<string, unknown>;
  return {
    ...data,
    type: convertTypeToSnakeCase(data["type"] as string),
  };
}

export interface DocumentFilters {
  caseId?: string;
  type?: string;
  status?: string;
}

export interface CreateDocumentInput {
  caseId: string;
  type: string;
  name: string;
  version?: number;
  hash?: string;
  status?: string;
  content?: Prisma.InputJsonValue;
  docxUrl?: string;
  pdfUrl?: string;
  creatorId: string;
}

export type UpdateDocumentInput = Partial<CreateDocumentInput>;

export class DocumentService {
  constructor(private prisma: PrismaClient) {}

  async findAll(
    params: PaginationParams,
    filters?: DocumentFilters,
  ): Promise<PaginatedResult<unknown>> {
    const { page, limit } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.DocumentWhereInput = {};
    if (filters?.caseId !== undefined && filters.caseId !== "") {
      where.caseId = filters.caseId;
    }
    if (filters?.type !== undefined && filters.type !== "") {
      where.type = convertDocumentType(filters.type) as DocumentType;
    }
    if (filters?.status !== undefined && filters.status !== "") {
      where.status = filters.status as ReviewStatus;
    }

    const [documents, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.document.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: documents.map(normalizeDocument),
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findById(id: string): Promise<unknown | null> {
    const document = await this.prisma.document.findUnique({
      where: { id },
    });

    return normalizeDocument(document);
  }

  async findByCase(
    caseId: string,
    params: PaginationParams,
  ): Promise<PaginatedResult<unknown>> {
    return this.findAll(params, { caseId });
  }

  async create(input: CreateDocumentInput): Promise<unknown> {
    const data: Prisma.DocumentCreateInput = {
      case: { connect: { id: input.caseId } },
      type: convertDocumentType(input.type) as DocumentType,
      name: input.name,
      version: input.version ?? 1,
      status: (input.status ?? "pending") as ReviewStatus,
      creator: { connect: { id: input.creatorId } },
    };

    // Add optional fields only if defined
    if (input.hash !== undefined) data.hash = input.hash;
    if (input.content !== undefined) {
      data.content = input.content ?? Prisma.JsonNull;
    }
    if (input.docxUrl !== undefined) data.docxUrl = input.docxUrl;
    if (input.pdfUrl !== undefined) data.pdfUrl = input.pdfUrl;

    const document = await this.prisma.document.create({ data });

    return normalizeDocument(document);
  }

  async update(
    id: string,
    input: UpdateDocumentInput,
  ): Promise<unknown | null> {
    const existing = await this.prisma.document.findUnique({
      where: { id },
    });

    if (!existing) {
      return null;
    }

    const updateData: Prisma.DocumentUpdateInput = {};

    if (input.type !== undefined)
      updateData.type = convertDocumentType(input.type) as DocumentType;
    if (input.name !== undefined) updateData.name = input.name;
    if (input.version !== undefined) updateData.version = input.version;
    if (input.hash !== undefined) updateData.hash = input.hash;
    if (input.status !== undefined)
      updateData.status = input.status as ReviewStatus;
    if (input.content !== undefined) updateData.content = input.content;
    if (input.docxUrl !== undefined) updateData.docxUrl = input.docxUrl;
    if (input.pdfUrl !== undefined) updateData.pdfUrl = input.pdfUrl;

    const updated = await this.prisma.document.update({
      where: { id },
      data: updateData,
    });

    return normalizeDocument(updated);
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.prisma.document.findUnique({
      where: { id },
    });

    if (!existing) {
      return false;
    }

    await this.prisma.document.delete({
      where: { id },
    });

    return true;
  }
}
