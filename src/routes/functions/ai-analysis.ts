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
import logger from "../../config/logger.js";

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
Instrumentos: Acuerdos Marco (AM), Sistemas Dinámicos de Adquisición (SDA), Contrato Centralizado (CC).
Formato exacto de respuesta:
{"applies":false,"instrumentId":null,"inCentralizedProcurement":false,"inFrameworkAgreement":false,"recommendedLot":null,"recommendedModality":null,"modalityJustification":"","recommendation":"Razón"}`,

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
    userPrompt + JSON_SUFFIX,
  );

  const buildMeta = () => ({
    provider: response.provider,
    model: response.model,
    tokensUsed: response.usage.totalTokens,
    generationTimeMs: Date.now() - startTime,
  });

  try {
    const parsed = extractJson(response.content);
    return { ...parsed, _meta: buildMeta() };
  } catch (parseErr) {
    logger.error({
      msg: `[AI-Analysis] Failed to parse ${analysisName} response`,
      error: (parseErr as Error).message,
      responseContent: response.content.substring(0, 500),
    });
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
  let clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  // 1. Try direct parse
  try {
    return JSON.parse(clean) as Record<string, unknown>;
  } catch { /* continue */ }

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
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") depth++;
    if (ch === "}") { depth--; if (depth === 0) { endIdx = i; break; } }
  }

  if (endIdx !== -1) {
    // Found balanced braces
    try {
      return JSON.parse(clean.substring(startIdx, endIdx + 1)) as Record<string, unknown>;
    } catch { /* continue to truncation repair */ }
  }

  // 3. JSON is truncated (ALIA hit token limit) — try to close it
  let truncated = clean.substring(startIdx);
  // Remove any trailing incomplete string value
  truncated = truncated.replace(/,\s*"[^"]*"?\s*:\s*"[^"]*$/, "");
  truncated = truncated.replace(/,\s*"[^"]*$/, "");
  // Close open brackets/braces
  const openBraces = (truncated.match(/{/g) || []).length - (truncated.match(/}/g) || []).length;
  const openBrackets = (truncated.match(/\[/g) || []).length - (truncated.match(/]/g) || []).length;
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
