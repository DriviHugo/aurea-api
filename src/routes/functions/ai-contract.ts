/**
 * AI Contract Functions - Edge Function compatibility
 * Provides AI-powered contract assistance:
 * - improve_subject: Improve contract subject text
 * - propose_budget: Propose budget based on subject
 * - search_cpv: Suggest CPV codes
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  createAIGateway,
  type AIGatewayService,
} from "../../services/ai-gateway/index.js";

interface AIContractBody {
  type: "improve_subject" | "propose_budget" | "search_cpv";
  subject: string;
  contractType?: string;
  unit?: string;
  department?: string;
}

let aiGateway: AIGatewayService | null = null;

function getAIGateway(): AIGatewayService {
  aiGateway ??= createAIGateway();
  return aiGateway;
}

function optionalField(value: string | undefined, label: string): string {
  return value !== undefined && value !== "" ? `${label}: ${value}` : "";
}

// Prompts in Spanish because they generate Spanish content for the user interface
const SYSTEM_PROMPT_IMPROVE_SUBJECT = `Eres un experto en contratación pública española (LCSP 9/2017). 
Tu tarea es mejorar el objeto de un contrato para que sea más claro, preciso y cumpla con los requisitos legales.

IMPORTANTE: Responde SOLO con un JSON válido, sin texto adicional ni markdown.

Ejemplo de respuesta correcta:
{
  "improvedSubject": "Suministro de cinco (5) pistolas semiautomáticas reglamentarias homologadas por el Ministerio del Interior, junto con munición de dotación para prácticas y servicio, con destino a la Policía Local del Ayuntamiento, incluyendo formación inicial en su manejo y mantenimiento preventivo durante el período de garantía.",
  "improvements": ["Mejora 1 aplicada", "Mejora 2 aplicada"],
  "recommendations": ["Recomendación adicional"],
  "legalBasis": [
    {
      "article": "99",
      "title": "Objeto del contrato",
      "url": "https://www.boe.es/buscar/act.php?id=BOE-A-2017-12902#a99",
      "relevance": "Define los requisitos del objeto"
    }
  ]
}

CRÍTICO: 
1. El campo "improvedSubject" es OBLIGATORIO y debe contener el texto completo y mejorado del objeto del contrato en español.
2. NO dejes "improvedSubject" vacío bajo ninguna circunstancia.
3. El texto de "improvedSubject" debe ser una versión mejorada y más técnica del objeto original.`;

const SYSTEM_PROMPT_BUDGET = `Eres un experto en presupuestos de contratación pública española.
Tu tarea es proponer un presupuesto realista basado en precios de mercado para el objeto del contrato.

IMPORTANTE: Responde SOLO con un JSON válido, sin texto adicional ni markdown.

El JSON debe tener esta estructura exacta:
{
  "items": [
    {
      "concept": "Descripción de la partida",
      "unit": "ud/hora/mes/etc",
      "quantity": 1,
      "unitPrice": 100.00,
      "subtotal": 100.00
    }
  ],
  "totalExcludingVat": 0,
  "sources": [
    {
      "title": "Nombre de la fuente de precios",
      "url": "https://...",
      "description": "Descripción de la fuente"
    }
  ],
  "priceSources": "Descripción general de las fuentes utilizadas",
  "remarks": "Observaciones adicionales"
}`;

const SYSTEM_PROMPT_CPV = `Eres un experto en clasificación CPV (Common Procurement Vocabulary) para contratación pública.
Tu tarea es sugerir los códigos CPV más apropiados para el objeto del contrato.

IMPORTANTE: Responde SOLO con un JSON válido, sin texto adicional ni markdown.

El JSON debe tener esta estructura exacta:
{
  "codes": [
    {
      "code": "XXXXXXXX-X",
      "description": "Descripción oficial del código CPV",
      "relevance": 95,
      "justification": "Por qué este código es apropiado"
    }
  ],
  "remarks": "Observaciones adicionales sobre la clasificación"
}`;

export default async function aiContractRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.post("/ai-contract", {
    preValidation: [app.authAccessToken],
    schema: {
      body: {
        type: "object",
        required: ["type", "subject"],
        properties: {
          type: {
            type: "string",
            enum: ["improve_subject", "propose_budget", "search_cpv"],
          },
          subject: { type: "string", minLength: 10 },
          contractType: { type: "string" },
          unit: { type: "string" },
          department: { type: "string" },
        },
      },
    },
    handler: async (
      request: FastifyRequest<{ Body: AIContractBody }>,
      reply: FastifyReply,
    ) => {
      const { type, subject, contractType, unit, department } = request.body;

      try {
        const gateway = getAIGateway();
        let systemPrompt: string;
        let userPrompt: string;

        switch (type) {
          case "improve_subject":
            systemPrompt = SYSTEM_PROMPT_IMPROVE_SUBJECT;
            userPrompt = `Mejora el siguiente objeto de contrato:

OBJETO: ${subject}
TIPO DE CONTRATO: ${contractType ?? "servicios"}
${optionalField(unit, "UNIDAD CONTRATANTE")}
${optionalField(department, "ÓRGANO DE CONTRATACIÓN")}

Recuerda responder SOLO con JSON válido.`;
            break;

          case "propose_budget":
            systemPrompt = SYSTEM_PROMPT_BUDGET;
            userPrompt = `Propón un presupuesto realista para el siguiente objeto de contrato:

OBJETO: ${subject}
TIPO DE CONTRATO: ${contractType ?? "servicios"}

Recuerda responder SOLO con JSON válido.`;
            break;

          case "search_cpv":
            systemPrompt = SYSTEM_PROMPT_CPV;
            userPrompt = `Sugiere los códigos CPV más apropiados para el siguiente objeto de contrato:

OBJETO: ${subject}
TIPO DE CONTRATO: ${contractType ?? "servicios"}

Recuerda responder SOLO con JSON válido.`;
            break;

          default:
            return reply
              .status(400)
              .send({ error: `Invalid operation type: ${type}` });
        }

        const response = await gateway.completeSimple(systemPrompt, userPrompt);

        console.log("[AI-Contract] Raw AI response:", response);

        let result;
        try {
          const cleanResponse = response
            .replace(/```json\n?/g, "")
            .replace(/```\n?/g, "")
            .trim();
          console.log("[AI-Contract] Cleaned response:", cleanResponse);
          result = JSON.parse(cleanResponse);
          console.log("[AI-Contract] Parsed result:", JSON.stringify(result, null, 2));
          console.log("[AI-Contract] improvedSubject value:", result.improvedSubject);
        } catch {
          console.error("[AI-Contract] Failed to parse AI response:", response);
          return reply.status(500).send({
            error: "Error processing AI response",
            details: "Response is not valid JSON",
          });
        }

        return reply.send(result);
      } catch (error) {
        console.error("[AI-Contract] Error:", error);
        return reply.status(500).send({
          error: "Error processing AI request",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  });
}
