/**
 * AI Document Service - AI-powered document operations
 */

import type { PrismaClient } from "@prisma/client";
import { createAIGateway, type AIGatewayService } from "./ai-gateway/index.js";

export interface ReescribirSeccionInput {
  seccionId: string;
  contenidoActual: string;
  sugerencia: string;
  tituloSeccion: string;
}

export interface ReescribirSeccionResult {
  seccionId: string;
  nuevoContenido: string;
  success: boolean;
}

const REESCRIBIR_SYSTEM_PROMPT = `Eres un experto redactor de documentos de contratación pública española.
Tu tarea es reescribir una sección de un documento integrando las sugerencias o correcciones proporcionadas.

INSTRUCCIONES:
1. Mantén el formato y estructura general de la sección
2. Integra la sugerencia de manera natural en el contenido
3. Asegúrate de que el resultado sea coherente con el contexto legal de la LCSP
4. Mejora la redacción si es necesario
5. Mantén un tono formal y técnico apropiado para documentos administrativos

IMPORTANTE: Responde SOLO con el contenido reescrito, sin explicaciones adicionales ni formato markdown.
El contenido debe estar listo para ser insertado directamente en el documento.`;

export class AIDocumentService {
  private aiGateway: AIGatewayService;

  constructor(private prisma: PrismaClient) {
    this.aiGateway = createAIGateway();
  }

  async reescribirSeccion(
    input: ReescribirSeccionInput,
  ): Promise<ReescribirSeccionResult> {
    const { seccionId, contenidoActual, sugerencia, tituloSeccion } = input;

    if (!seccionId || !contenidoActual || !sugerencia || !tituloSeccion) {
      throw new Error("Faltan campos requeridos");
    }

    const userPrompt = `TÍTULO DE LA SECCIÓN: ${tituloSeccion}

CONTENIDO ACTUAL:
${contenidoActual}

SUGERENCIA A INTEGRAR:
${sugerencia}

Por favor, reescribe la sección integrando la sugerencia de manera natural.`;

    const nuevoContenido = await this.aiGateway.completeSimple(
      REESCRIBIR_SYSTEM_PROMPT,
      userPrompt,
    );

    // Update the section in the database
    await this.prisma.documentoSeccion.update({
      where: { id: seccionId },
      data: {
        contenido: nuevoContenido,
        estado: "generado",
        updatedAt: new Date(),
      },
    });

    return {
      seccionId,
      nuevoContenido,
      success: true,
    };
  }
}

export function createAIDocumentService(
  prisma: PrismaClient,
): AIDocumentService {
  return new AIDocumentService(prisma);
}
