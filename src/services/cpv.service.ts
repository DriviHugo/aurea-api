/**
 * CPV Service - CPV codes search and import business logic
 */

import type { PrismaClient } from "@prisma/client";

export interface CpvSearchResult {
  code: string;
  description: string;
}

export interface CpvImportItem {
  code: string;
  description: string;
  descriptionEn?: string;
  level: number;
  parentCode?: string;
}

export interface CpvImportResult {
  inserted: number;
  errors?: string[];
}

export class CpvService {
  constructor(private prisma: PrismaClient) {}

  async search(query: string, limit = 20): Promise<CpvSearchResult[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const searchTerm = query.trim().toLowerCase();

    const results = await this.prisma.cpvCode.findMany({
      where: {
        active: true,
        OR: [
          { code: { startsWith: searchTerm } },
          { description: { contains: searchTerm, mode: "insensitive" } },
        ],
      },
      select: {
        code: true,
        description: true,
      },
      take: limit,
      orderBy: [{ level: "asc" }, { code: "asc" }],
    });

    return results.map((r) => ({ code: r.code, description: r.description }));
  }

  async importCodes(cpvData: CpvImportItem[]): Promise<CpvImportResult> {
    if (!cpvData || !Array.isArray(cpvData) || cpvData.length === 0) {
      throw new Error("No hay datos para importar");
    }

    const errors: string[] = [];
    let inserted = 0;

    // Use transaction for batch insert
    await this.prisma.$transaction(async (tx) => {
      for (const item of cpvData) {
        try {
          await tx.cpvCode.upsert({
            where: { code: item.code },
            update: {
              description: item.description,
              descriptionEn: item.descriptionEn ?? null,
              level: item.level,
              parentCode: item.parentCode ?? null,
              active: true,
            },
            create: {
              code: item.code,
              description: item.description,
              descriptionEn: item.descriptionEn ?? null,
              level: item.level,
              parentCode: item.parentCode ?? null,
              active: true,
            },
          });
          inserted++;
        } catch (itemError) {
          errors.push(
            `Error en código ${item.code}: ${itemError instanceof Error ? itemError.message : "Error desconocido"}`,
          );
        }
      }
    });

    return {
      inserted,
      ...(errors.length > 0 && { errors }),
    };
  }
}

export function createCpvService(prisma: PrismaClient): CpvService {
  return new CpvService(prisma);
}
