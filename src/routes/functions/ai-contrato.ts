/**
 * AI Contrato Functions - Edge Function compatibility
 * Provides AI-powered contract assistance:
 * - mejorar_objeto: Improve contract object text
 * - proponer_presupuesto: Propose budget based on object
 * - buscar_cpv: Suggest CPV codes
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  createAIGateway,
  type AIGatewayService,
} from "../../services/ai-gateway/index.js";

interface AIContratoBody {
  type: "mejorar_objeto" | "proponer_presupuesto" | "buscar_cpv";
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

const SYSTEM_PROMPT_MEJORAR_OBJETO = `Eres un experto en contratación pública española (LCSP 9/2017). 
Tu tarea es mejorar el objeto de un contrato para que sea más claro, preciso y cumpla con los requisitos legales.

IMPORTANTE: Responde SOLO con un JSON válido, sin texto adicional ni markdown.

El JSON debe tener esta estructura exacta:
{
  "objetoMejorado": "AQUÍ VA EL TEXTO COMPLETO MEJORADO DEL OBJETO DEL CONTRATO (obligatorio, no puede estar vacío)",
  "mejoras": ["mejora 1", "mejora 2", ...],
  "recomendaciones": ["recomendación 1", ...],
  "fundamentosLegales": [
    {
      "articulo": "99",
      "titulo": "Título del artículo",
      "url": "https://www.boe.es/buscar/act.php?id=BOE-A-2017-12902&p=20231222&tn=1#a99",
      "relevancia": "Por qué es relevante"
    }
  ]
}

CRÍTICO: El campo "objetoMejorado" DEBE contener el texto completo y mejorado del objeto del contrato. NO lo dejes vacío.`;

const SYSTEM_PROMPT_PRESUPUESTO = `Eres un experto en presupuestos de contratación pública española.
Tu tarea es proponer un presupuesto realista basado en precios de mercado para el objeto del contrato.

IMPORTANTE: Responde SOLO con un JSON válido, sin texto adicional ni markdown.

El JSON debe tener esta estructura exacta:
{
  "partidas": [
    {
      "concepto": "Descripción de la partida",
      "unidad": "ud/hora/mes/etc",
      "cantidad": 1,
      "precioUnitario": 100.00,
      "subtotal": 100.00
    }
  ],
  "totalSinIva": 0,
  "fuentes": [
    {
      "titulo": "Nombre de la fuente de precios",
      "url": "https://...",
      "descripcion": "Descripción de la fuente"
    }
  ],
  "fuentePrecios": "Descripción general de las fuentes utilizadas",
  "observaciones": "Observaciones adicionales"
}`;

const SYSTEM_PROMPT_CPV = `Eres un experto en clasificación CPV (Common Procurement Vocabulary) para contratación pública.
Tu tarea es sugerir los códigos CPV más apropiados para el objeto del contrato.

IMPORTANTE: Responde SOLO con un JSON válido, sin texto adicional ni markdown.

El JSON debe tener esta estructura exacta:
{
  "codigos": [
    {
      "codigo": "XXXXXXXX-X",
      "descripcion": "Descripción oficial del código CPV",
      "relevancia": 95,
      "justificacion": "Por qué este código es apropiado"
    }
  ],
  "observaciones": "Observaciones adicionales sobre la clasificación"
}`;

export default async function aiContratoRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.post("/ai-contrato", {
    preValidation: [app.authAccessToken],
    schema: {
      body: {
        type: "object",
        required: ["type", "subject"],
        properties: {
          type: {
            type: "string",
            enum: ["mejorar_objeto", "proponer_presupuesto", "buscar_cpv"],
          },
          subject: { type: "string", minLength: 10 },
          contractType: { type: "string" },
          unit: { type: "string" },
          department: { type: "string" },
        },
      },
    },
    handler: async (
      request: FastifyRequest<{ Body: AIContratoBody }>,
      reply: FastifyReply,
    ) => {
      const { type, subject, contractType, unit, department } = request.body;

      try {
        const gateway = getAIGateway();
        let systemPrompt: string;
        let userPrompt: string;

        switch (type) {
          case "mejorar_objeto":
            systemPrompt = SYSTEM_PROMPT_MEJORAR_OBJETO;
            userPrompt = `Mejora el siguiente objeto de contrato:

OBJETO: ${subject}
TIPO DE CONTRATO: ${contractType ?? "servicios"}
${optionalField(unit, "UNIDAD CONTRATANTE")}
${optionalField(department, "ÓRGANO DE CONTRATACIÓN")}

Recuerda responder SOLO con JSON válido.`;
            break;

          case "proponer_presupuesto":
            systemPrompt = SYSTEM_PROMPT_PRESUPUESTO;
            userPrompt = `Propón un presupuesto realista para el siguiente objeto de contrato:

OBJETO: ${subject}
TIPO DE CONTRATO: ${contractType ?? "servicios"}

Recuerda responder SOLO con JSON válido.`;
            break;

          case "buscar_cpv":
            systemPrompt = SYSTEM_PROMPT_CPV;
            userPrompt = `Sugiere los códigos CPV más apropiados para el siguiente objeto de contrato:

OBJETO: ${subject}
TIPO DE CONTRATO: ${contractType ?? "servicios"}

Recuerda responder SOLO con JSON válido.`;
            break;

          default:
            return reply
              .status(400)
              .send({ error: `Tipo de operación no válido: ${type}` });
        }

        const response = await gateway.completeSimple(systemPrompt, userPrompt);

        let result;
        try {
          const cleanResponse = response
            .replace(/```json\n?/g, "")
            .replace(/```\n?/g, "")
            .trim();
          result = JSON.parse(cleanResponse);
        } catch {
          console.error("[AI-Contrato] Failed to parse AI response:", response);
          return reply.status(500).send({
            error: "Error al procesar la respuesta de IA",
            details: "La respuesta no es JSON válido",
          });
        }

        return reply.send(result);
      } catch (error) {
        console.error("[AI-Contrato] Error:", error);
        return reply.status(500).send({
          error: "Error al procesar la solicitud de IA",
          details: error instanceof Error ? error.message : "Error desconocido",
        });
      }
    },
  });
}
