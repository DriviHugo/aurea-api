/**
 * AI Analysis Functions - Contract Analysis Endpoints
 * Provides AI-powered analysis for public procurement contracts:
 * - ai-analyze-cpv: CPV code suggestion
 * - ai-analyze-contract-type: Contract type recommendation
 * - ai-analyze-emergency: Emergency situation analysis
 * - ai-analyze-centralization: Centralized procurement analysis
 * - ai-analyze-own-means: Own means analysis
 * - ai-analyze-subscription: Subscription analysis
 * - ai-analyze-innovation: Innovation analysis
 * - ai-analyze-duration: Duration estimation
 * - ai-analyze-lots: Lot division analysis
 * - ai-analyze-budget-items: Budget items analysis
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { getProductionGateway } from "../../services/ai-gateway/production-gateway.js";
import { buildCatalogContext } from "../private/centralization.routes.js";
import type { FallbackAIGatewayService } from "../../services/ai-gateway/fallback-gateway.service.js";
import type { AICompletionResponse } from "../../services/ai-gateway/types.js";
import logger from "../../config/logger.js";
import { logAICall } from "./log-ai-call.js";
import type { PrismaClient } from "@prisma/client";

let aiGateway: FallbackAIGatewayService | null = null;

function getAIGateway(): FallbackAIGatewayService {
  aiGateway ??= getProductionGateway();
  return aiGateway;
}

// Suffix appended to every user prompt to reinforce JSON-only output.
// ALIA tends to ignore system-prompt instructions and produce markdown instead.
const JSON_SUFFIX = `

INSTRUCCIÓN CRÍTICA: Tu respuesta debe ser ÚNICAMENTE un objeto JSON válido.
NO incluyas texto explicativo, markdown, encabezados ni comentarios.
Empieza tu respuesta directamente con { y termina con }.`;

// System prompts for each analysis type
const PROMPTS = {
  cpv: `Eres un clasificador CPV automático. Respondes EXCLUSIVAMENTE con JSON.
Tu única función es devolver un JSON con códigos CPV para contratación pública española.
NUNCA escribas texto, explicaciones, markdown ni encabezados. Solo JSON puro.
Formato exacto de respuesta:
{"codes":[{"code":"XXXXXXXX-X","description":"Descripción","isPrimary":true,"relevance":95,"justification":"Razón"}],"observations":""}`,

  tipo: `Eres un clasificador de tipos de contrato. Respondes EXCLUSIVAMENTE con JSON.
Tu única función es devolver un JSON indicando el tipo de contrato según la LCSP 9/2017.
NUNCA escribas texto, explicaciones, markdown ni encabezados. Solo JSON puro.
Tipos válidos: "obras" | "servicios" | "suministros" | "concesion_obras" | "concesion_servicios" | "administrativo_especial" | "privado"
Formato exacto de respuesta:
{"recommendedType":"servicios","justification":"Razón","lcspArticles":["Art. 17"],"alternatives":[{"type":"suministros","reason":"Motivo"}]}`,

  emergencia: `Eres un evaluador de emergencias contractuales. Respondes EXCLUSIVAMENTE con JSON.
Tu única función es evaluar si un contrato justifica tramitación de emergencia según Art. 120 LCSP.
NUNCA escribas texto, explicaciones, markdown ni encabezados. Solo JSON puro.
Criterios: catástrofes, grave peligro, defensa nacional.
Formato exacto de respuesta:
{"isEmergency":false,"emergencyProbability":"nula","justification":"Razón","warnings":[],"missingRequirements":[]}`,

  centralizacion: `Eres un evaluador de contratación centralizada. Respondes EXCLUSIVAMENTE con JSON.
Tu única función es evaluar si un contrato está cubierto por instrumentos centralizados (DGRCC).
NUNCA escribas texto, explicaciones, markdown ni encabezados. Solo JSON puro.

IDs válidos para el campo instrumentId (usa EXACTAMENTE uno de estos o null):
AM_COMBUSTIBLES, AM_ELECTRICIDAD, AM_EQUIPOS_AUDIOVISUALES, AM_IMPRESORAS, AM_MATERIAL_OFICINA,
AM_MOTOCICLETAS, AM_MUEBLES, AM_MUEBLES_COMPRA_DIRECTA, AM_ORDENADORES_PUESTO_TRABAJO,
AM_PAPEL, AM_PUBLICIDAD_INSTITUCIONAL, AM_SISTEMAS_SEGURIDAD, AM_TURISMOS,
AM_VEHICULOS_COMERCIALES_LIGEROS, SDA_COMUNICACIONES_SERVIDORES_ALMACENAMIENTO,
SDA_SERVICIOS_DESARROLLO, SDA_SUMINISTRO_SOFTWARE, CC_AGENCIA_VIAJES, CC_CONTROL_PUBLICIDAD,
CC_LIMPIEZA_EDIFICIOS, CC_POSTALES_CERTIFICADAS, CC_POSTALES_NOTIFICACION,
CC_POSTALES_PAQUETERIA_VALIJA, CC_SEGURIDAD_EDIFICIOS, CC_TELECOM_FASE_2,
ENCARGO_SERVICIOS_ELECTRONICOS_CONFIANZA.
Si no hay coincidencia clara, instrumentId DEBE ser null (nunca inventes un ID).

Formato cuando NO aplica:
{"applies":false,"instrumentId":null,"inCentralizedProcurement":false,"inFrameworkAgreement":false,"recommendedLot":null,"recommendedModality":null,"modalityJustification":"","recommendation":"Razón"}
Formato cuando SÍ aplica (ejemplo AM con lotes):
{"applies":true,"instrumentId":"AM_MUEBLES","inCentralizedProcurement":false,"inFrameworkAgreement":true,"recommendedLot":{"numero":"1","ambito":"Península"},"recommendedModality":"B","modalityJustification":"Justificación","recommendation":"Razón"}`,

  mediopropio: `Eres un evaluador de medios propios. Respondes EXCLUSIVAMENTE con JSON.
Tu única función es evaluar si un contrato podría ser prestado por un medio propio (Arts. 32-33 LCSP).
NUNCA escribas texto, explicaciones, markdown ni encabezados. Solo JSON puro.
Formato exacto de respuesta:
{"ownMeansExists":false,"probability":"nula","suggestedOwnMeans":[],"justification":"Razón","requirementsToVerify":[]}`,

  subscripcion: `Eres un evaluador de suscripciones. Respondes EXCLUSIVAMENTE con JSON.
Tu única función es evaluar si un contrato tiene características de suscripción o servicio recurrente.
NUNCA escribas texto, explicaciones, markdown ni encabezados. Solo JSON puro.
Formato exacto de respuesta:
{"isSubscription":false,"probability":"nula","recurrenceType":"no_aplica","subscriptionCategory":null,"justification":"Razón","estimatedValueImplications":"","suggestedDuration":{"minMonths":12,"maxMonths":48,"recommendedMonths":24}}`,

  innovacion: `Eres un evaluador de innovación. Respondes EXCLUSIVAMENTE con JSON.
Tu única función es evaluar el nivel de innovación requerido para un contrato público.
NUNCA escribas texto, explicaciones, markdown ni encabezados. Solo JSON puro.
Niveles: "existe" | "requiere_adaptacion" | "no_existe"
Formato exacto de respuesta:
{"innovationLevel":"existe","justification":"Razón","recommendations":[],"suggestedProcedures":[]}`,

  duracion: `Eres un estimador de plazos contractuales. Respondes EXCLUSIVAMENTE con JSON.
NUNCA escribas texto, explicaciones, markdown ni encabezados. Solo JSON puro.
Formato exacto de respuesta:
{"months":12,"extensionMonths":12,"justification":"Razón con artículos LCSP"}`,

  lotes: `Eres un evaluador de división en lotes. Respondes EXCLUSIVAMENTE con JSON.
Evalúa según Art. 99.3 LCSP (favorecer PYMES, naturaleza divisible, evitar monopolio).
NUNCA escribas texto, explicaciones, markdown ni encabezados. Solo JSON puro.
Formato exacto de respuesta:
{"recommendsDivision":false,"justification":"Razón","lots":[]}`,

  partidas: `Eres un presupuestador de contratos públicos. Respondes EXCLUSIVAMENTE con JSON.
NUNCA escribas texto, explicaciones, markdown ni encabezados. Solo JSON puro.
Formato exacto de respuesta:
{"items":[{"lotNumber":1,"concept":"Descripción","quantity":1,"unitPrice":1000.00,"costType":"fijo","periodicity":null}]}`,
};

interface AnalysisLogContext {
  prisma: PrismaClient;
  userId?: string | null;
  inputVariables?: Record<string, unknown>;
}

// Generic analysis handler - returns parsed JSON merged with _meta (provider info)
// The _meta field is added to every analysis response so the frontend can show
// which AI provider (ALIA, Claude, etc.) generated each analysis step.
async function handleAnalysis(
  gateway: FallbackAIGatewayService,
  systemPrompt: string,
  userPrompt: string,
  analysisName: string,
  logCtx?: AnalysisLogContext,
): Promise<Record<string, unknown>> {
  const startTime = Date.now();
  const response: AICompletionResponse = await gateway.completeWithMeta(
    systemPrompt,
    userPrompt + JSON_SUFFIX,
  );

  const durationMs = Date.now() - startTime;

  const buildMeta = () => ({
    provider: response.provider,
    model: response.model,
    tokensUsed: response.usage.totalTokens,
    generationTimeMs: durationMs,
  });

  try {
    const parsed = extractJson(response.content);
    const result = { ...parsed, _meta: buildMeta() };

    // Persist log so the AI monitoring tab shows data (fire-and-forget)
    if (logCtx) {
      logAICall({
        prisma: logCtx.prisma,
        functionCode: `ai-analysis.${analysisName}`,
        functionName: `AI Analysis – ${analysisName}`,
        providerName: response.provider,
        model: response.model,
        systemPrompt,
        userPrompt,
        inputVariables: logCtx.inputVariables ?? {},
        response: parsed,
        tokensInput: response.usage?.promptTokens ?? null,
        tokensOutput: response.usage?.completionTokens ?? null,
        durationMs,
        status: "success",
        userId: logCtx.userId ?? null,
      });
    }

    return result;
  } catch (parseErr) {
    logger.error({
      msg: `[AI-Analysis] Failed to parse ${analysisName} response`,
      error: (parseErr as Error).message,
      responseContent: response.content.substring(0, 500),
    });

    // Log the error too
    if (logCtx) {
      logAICall({
        prisma: logCtx.prisma,
        functionCode: `ai-analysis.${analysisName}`,
        functionName: `AI Analysis – ${analysisName}`,
        providerName: response.provider,
        model: response.model,
        systemPrompt,
        userPrompt,
        inputVariables: logCtx.inputVariables ?? {},
        tokensInput: response.usage?.promptTokens ?? null,
        tokensOutput: response.usage?.completionTokens ?? null,
        durationMs,
        status: "error",
        errorMessage: (parseErr as Error).message,
        userId: logCtx.userId ?? null,
      });
    }

    throw new Error(
      `Error al procesar la respuesta de IA para ${analysisName}`,
    );
  }
}

/**
 * Extract a JSON object from AI response text.
 * Handles: pure JSON, markdown code blocks, JSON wrapped in explanatory text,
 * and truncated JSON (attempts to close open braces/brackets).
 */
function extractJson(text: string): Record<string, unknown> {
  // Strip markdown code fences
  let clean = text
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

  // 1. Try direct parse
  try {
    return JSON.parse(clean) as Record<string, unknown>;
  } catch {
    /* continue */
  }

  // 2. Find the first { and extract balanced JSON
  const startIdx = clean.indexOf("{");
  if (startIdx === -1) throw new Error("No JSON object found in response");

  // Extract from first { to matching }, handling nesting
  let depth = 0;
  let inString = false;
  let escape = false;
  let endIdx = -1;

  for (let i = startIdx; i < clean.length; i++) {
    const ch = clean[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{") depth++;
    if (ch === "}") {
      depth--;
      if (depth === 0) {
        endIdx = i;
        break;
      }
    }
  }

  if (endIdx !== -1) {
    // Found balanced braces
    try {
      return JSON.parse(clean.substring(startIdx, endIdx + 1)) as Record<
        string,
        unknown
      >;
    } catch {
      /* continue to truncation repair */
    }
  }

  // 3. JSON is truncated (ALIA hit token limit) — try to close it
  let truncated = clean.substring(startIdx);
  // Remove any trailing incomplete string value
  truncated = truncated.replace(/,\s*"[^"]*"?\s*:\s*"[^"]*$/, "");
  truncated = truncated.replace(/,\s*"[^"]*$/, "");
  // Close open brackets/braces
  const openBraces =
    (truncated.match(/{/g) || []).length - (truncated.match(/}/g) || []).length;
  const openBrackets =
    (truncated.match(/\[/g) || []).length -
    (truncated.match(/]/g) || []).length;
  for (let i = 0; i < openBrackets; i++) truncated += "]";
  for (let i = 0; i < openBraces; i++) truncated += "}";

  try {
    return JSON.parse(truncated) as Record<string, unknown>;
  } catch {
    throw new Error("No valid JSON object found in response");
  }
}

function optionalField(value: string | undefined, label: string): string {
  return value !== undefined && value !== "" ? `${label}: ${value}` : "";
}

function normalizeAnalysisBody(body: Record<string, unknown>) {
  return {
    subject: (body["subject"] || "") as string,
    unit: body["unit"] as string | undefined,
    department: body["department"] as string | undefined,
    mainCpv: body["mainCpv"] as string | undefined,
    contractType: body["contractType"] as string | undefined,
    numLots: body["numLots"] as number | undefined,
    lots: body["lots"] as LotInfo[] | undefined,
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
}

interface BudgetAnalysisBody extends BaseAnalysisBody {
  mainCpv?: string;
  contractType?: string;
}

interface LotInfo {
  number: number;
  name: string;
  percentage: number;
}

interface PartidasBody extends BudgetAnalysisBody {
  numLots?: number;
  lots?: LotInfo[];
}

export default async function aiAnalysisRoutes(
  app: FastifyInstance,
): Promise<void> {
  // CPV Analysis
  app.post("/ai-analyze-cpv", {
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
          {
            prisma: app.prisma,
            userId: req.userId,
            inputVariables: { subject, unit, department },
          },
        );
        return reply.send(result);
      } catch (error) {
        return reply.status(500).send({ error: (error as Error).message });
      }
    },
  });

  // Contract Type Analysis
  app.post("/ai-analyze-contract-type", {
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
          {
            prisma: app.prisma,
            userId: req.userId,
            inputVariables: { subject, unit, department, mainCpv },
          },
        );
        return reply.send(result);
      } catch (error) {
        return reply.status(500).send({ error: (error as Error).message });
      }
    },
  });

  // Emergency Analysis
  app.post("/ai-analyze-emergency", {
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
          {
            prisma: app.prisma,
            userId: req.userId,
            inputVariables: { subject, unit, department },
          },
        );
        return reply.send(result);
      } catch (error) {
        return reply.status(500).send({ error: (error as Error).message });
      }
    },
  });

  // Centralization Analysis
  app.post("/ai-analyze-centralization", {
    preValidation: [app.authAccessToken],
    handler: async (
      req: FastifyRequest<{ Body: BaseAnalysisBody }>,
      reply: FastifyReply,
    ) => {
      const { subject, unit, department } = normalizeAnalysisBody(
        req.body as Record<string, unknown>,
      );
      const catalogContext = buildCatalogContext();
      const userPrompt = `${catalogContext}

Analiza si el siguiente objeto de contrato podría estar cubierto por contratación centralizada (DGRCC):

OBJETO: ${subject}
${optionalField(unit, "UNIDAD")}
${optionalField(department, "ÓRGANO")}`;

      try {
        const result = await handleAnalysis(
          getAIGateway(),
          PROMPTS.centralizacion,
          userPrompt,
          "Centralización",
          {
            prisma: app.prisma,
            userId: req.userId,
            inputVariables: { subject, unit, department },
          },
        );
        return reply.send(result);
      } catch (error) {
        return reply.status(500).send({ error: (error as Error).message });
      }
    },
  });

  // Medio Propio Analysis
  app.post("/ai-analyze-own-means", {
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
          {
            prisma: app.prisma,
            userId: req.userId,
            inputVariables: { subject, unit, department },
          },
        );
        return reply.send(result);
      } catch (error) {
        return reply.status(500).send({ error: (error as Error).message });
      }
    },
  });

  // Subscription Analysis
  app.post("/ai-analyze-subscription", {
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
          {
            prisma: app.prisma,
            userId: req.userId,
            inputVariables: { subject, unit, department, mainCpv },
          },
        );
        return reply.send(result);
      } catch (error) {
        return reply.status(500).send({ error: (error as Error).message });
      }
    },
  });

  // Innovation Analysis
  app.post("/ai-analyze-innovation", {
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
          {
            prisma: app.prisma,
            userId: req.userId,
            inputVariables: { subject, unit, department, mainCpv },
          },
        );
        return reply.send(result);
      } catch (error) {
        return reply.status(500).send({ error: (error as Error).message });
      }
    },
  });

  // Duration Analysis
  app.post("/ai-analyze-duration", {
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
          {
            prisma: app.prisma,
            userId: req.userId,
            inputVariables: { subject, contractType, mainCpv },
          },
        );
        return reply.send(result);
      } catch (error) {
        return reply.status(500).send({ error: (error as Error).message });
      }
    },
  });

  // Lots Analysis
  app.post("/ai-analyze-lots", {
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
          {
            prisma: app.prisma,
            userId: req.userId,
            inputVariables: { subject, contractType, mainCpv },
          },
        );
        return reply.send(result);
      } catch (error) {
        return reply.status(500).send({ error: (error as Error).message });
      }
    },
  });

  // Budget Items Analysis
  app.post("/ai-analyze-budget-items", {
    preValidation: [app.authAccessToken],
    handler: async (
      req: FastifyRequest<{ Body: PartidasBody }>,
      reply: FastifyReply,
    ) => {
      const { subject, contractType, mainCpv, numLots, lots } =
        normalizeAnalysisBody(req.body as Record<string, unknown>);
      let userPrompt = `Propón las partidas presupuestarias para:

OBJETO: ${subject}
${optionalField(contractType, "TIPO")}
${optionalField(mainCpv, "CPV PRINCIPAL")}`;

      if (numLots !== undefined && numLots > 1 && lots !== undefined) {
        userPrompt += `\n\nDIVISIÓN EN ${numLots} LOTES:
    ${lots.map((l) => `- Lote ${l.number}: ${l.name} (${l.percentage}%)`).join("\n")}

    Asigna las partidas al lote correspondiente usando el campo lotNumber.`;
      }

      try {
        const result = await handleAnalysis(
          getAIGateway(),
          PROMPTS.partidas,
          userPrompt,
          "Partidas",
          {
            prisma: app.prisma,
            userId: req.userId,
            inputVariables: { subject, contractType, mainCpv, numLots },
          },
        );
        return reply.send(result);
      } catch (error) {
        return reply.status(500).send({ error: (error as Error).message });
      }
    },
  });
}
