/**
 * CPV Service - CPV codes search and import business logic
 */

import type { PrismaClient } from "@prisma/client";

export interface CpvSearchResult {
  codigo: string;
  descripcion: string;
}

export interface CpvImportItem {
  codigo: string;
  descripcion: string;
  descripcion_en?: string;
  nivel: number;
  codigo_padre?: string;
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
          { codigo: { startsWith: searchTerm } },
          { descripcion: { contains: searchTerm, mode: "insensitive" } },
        ],
      },
      select: {
        codigo: true,
        descripcion: true,
      },
      take: limit,
      orderBy: [{ nivel: "asc" }, { codigo: "asc" }],
    });

    return results;
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
            where: { codigo: item.codigo },
            update: {
              descripcion: item.descripcion,
              descripcionEn: item.descripcion_en ?? null,
              nivel: item.nivel,
              codigoPadre: item.codigo_padre ?? null,
              active: true,
            },
            create: {
              codigo: item.codigo,
              descripcion: item.descripcion,
              descripcionEn: item.descripcion_en ?? null,
              nivel: item.nivel,
              codigoPadre: item.codigo_padre ?? null,
              active: true,
            },
          });
          inserted++;
        } catch (itemError) {
          errors.push(
            `Error en código ${item.codigo}: ${itemError instanceof Error ? itemError.message : "Error desconocido"}`,
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
