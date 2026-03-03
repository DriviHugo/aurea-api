/**
 * AI Sufficiency Evaluation Function
 * Evaluates whether a document section has enough information to be properly
 * generated, and produces clarifying questions if not.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { getProductionGateway } from "../../services/ai-gateway/production-gateway.js";
import type { FallbackAIGatewayService } from "../../services/ai-gateway/fallback-gateway.service.js";

let aiGateway: FallbackAIGatewayService | null = null;

function getAIGateway(): FallbackAIGatewayService {
  aiGateway ??= getProductionGateway();
  return aiGateway;
}

const SYSTEM_PROMPT = `Eres un experto en contratación pública española (LCSP 9/2017).
Se te pide evaluar si la información disponible es SUFICIENTE para redactar correctamente una sección de un documento de contratación pública.

Evalúa la información del expediente proporcionada y determina:
1. Si hay información suficiente para generar la sección (isSufficient: true/false)
2. Si NO es suficiente, genera preguntas específicas que el usuario debe responder

Criterios de suficiencia:
- No pidas información que se pueda inferir del tipo de contrato o del procedimiento
- No pidas información que ya esté disponible en el contexto del expediente
- Solo genera preguntas sobre información CRÍTICA que afecta la validez jurídica de la sección
- Limita las preguntas a un máximo de 5

IMPORTANTE: Responde SOLO con un JSON válido, sin texto adicional ni markdown.
{
  "isSufficient": true | false,
  "questions": [
    "Pregunta 1 específica y accionable",
    "Pregunta 2..."
  ],
  "reasoning": "Breve explicación de por qué es o no suficiente"
}`;

export default async (fastify: FastifyInstance): Promise<void> => {
  fastify.post(
    "/ai-evaluate-sufficiency",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["AI Functions"],
        description: "Evaluate if a section has sufficient information for generation",
        body: {
          type: "object",
          properties: {
            sectionId: { type: "string", format: "uuid" },
            documentId: { type: "string", format: "uuid" },
            sectionTitle: { type: "string" },
            sectionDescription: { type: "string" },
            sectionOrder: { type: "integer" },
            caseContext: { type: "object" },
            plan: { type: "array" },
            previousAnswers: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  question: { type: "string" },
                  answer: { type: "string" },
                },
              },
            },
          },
          required: ["sectionId", "documentId", "sectionTitle", "sectionDescription"],
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const {
          sectionId,
          documentId,
          sectionTitle,
          sectionDescription,
          sectionOrder,
          caseContext,
          plan,
          previousAnswers,
        } = request.body as {
          sectionId: string;
          documentId: string;
          sectionTitle: string;
          sectionDescription: string;
          sectionOrder?: number;
          caseContext?: Record<string, unknown>;
          plan?: Array<{ order: number; title: string; description: string }>;
          previousAnswers?: Array<{ question: string; answer: string }>;
        };

        const prisma = fastify.prisma;

        // Build user prompt with context
        let userPrompt = `SECCIÓN A EVALUAR:
- Título: ${sectionTitle}
- Descripción: ${sectionDescription}
- Orden: ${sectionOrder ?? "N/A"}

CONTEXTO DEL EXPEDIENTE:
${JSON.stringify(caseContext || {}, null, 2)}`;

        if (plan && plan.length > 0) {
          userPrompt += `\n\nPLAN DEL DOCUMENTO (otras secciones):
${plan.map((s) => `${s.order}. ${s.title}: ${s.description}`).join("\n")}`;
        }

        if (previousAnswers && previousAnswers.length > 0) {
          userPrompt += `\n\nRESPUESTAS ANTERIORES DEL USUARIO:
${previousAnswers.map((a) => `P: ${a.question}\nR: ${a.answer}`).join("\n\n")}`;
        }

        const gateway = getAIGateway();
        const result = await gateway.completeWithMeta(SYSTEM_PROMPT, userPrompt);

        // Parse AI response
        let parsed: { isSufficient: boolean; questions: string[]; reasoning?: string };
        try {
          const jsonMatch = result.content.match(/\{[\s\S]*\}/);
          if (!jsonMatch) throw new Error("No JSON found");
          parsed = JSON.parse(jsonMatch[0]);
        } catch {
          return reply.status(500).send({ error: "Failed to parse AI response" });
        }

        // If questions were generated, save them to DB
        if (parsed.questions && parsed.questions.length > 0) {
          // Get current max round for this section
          const existingQuestions = await prisma.sectionQuestion.findMany({
            where: { sectionId },
            orderBy: { round: "desc" },
            take: 1,
          });

          const nextRound = existingQuestions.length > 0
            ? existingQuestions[0]!.round + 1
            : 1;

          // Save new questions
          await prisma.sectionQuestion.createMany({
            data: parsed.questions.map((q, i) => ({
              sectionId,
              documentId,
              question: q,
              order: i + 1,
              round: nextRound,
            })),
          });

          // If not sufficient, update section status
          if (!parsed.isSufficient) {
            try {
              await prisma.documentSection.update({
                where: { id: sectionId },
                data: { status: "pendingInfo" },
              });
            } catch {
              // Section might not exist yet, that's OK
            }
          }
        }

        return reply.status(200).send({
          data: {
            isSufficient: parsed.isSufficient,
            questions: parsed.questions || [],
            reasoning: parsed.reasoning,
            provider: result.provider,
          },
          error: null,
        });
      } catch (error) {
        fastify.log.error(error, "Error evaluating sufficiency");
        return reply.status(500).send({
          error: error instanceof Error ? error.message : "Internal server error",
        });
      }
    },
  );
};
