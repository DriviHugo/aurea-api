/**
 * AI Reescribir Sección - Rewrite document section with AI assistance
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  createAIGateway,
  type AIGatewayService,
} from "../../services/ai-gateway/index.js";

interface ReescribirSeccionBody {
  seccionId: string;
  contenidoActual: string;
  sugerencia: string;
  tituloSeccion: string;
}

let aiGateway: AIGatewayService | null = null;

function getAIGateway(): AIGatewayService {
  aiGateway ??= createAIGateway();
  return aiGateway;
}

const SYSTEM_PROMPT = `Eres un experto redactor de documentos de contratación pública española.
Tu tarea es reescribir una sección de un documento integrando las sugerencias o correcciones proporcionadas.

INSTRUCCIONES:
1. Mantén el formato y estructura general de la sección
2. Integra la sugerencia de manera natural en el contenido
3. Asegúrate de que el resultado sea coherente con el contexto legal de la LCSP
4. Mejora la redacción si es necesario
5. Mantén un tono formal y técnico apropiado para documentos administrativos

IMPORTANTE: Responde SOLO con el contenido reescrito, sin explicaciones adicionales ni formato markdown.
El contenido debe estar listo para ser insertado directamente en el documento.`;

export default async (app: FastifyInstance): Promise<void> => {
  app.post("/ai-reescribir-seccion", {
    preValidation: [app.authAccessToken],
    handler: async (
      req: FastifyRequest<{ Body: ReescribirSeccionBody }>,
      reply: FastifyReply,
    ) => {
      const { seccionId, contenidoActual, sugerencia, tituloSeccion } =
        req.body;

      if (!seccionId || !contenidoActual || !sugerencia || !tituloSeccion) {
        return reply.status(400).send({
          data: null,
          error: { message: "Faltan campos requeridos" },
        });
      }

      const userPrompt = `TÍTULO DE LA SECCIÓN: ${tituloSeccion}

CONTENIDO ACTUAL:
${contenidoActual}

SUGERENCIA A INTEGRAR:
${sugerencia}

Por favor, reescribe la sección integrando la sugerencia de manera natural.`;

      try {
        const gateway = getAIGateway();
        const nuevoContenido = await gateway.completeSimple(
          SYSTEM_PROMPT,
          userPrompt,
        );

        // Update the section in the database
        const { prisma } = app;
        await prisma.documentoSeccion.update({
          where: { id: seccionId },
          data: {
            contenido: nuevoContenido,
            estado: "generado",
            updatedAt: new Date(),
          },
        });

        return reply.send({
          data: {
            seccionId,
            nuevoContenido,
            success: true,
          },
          error: null,
        });
      } catch (error) {
        console.error("Error al reescribir sección:", error);
        return reply.status(500).send({
          data: null,
          error: {
            message:
              error instanceof Error
                ? error.message
                : "Error al reescribir la sección",
          },
        });
      }
    },
  });
};
