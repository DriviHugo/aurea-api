/**
 * AI Repair Processing Function
 * Processes uploaded repair documents (reparos/subsanaciones) through AI
 * to extract issues and generate corrective rules.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { getProductionGateway } from "../../services/ai-gateway/production-gateway.js";
import type { FallbackAIGatewayService } from "../../services/ai-gateway/fallback-gateway.service.js";

let aiGateway: FallbackAIGatewayService | null = null;

function getAIGateway(): FallbackAIGatewayService {
  aiGateway ??= getProductionGateway();
  return aiGateway;
}

const SYSTEM_PROMPT = `Eres un experto jurídico en contratación pública española (LCSP 9/2017).
Se te proporcionará el texto de un documento de reparos o subsanaciones emitido por un órgano de control (Intervención General, Tribunal de Cuentas, etc.).

Tu tarea es:
1. EXTRAER cada reparo o deficiencia mencionada en el documento
2. Para cada reparo, GENERAR reglas correctivas que eviten ese error en futuras contrataciones

IMPORTANTE: Responde SOLO con un JSON válido, sin texto adicional ni markdown.
{
  "extractions": [
    {
      "affectedSection": "Sección del expediente afectada (ej: 'Objeto del contrato', 'Presupuesto', etc.)",
      "errorType": "Tipo de error (ej: 'omisión', 'incorrección', 'insuficiencia')",
      "literalDescription": "Descripción literal del reparo tal como aparece en el documento",
      "normReference": "Artículo o norma de referencia (ej: 'Art. 116.4 LCSP')",
      "consequence": "Consecuencia del error",
      "originalText": "Texto original del documento que contiene el reparo"
    }
  ],
  "rules": [
    {
      "caseSection": "Sección del expediente donde aplica la regla",
      "category": "Categoría (ej: 'presupuesto', 'objeto', 'procedimiento', 'solvencia')",
      "type": "hacer | no_hacer",
      "content": "Descripción clara de la regla correctiva",
      "priority": 1
    }
  ]
}`;

export default async (fastify: FastifyInstance): Promise<void> => {
  fastify.post(
    "/ai-process-repair",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["AI Functions"],
        description: "Process a repair document and extract issues and rules",
        body: {
          type: "object",
          properties: {
            documentId: { type: "string", format: "uuid" },
            documentText: { type: "string" },
          },
          required: ["documentId"],
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { documentId, documentText } = request.body as {
          documentId: string;
          documentText?: string;
        };

        const prisma = fastify.prisma;

        // If no text provided, try to get document info
        let text = documentText;
        if (text == null || text.length === 0) {
          const doc = await prisma.repairDocument.findUnique({
            where: { id: documentId },
          });
          if (!doc) {
            return reply.status(404).send({ error: "Document not found" });
          }
          // In a real implementation, extract text from the stored file
          // For now, return error asking for text
          return reply.status(400).send({
            error:
              "Document text extraction not yet implemented. Pass documentText directly.",
          });
        }

        const gateway = getAIGateway();
        const result = await gateway.completeWithMeta(
          SYSTEM_PROMPT,
          `Analiza el siguiente documento de reparos y extrae las deficiencias y reglas correctivas:\n\n${text}`,
        );

        // Parse AI response
        let parsed: {
          extractions: Array<{
            affectedSection: string;
            errorType: string;
            literalDescription: string;
            normReference: string;
            consequence: string;
            originalText: string;
          }>;
          rules: Array<{
            caseSection: string;
            category: string;
            type: string;
            content: string;
            priority: number;
          }>;
        };

        try {
          const jsonMatch = result.content.match(/\{[\s\S]*\}/);
          if (!jsonMatch) throw new Error("No JSON found in AI response");
          parsed = JSON.parse(jsonMatch[0]);
        } catch {
          // Update document status to error
          await prisma.repairDocument.update({
            where: { id: documentId },
            data: {
              status: "error",
              errorMessage: "Failed to parse AI response",
            },
          });
          return reply
            .status(500)
            .send({ error: "Failed to parse AI response" });
        }

        // Save extractions
        const savedExtractions = [];
        for (const ext of parsed.extractions) {
          const saved = await prisma.repairExtraction.create({
            data: {
              documentId,
              affectedSection: ext.affectedSection,
              errorType: ext.errorType,
              literalDescription: ext.literalDescription,
              normReference: ext.normReference,
              consequence: ext.consequence,
              originalText: ext.originalText,
            },
          });
          savedExtractions.push(saved);
        }

        // Save rules
        const savedRules = [];
        for (const rule of parsed.rules) {
          const saved = await prisma.repairRule.create({
            data: {
              documentId,
              caseSection: rule.caseSection,
              category: rule.category,
              type: rule.type === "hacer" || rule.type === "do" ? "do" : "dont",
              content: rule.content,
              priority: rule.priority || 0,
              active: true,
            },
          });
          savedRules.push(saved);
        }

        // Update document status
        await prisma.repairDocument.update({
          where: { id: documentId },
          data: { status: "completed" },
        });

        return reply.status(200).send({
          data: {
            extractions: savedExtractions,
            rules: savedRules,
            provider: result.provider,
          },
          error: null,
        });
      } catch (error) {
        fastify.log.error(error, "Error processing repair document");
        return reply.status(500).send({
          error:
            error instanceof Error ? error.message : "Internal server error",
        });
      }
    },
  );
};
