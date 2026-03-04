/**
 * AI Analysis Functions - Contract Analysis Endpoints
 * Provides AI-powered analysis for public procurement contracts:
 * - ai-analizar-cpv: CPV code suggestion
 * - ai-analizar-tipo: Contract type recommendation
 * - ai-analizar-emergencia: Emergency situation analysis
 * - ai-analizar-centralizacion: Centralized procurement analysis
 * - ai-analizar-medio-propio: Own means analysis
 * - ai-analizar-subscripcion: Subscription analysis
 * - ai-analizar-innovacion: Innovation analysis
 * - ai-analizar-duracion: Duration estimation
 * - ai-analizar-lotes: Lot division analysis
 * - ai-analizar-partidas: Budget items analysis
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { getProductionGateway } from "../../services/ai-gateway/production-gateway.js";
import type { FallbackAIGatewayService } from "../../services/ai-gateway/fallback-gateway.service.js";
import type { AICompletionResponse } from "../../services/ai-gateway/types.js";

let aiGateway: FallbackAIGatewayService | null = null;

function getAIGateway(): FallbackAIGatewayService {
  aiGateway ??= getProductionGateway();
  return aiGateway;
}

// System prompts for each analysis type
const PROMPTS = {
  cpv: `Eres un experto en clasificación CPV (Common Procurement Vocabulary) para contratación pública española.
Analiza el objeto del contrato y sugiere los códigos CPV más apropiados.

IMPORTANTE: Responde SOLO con un JSON válido, sin texto adicional ni markdown.
{
  "codes": [
    {
      "code": "XXXXXXXX-X",
      "description": "Descripción oficial del código CPV",
      "isPrimary": true,
      "relevance": 95,
      "justification": "Por qué este código es apropiado"
    }
  ],
  "observations": "Observaciones adicionales"
}`,

  tipo: `Eres un experto en contratación pública española (LCSP 9/2017).
Determina el tipo de contrato más adecuado según el objeto.

Tipos válidos: "obras" | "servicios" | "suministros" | "concesion_obras" | "concesion_servicios" | "administrativo_especial" | "privado"

IMPORTANTE: Responde SOLO con un JSON válido.
{
  "recommendedType": "servicios",
  "justification": "Explicación detallada",
  "lcspArticles": ["Art. 17", "Art. 18"],
  "alternatives": [
    {
      "type": "suministros",
      "reason": "Podría considerarse si..."
    }
  ]
}`,

  emergencia: `Eres un experto en contratación pública española, especializado en el Art. 120 LCSP (tramitación de emergencia).
Analiza si el objeto del contrato podría justificar una tramitación de emergencia.

Criterios Art. 120 LCSP:
- Catástrofes, calamidades o similar
- Situaciones que supongan grave peligro
- Necesidades de defensa nacional

IMPORTANTE: Responde SOLO con un JSON válido.
{
  "isEmergency": false,
  "emergencyProbability": "nula",
  "justification": "Explicación detallada",
  "warnings": ["Advertencia si aplica"],
  "missingRequirements": ["Requisito que faltaría"]
}`,

  centralizacion: `Eres un experto en contratación centralizada del Estado español (DGRCC).
Analiza si el objeto del contrato podría estar cubierto por un instrumento de contratación centralizada.

Instrumentos disponibles: Acuerdos Marco (AM), Sistemas Dinámicos de Adquisición (SDA), Contrato Centralizado (CC).

IMPORTANTE: Responde SOLO con un JSON válido.
{
  "applies": false,
  "instrumentId": null,
  "inCentralizedProcurement": false,
  "inFrameworkAgreement": false,
  "recommendedLot": null,
  "recommendedModality": null,
  "modalityJustification": "",
  "recommendation": "Explicación detallada"
}`,

  mediopropio: `Eres un experto en encargos a medios propios personificados (Arts. 32-33 LCSP).
Analiza si el objeto del contrato podría ser prestado por un medio propio de la Administración.

IMPORTANTE: Responde SOLO con un JSON válido.
{
  "ownMeansExists": false,
  "probability": "nula",
  "suggestedOwnMeans": [],
  "justification": "Explicación detallada",
  "requirementsToVerify": ["Requisito a verificar"]
}`,

  subscripcion: `Eres un experto en contratos de suministro y servicios recurrentes según la LCSP.
Analiza si el objeto del contrato tiene características de suscripción o servicio recurrente.

IMPORTANTE: Responde SOLO con un JSON válido.
{
  "isSubscription": false,
  "probability": "nula",
  "recurrenceType": "no_aplica",
  "subscriptionCategory": null,
  "justification": "Explicación",
  "estimatedValueImplications": "Impacto en el valor estimado",
  "suggestedDuration": {
    "minMonths": 12,
    "maxMonths": 48,
    "recommendedMonths": 24
  }
}`,

  innovacion: `Eres un experto en compra pública de innovación y procedimientos especiales de la LCSP.
Analiza el nivel de innovación requerido para el objeto del contrato.

Niveles: "existe" (solución en mercado), "requiere_adaptacion" (adaptación necesaria), "no_existe" (desarrollo nuevo)

IMPORTANTE: Responde SOLO con un JSON válido.
{
  "innovationLevel": "existe",
  "justification": "Explicación detallada",
  "recommendations": ["Recomendación 1"],
  "suggestedProcedures": ["Abierto", "Licitación con negociación"]
}`,

  duracion: `Eres un experto en plazos de contratos públicos según la LCSP.
Estima la duración recomendada para el contrato según su tipo y objeto.

IMPORTANTE: Responde SOLO con un JSON válido.
{
  "months": 12,
  "extensionMonths": 12,
  "justification": "Explicación con referencia a artículos LCSP"
}`,

  lotes: `Eres un experto en división en lotes de contratos públicos (Art. 99.3 LCSP).
Analiza si el contrato debería dividirse en lotes.

Criterios Art. 99.3 LCSP:
- Favorecer participación de PYMES
- Naturaleza del objeto permite división
- Riesgo de monopolio

IMPORTANTE: Responde SOLO con un JSON válido.
{
  "recommendsDivision": false,
  "justification": "Explicación detallada",
  "lots": [
    {
      "number": 1,
      "name": "Nombre del lote",
      "description": "Descripción",
      "percentage": 50
    }
  ]
}`,

  partidas: `Eres un experto en presupuestación de contratos públicos.
Propón las partidas presupuestarias para el objeto del contrato.

IMPORTANTE: Responde SOLO con un JSON válido.
{
  "items": [
    {
      "lotNumber": 1,
      "concept": "Descripción de la partida",
      "quantity": 1,
      "unitPrice": 1000.00,
      "costType": "fijo",
      "periodicity": null
    }
  ]
}`,
};

// Generic analysis handler - returns parsed JSON merged with _meta (provider info)
// The _meta field is added to every analysis response so the frontend can show
// which AI provider (ALIA, Claude, etc.) generated each analysis step.
async function handleAnalysis(
  gateway: FallbackAIGatewayService,
  systemPrompt: string,
  userPrompt: string,
  analysisName: string,
): Promise<Record<string, unknown>> {
  const startTime = Date.now();
  const response: AICompletionResponse = await gateway.completeWithMeta(
    systemPrompt,
    userPrompt,
  );

  try {
    const cleanResponse = response.content
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    const parsed = JSON.parse(cleanResponse) as Record<string, unknown>;
    // Merge AI metadata into the response so frontend can display provider badge
    return {
      ...parsed,
      _meta: {
        provider: response.provider,
        model: response.model,
        tokensUsed: response.usage.totalTokens,
        generationTimeMs: Date.now() - startTime,
      },
    };
  } catch {
    console.error(
      `[AI-Analysis] Failed to parse ${analysisName} response:`,
      response.content,
    );
    throw new Error(
      `Error al procesar la respuesta de IA para ${analysisName}`,
    );
  }
}

function optionalField(value: string | undefined, label: string): string {
  return value !== undefined && value !== "" ? `${label}: ${value}` : "";
}

// Normalize field names: accept both Spanish (objeto/unidad/organo) and English (subject/unit/department)
function normalizeAnalysisBody(body: Record<string, unknown>) {
  return {
    subject: (body["subject"] || "") as string,
    unit: body["unit"] as string | undefined,
    department: body["department"] as string | undefined,
    mainCpv: (body["mainCpv"] || body["cpvPrincipal"]) as string | undefined,
    contractType: (body["contractType"] || body["tipoContrato"]) as
      | string
      | undefined,
    numLotes: body["numLotes"] as number | undefined,
    lotes: body["lotes"] as LoteInfo[] | undefined,
  };
}

// Base interface for analysis requests
interface BaseAnalysisBody {
  subject?: string;
  unit?: string;
  department?: string;
}

interface TipoAnalysisBody extends BaseAnalysisBody {
  mainCpv?: string;
  cpvPrincipal?: string;
}

interface BudgetAnalysisBody extends BaseAnalysisBody {
  mainCpv?: string;
  cpvPrincipal?: string;
  contractType?: string;
  tipoContrato?: string;
}

interface LoteInfo {
  numero: number;
  nombre: string;
  porcentaje: number;
}

interface PartidasBody extends BudgetAnalysisBody {
  numLotes?: number;
  lotes?: LoteInfo[];
}

export default async function aiAnalysisRoutes(
  app: FastifyInstance,
): Promise<void> {
  // CPV Analysis
  app.post("/ai-analizar-cpv", {
    preValidation: [app.authAccessToken],
    handler: async (
      req: FastifyRequest<{ Body: BaseAnalysisBody }>,
      reply: FastifyReply,
    ) => {
      const { subject, unit, department } = normalizeAnalysisBody(
        req.body as Record<string, unknown>,
      );
      const userPrompt = `Analiza el siguiente objeto de contrato y sugiere códigos CPV:

OBJETO: ${subject}
${optionalField(unit, "UNIDAD")}
${optionalField(department, "ÓRGANO")}`;

      try {
        const result = await handleAnalysis(
          getAIGateway(),
          PROMPTS.cpv,
          userPrompt,
          "CPV",
        );
        return reply.send(result);
      } catch (error) {
        return reply.status(500).send({ error: (error as Error).message });
      }
    },
  });

  // Contract Type Analysis
  app.post("/ai-analizar-tipo", {
    preValidation: [app.authAccessToken],
    handler: async (
      req: FastifyRequest<{ Body: TipoAnalysisBody }>,
      reply: FastifyReply,
    ) => {
      const { subject, unit, department, mainCpv } = normalizeAnalysisBody(
        req.body as Record<string, unknown>,
      );
      const userPrompt = `Determina el tipo de contrato para:

OBJETO: ${subject}
${optionalField(mainCpv, "CPV PRINCIPAL")}
${optionalField(unit, "UNIDAD")}
${optionalField(department, "ÓRGANO")}`;

      try {
        const result = await handleAnalysis(
          getAIGateway(),
          PROMPTS.tipo,
          userPrompt,
          "Tipo",
        );
        return reply.send(result);
      } catch (error) {
        return reply.status(500).send({ error: (error as Error).message });
      }
    },
  });

  // Emergency Analysis
  app.post("/ai-analizar-emergencia", {
    preValidation: [app.authAccessToken],
    handler: async (
      req: FastifyRequest<{ Body: BaseAnalysisBody }>,
      reply: FastifyReply,
    ) => {
      const { subject, unit, department } = normalizeAnalysisBody(
        req.body as Record<string, unknown>,
      );
      const userPrompt = `Analiza si el siguiente objeto de contrato podría justificar tramitación de emergencia (Art. 120 LCSP):

OBJETO: ${subject}
${optionalField(unit, "UNIDAD")}
${optionalField(department, "ÓRGANO")}`;

      try {
        const result = await handleAnalysis(
          getAIGateway(),
          PROMPTS.emergencia,
          userPrompt,
          "Emergencia",
        );
        return reply.send(result);
      } catch (error) {
        return reply.status(500).send({ error: (error as Error).message });
      }
    },
  });

  // Centralization Analysis
  app.post("/ai-analizar-centralizacion", {
    preValidation: [app.authAccessToken],
    handler: async (
      req: FastifyRequest<{ Body: BaseAnalysisBody }>,
      reply: FastifyReply,
    ) => {
      const { subject, unit, department } = normalizeAnalysisBody(
        req.body as Record<string, unknown>,
      );
      const userPrompt = `Analiza si el siguiente objeto de contrato podría estar cubierto por contratación centralizada (DGRCC):

OBJETO: ${subject}
${optionalField(unit, "UNIDAD")}
${optionalField(department, "ÓRGANO")}`;

      try {
        const result = await handleAnalysis(
          getAIGateway(),
          PROMPTS.centralizacion,
          userPrompt,
          "Centralización",
        );
        return reply.send(result);
      } catch (error) {
        return reply.status(500).send({ error: (error as Error).message });
      }
    },
  });

  // Medio Propio Analysis
  app.post("/ai-analizar-medio-propio", {
    preValidation: [app.authAccessToken],
    handler: async (
      req: FastifyRequest<{ Body: BaseAnalysisBody }>,
      reply: FastifyReply,
    ) => {
      const { subject, unit, department } = normalizeAnalysisBody(
        req.body as Record<string, unknown>,
      );
      const userPrompt = `Analiza si el siguiente objeto de contrato podría ser prestado por un medio propio (Arts. 32-33 LCSP):

OBJETO: ${subject}
${optionalField(unit, "UNIDAD")}
${optionalField(department, "ÓRGANO")}`;

      try {
        const result = await handleAnalysis(
          getAIGateway(),
          PROMPTS.mediopropio,
          userPrompt,
          "Medio Propio",
        );
        return reply.send(result);
      } catch (error) {
        return reply.status(500).send({ error: (error as Error).message });
      }
    },
  });

  // Subscription Analysis
  app.post("/ai-analizar-subscripcion", {
    preValidation: [app.authAccessToken],
    handler: async (
      req: FastifyRequest<{ Body: TipoAnalysisBody }>,
      reply: FastifyReply,
    ) => {
      const { subject, unit, department, mainCpv } = normalizeAnalysisBody(
        req.body as Record<string, unknown>,
      );
      const userPrompt = `Analiza si el siguiente objeto de contrato tiene características de suscripción:

OBJETO: ${subject}
${optionalField(mainCpv, "CPV PRINCIPAL")}
${optionalField(unit, "UNIDAD")}
${optionalField(department, "ÓRGANO")}`;

      try {
        const result = await handleAnalysis(
          getAIGateway(),
          PROMPTS.subscripcion,
          userPrompt,
          "Subscripción",
        );
        return reply.send(result);
      } catch (error) {
        return reply.status(500).send({ error: (error as Error).message });
      }
    },
  });

  // Innovation Analysis
  app.post("/ai-analizar-innovacion", {
    preValidation: [app.authAccessToken],
    handler: async (
      req: FastifyRequest<{ Body: TipoAnalysisBody }>,
      reply: FastifyReply,
    ) => {
      const { subject, unit, department, mainCpv } = normalizeAnalysisBody(
        req.body as Record<string, unknown>,
      );
      const userPrompt = `Analiza el nivel de innovación requerido para:

OBJETO: ${subject}
${optionalField(mainCpv, "CPV PRINCIPAL")}
${optionalField(unit, "UNIDAD")}
${optionalField(department, "ÓRGANO")}`;

      try {
        const result = await handleAnalysis(
          getAIGateway(),
          PROMPTS.innovacion,
          userPrompt,
          "Innovación",
        );
        return reply.send(result);
      } catch (error) {
        return reply.status(500).send({ error: (error as Error).message });
      }
    },
  });

  // Duration Analysis
  app.post("/ai-analizar-duracion", {
    preValidation: [app.authAccessToken],
    handler: async (
      req: FastifyRequest<{ Body: BudgetAnalysisBody }>,
      reply: FastifyReply,
    ) => {
      const { subject, contractType, mainCpv } = normalizeAnalysisBody(
        req.body as Record<string, unknown>,
      );
      const userPrompt = `Estima la duración recomendada para el contrato:

OBJETO: ${subject}
${optionalField(contractType, "TIPO")}
${optionalField(mainCpv, "CPV PRINCIPAL")}`;

      try {
        const result = await handleAnalysis(
          getAIGateway(),
          PROMPTS.duracion,
          userPrompt,
          "Duración",
        );
        return reply.send(result);
      } catch (error) {
        return reply.status(500).send({ error: (error as Error).message });
      }
    },
  });

  // Lots Analysis
  app.post("/ai-analizar-lotes", {
    preValidation: [app.authAccessToken],
    handler: async (
      req: FastifyRequest<{ Body: BudgetAnalysisBody }>,
      reply: FastifyReply,
    ) => {
      const { subject, contractType, mainCpv } = normalizeAnalysisBody(
        req.body as Record<string, unknown>,
      );
      const userPrompt = `Analiza si el contrato debería dividirse en lotes (Art. 99.3 LCSP):

OBJETO: ${subject}
${optionalField(contractType, "TIPO")}
${optionalField(mainCpv, "CPV PRINCIPAL")}`;

      try {
        const result = await handleAnalysis(
          getAIGateway(),
          PROMPTS.lotes,
          userPrompt,
          "Lotes",
        );
        return reply.send(result);
      } catch (error) {
        return reply.status(500).send({ error: (error as Error).message });
      }
    },
  });

  // Budget Items Analysis
  app.post("/ai-analizar-partidas", {
    preValidation: [app.authAccessToken],
    handler: async (
      req: FastifyRequest<{ Body: PartidasBody }>,
      reply: FastifyReply,
    ) => {
      const { subject, contractType, mainCpv, numLotes, lotes } =
        normalizeAnalysisBody(req.body as Record<string, unknown>);
      let userPrompt = `Propón las partidas presupuestarias para:

OBJETO: ${subject}
${optionalField(contractType, "TIPO")}
${optionalField(mainCpv, "CPV PRINCIPAL")}`;

      if (numLotes !== undefined && numLotes > 1 && lotes !== undefined) {
        userPrompt += `\n\nDIVISIÓN EN ${numLotes} LOTES:
${lotes.map((l) => `- Lote ${l.numero}: ${l.nombre} (${l.porcentaje}%)`).join("\n")}

Asigna las partidas al lote correspondiente usando el campo loteNumero.`;
      }

      try {
        const result = await handleAnalysis(
          getAIGateway(),
          PROMPTS.partidas,
          userPrompt,
          "Partidas",
        );
        return reply.send(result);
      } catch (error) {
        return reply.status(500).send({ error: (error as Error).message });
      }
    },
  });
}
