/**
 * CPV Controller - CPV codes request handlers
 */

import type { FastifyRequest, FastifyReply } from "fastify";
import type { CpvService, CpvImportItem } from "../services/cpv.service.js";
import logger from "../config/logger.js";

interface CpvSearchBody {
  query: string;
  limit?: number;
}

interface ImportCpvBody {
  cpvData: CpvImportItem[];
}

export class CpvController {
  constructor(private cpvService: CpvService) {}

  async search(
    req: FastifyRequest<{ Body: CpvSearchBody }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const { query, limit = 20 } = req.body;
      const results = await this.cpvService.search(query, limit);

      return reply.send({
        data: { results },
        error: null,
      });
    } catch (error) {
      logger.error({ err: error, msg: "Error buscando CPV" });
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
  }

  async importCodes(
    req: FastifyRequest<{ Body: ImportCpvBody }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.cpvService.importCodes(req.body.cpvData);

      return reply.send({
        data: result,
        error: null,
      });
    } catch (error) {
      logger.error({ err: error, msg: "Error importando CPV" });
      return reply
        .status(
          error instanceof Error && error.message.includes("No hay datos")
            ? 400
            : 500,
        )
        .send({
          data: null,
          error: {
            message:
              error instanceof Error
                ? error.message
                : "Error al importar códigos CPV",
          },
        });
    }
  }
}
