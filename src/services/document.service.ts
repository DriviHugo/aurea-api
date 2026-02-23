import { PrismaClient, Prisma } from "@prisma/client";
import { PaginationParams, PaginatedResult } from "./case.service";

// Convert snake_case type to camelCase for Prisma enum
function convertDocumentType(type: string): string {
  const typeMap: Record<string, string> = {
    memoria: "report",
    report: "report",
    ppt: "technicalSpecs",
    technicalSpecs: "technicalSpecs",
    pcap: "adminClauses",
    adminClauses: "adminClauses",
    anexo_tecnico: "technicalAnnex",
    technicalAnnex: "technicalAnnex",
    anexo_economico: "economicAnnex",
    economicAnnex: "economicAnnex",
    informe_necesidad: "needsReport",
    needsReport: "needsReport",
    justificacion_procedimiento: "procedureJustification",
    procedureJustification: "procedureJustification",
  };
  return typeMap[type] || type;
}

// Convert camelCase type back to snake_case for API response
function convertTypeToSnakeCase(type: string): string {
  const typeMap: Record<string, string> = {
    report: "memoria",
    technicalSpecs: "ppt",
    adminClauses: "pcap",
    technicalAnnex: "anexo_tecnico",
    economicAnnex: "anexo_economico",
    needsReport: "informe_necesidad",
    procedureJustification: "justificacion_procedimiento",
  };
  return typeMap[type] || type;
}

// Normalize document for API response
function normalizeDocument(doc: any): any {
  if (!doc) return null;
  return {
    ...doc,
    type: convertTypeToSnakeCase(doc.type),
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
  content?: Record<string, unknown>;
  docxUrl?: string;
  pdfUrl?: string;
  creatorId: string;
}

export interface UpdateDocumentInput extends Partial<CreateDocumentInput> {}

export class DocumentService {
  constructor(private prisma: PrismaClient) {}

  async findAll(
    params: PaginationParams,
    filters?: DocumentFilters
  ): Promise<PaginatedResult<any>> {
    const { page, limit } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.DocumentWhereInput = {};
    if (filters?.caseId) where.caseId = filters.caseId;
    if (filters?.type) where.type = convertDocumentType(filters.type) as any;
    if (filters?.status) where.status = filters.status as any;

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

  async findById(id: string): Promise<any | null> {
    const document = await this.prisma.document.findUnique({
      where: { id },
    });

    return normalizeDocument(document);
  }

  async findByCase(
    caseId: string,
    params: PaginationParams
  ): Promise<PaginatedResult<any>> {
    return this.findAll(params, { caseId });
  }

  async create(input: CreateDocumentInput): Promise<any> {
    const document = await this.prisma.document.create({
      data: {
        caseId: input.caseId,
        type: convertDocumentType(input.type) as any,
        name: input.name,
        version: input.version ?? 1,
        hash: input.hash,
        status: (input.status as any) || "draft",
        content: input.content ?? {},
        docxUrl: input.docxUrl,
        pdfUrl: input.pdfUrl,
        creatorId: input.creatorId,
      },
    });

    return normalizeDocument(document);
  }

  async update(id: string, input: UpdateDocumentInput): Promise<any | null> {
    const existing = await this.prisma.document.findUnique({
      where: { id },
    });

    if (!existing) {
      return null;
    }

    const updateData: Prisma.DocumentUpdateInput = {};

    if (input.type !== undefined)
      updateData.type = convertDocumentType(input.type) as any;
    if (input.name !== undefined) updateData.name = input.name;
    if (input.version !== undefined) updateData.version = input.version;
    if (input.hash !== undefined) updateData.hash = input.hash;
    if (input.status !== undefined) updateData.status = input.status as any;
    if (input.content !== undefined) updateData.content = input.content as any;
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
