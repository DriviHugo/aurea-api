/**
 * CPV Search Function - Search CPV codes by text
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

interface CpvSearchBody {
  query: string;
  limit?: number;
}

export default async (app: FastifyInstance): Promise<void> => {
  app.post("/cpv-search", {
    preValidation: [app.authAccessToken],
    handler: async (
      req: FastifyRequest<{ Body: CpvSearchBody }>,
      reply: FastifyReply,
    ) => {
      const { query, limit = 20 } = req.body;

      if (!query || query.trim().length < 2) {
        return reply.send({
          data: { resultados: [] },
          error: null,
        });
      }

      try {
        const { prisma } = app;
        const searchTerm = query.trim().toLowerCase();

        // Search by code prefix or description (case-insensitive)
        const results = await prisma.cpvCodigo.findMany({
          where: {
            activo: true,
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

        return reply.send({
          data: {
            resultados: results,
          },
          error: null,
        });
      } catch (error) {
        console.error("Error buscando CPV:", error);
        return reply.status(500).send({
          data: null,
          error: {
            message:
              error instanceof Error
                ? error.message
                : "Error al buscar códigos CPV",
          },
        });
      }
    },
  });
};
