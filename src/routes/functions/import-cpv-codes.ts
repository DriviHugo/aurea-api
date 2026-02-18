/**
 * Import CPV Codes Function - Batch import CPV codes
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

interface CpvImportItem {
  codigo: string;
  descripcion: string;
  descripcion_en?: string;
  nivel: number;
  codigo_padre?: string;
}

interface ImportCpvBody {
  cpvData: CpvImportItem[];
}

export default async (app: FastifyInstance): Promise<void> => {
  app.post("/import-cpv-codes", {
    preValidation: [app.authAccessToken],
    handler: async (
      req: FastifyRequest<{ Body: ImportCpvBody }>,
      reply: FastifyReply,
    ) => {
      const { cpvData } = req.body;

      if (!cpvData || !Array.isArray(cpvData) || cpvData.length === 0) {
        return reply.status(400).send({
          data: null,
          error: { message: "No hay datos para importar" },
        });
      }

      try {
        const { prisma } = app;
        const errors: string[] = [];
        let inserted = 0;

        // Use transaction for batch insert
        await prisma.$transaction(async (tx) => {
          for (const item of cpvData) {
            try {
              await tx.cpvCodigo.upsert({
                where: { codigo: item.codigo },
                update: {
                  descripcion: item.descripcion,
                  descripcionEn: item.descripcion_en ?? null,
                  nivel: item.nivel,
                  codigoPadre: item.codigo_padre ?? null,
                  activo: true,
                },
                create: {
                  codigo: item.codigo,
                  descripcion: item.descripcion,
                  descripcionEn: item.descripcion_en ?? null,
                  nivel: item.nivel,
                  codigoPadre: item.codigo_padre ?? null,
                  activo: true,
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

        return reply.send({
          data: {
            inserted,
            errors: errors.length > 0 ? errors : undefined,
          },
          error: null,
        });
      } catch (error) {
        console.error("Error importando CPV:", error);
        return reply.status(500).send({
          data: null,
          error: {
            message:
              error instanceof Error
                ? error.message
                : "Error al importar códigos CPV",
          },
        });
      }
    },
  });
};
