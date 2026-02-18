/**
 * AI Document Controller - AI document operations request handlers
 */

import type { FastifyRequest, FastifyReply } from "fastify";
import type { AIDocumentService } from "../services/ai-document.service.js";

interface ReescribirSeccionBody {
  seccionId: string;
  contenidoActual: string;
  sugerencia: string;
  tituloSeccion: string;
}

export class AIDocumentController {
  constructor(private aiDocumentService: AIDocumentService) {}

  async reescribirSeccion(
    req: FastifyRequest<{ Body: ReescribirSeccionBody }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.aiDocumentService.reescribirSeccion({
        seccionId: req.body.seccionId,
        contenidoActual: req.body.contenidoActual,
        sugerencia: req.body.sugerencia,
        tituloSeccion: req.body.tituloSeccion,
      });

      return reply.send({
        data: result,
        error: null,
      });
    } catch (error) {
      console.error("Error al reescribir sección:", error);
      return reply
        .status(
          error instanceof Error && error.message.includes("Faltan campos")
            ? 400
            : 500,
        )
        .send({
          data: null,
          error: {
            message:
              error instanceof Error
                ? error.message
                : "Error al reescribir la sección",
          },
        });
    }
  }
}
