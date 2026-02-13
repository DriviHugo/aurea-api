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
import {
  createAIGateway,
  type AIGatewayService,
} from "../../services/ai-gateway/index.js";

let aiGateway: AIGatewayService | null = null;

function getAIGateway(): AIGatewayService {
  aiGateway ??= createAIGateway();
  return aiGateway;
}

// System prompts for each analysis type
const PROMPTS = {
  cpv: `Eres un experto en clasificación CPV (Common Procurement Vocabulary) para contratación pública española.
Analiza el objeto del contrato y sugiere los códigos CPV más apropiados.

IMPORTANTE: Responde SOLO con un JSON válido, sin texto adicional ni markdown.
{
  "codigos": [
    {
      "codigo": "XXXXXXXX-X",
      "descripcion": "Descripción oficial del código CPV",
      "esPrincipal": true,
      "relevancia": 95,
      "justificacion": "Por qué este código es apropiado"
    }
  ],
  "observaciones": "Observaciones adicionales"
}`,

  tipo: `Eres un experto en contratación pública española (LCSP 9/2017).
Determina el tipo de contrato más adecuado según el objeto.

Tipos válidos: "obras" | "servicios" | "suministros" | "concesion_obras" | "concesion_servicios" | "administrativo_especial" | "privado"

IMPORTANTE: Responde SOLO con un JSON válido.
{
  "tipoRecomendado": "servicios",
  "justificacion": "Explicación detallada",
  "articulosLCSP": ["Art. 17", "Art. 18"],
  "alternativas": [
    {
      "tipo": "suministros",
      "motivo": "Podría considerarse si..."
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
  "esEmergencia": false,
  "probabilidadEmergencia": "nula",
  "justificacion": "Explicación detallada",
  "advertencias": ["Advertencia si aplica"],
  "requisitosFaltantes": ["Requisito que faltaría"]
}`,

  centralizacion: `Eres un experto en contratación centralizada del Estado español (DGRCC).
Analiza si el objeto del contrato podría estar cubierto por un instrumento de contratación centralizada.

Instrumentos disponibles: Acuerdos Marco (AM), Sistemas Dinámicos de Adquisición (SDA), Contrato Centralizado (CC).

IMPORTANTE: Responde SOLO con un JSON válido.
{
  "aplica": false,
  "instrumentoId": null,
  "enContratacionCentralizada": false,
  "enAcuerdoMarco": false,
  "loteRecomendado": null,
  "modalidadRecomendada": null,
  "justificacionModalidad": "",
  "recomendacion": "Explicación detallada"
}`,

  mediopropio: `Eres un experto en encargos a medios propios personificados (Arts. 32-33 LCSP).
Analiza si el objeto del contrato podría ser prestado por un medio propio de la Administración.

IMPORTANTE: Responde SOLO con un JSON válido.
{
  "existeMedioPropio": false,
  "probabilidad": "nula",
  "mediosPropiosSugeridos": [],
  "justificacion": "Explicación detallada",
  "requisitosVerificar": ["Requisito a verificar"]
}`,

  subscripcion: `Eres un experto en contratos de suministro y servicios recurrentes según la LCSP.
Analiza si el objeto del contrato tiene características de suscripción o servicio recurrente.

IMPORTANTE: Responde SOLO con un JSON válido.
{
  "esSubscripcion": false,
  "probabilidad": "nula",
  "tipoRecurrencia": "no_aplica",
  "categoriaSubscripcion": null,
  "justificacion": "Explicación",
  "implicacionesValorEstimado": "Impacto en el valor estimado",
  "duracionSugerida": {
    "mesesMinimo": 12,
    "mesesMaximo": 48,
    "mesesRecomendado": 24
  }
}`,

  innovacion: `Eres un experto en compra pública de innovación y procedimientos especiales de la LCSP.
Analiza el nivel de innovación requerido para el objeto del contrato.

Niveles: "existe" (solución en mercado), "requiere_adaptacion" (adaptación necesaria), "no_existe" (desarrollo nuevo)

IMPORTANTE: Responde SOLO con un JSON válido.
{
  "nivelInnovacion": "existe",
  "justificacion": "Explicación detallada",
  "recomendaciones": ["Recomendación 1"],
  "procedimientosSugeridos": ["Abierto", "Licitación con negociación"]
}`,

  duracion: `Eres un experto en plazos de contratos públicos según la LCSP.
Estima la duración recomendada para el contrato según su tipo y objeto.

IMPORTANTE: Responde SOLO con un JSON válido.
{
  "meses": 12,
  "prorrogasMeses": 12,
  "justificacion": "Explicación con referencia a artículos LCSP"
}`,

  lotes: `Eres un experto en división en lotes de contratos públicos (Art. 99.3 LCSP).
Analiza si el contrato debería dividirse en lotes.

Criterios Art. 99.3 LCSP:
- Favorecer participación de PYMES
- Naturaleza del objeto permite división
- Riesgo de monopolio

IMPORTANTE: Responde SOLO con un JSON válido.
{
  "recomendaDividir": false,
  "justificacion": "Explicación detallada",
  "lotes": [
    {
      "numero": 1,
      "nombre": "Nombre del lote",
      "descripcion": "Descripción",
      "porcentaje": 50
    }
  ]
}`,

  partidas: `Eres un experto en presupuestación de contratos públicos.
Propón las partidas presupuestarias para el objeto del contrato.

IMPORTANTE: Responde SOLO con un JSON válido.
{
  "partidas": [
    {
      "loteNumero": 1,
      "concepto": "Descripción de la partida",
      "cantidad": 1,
      "importe_unitario": 1000.00,
      "tipo_coste": "fijo",
      "periodicidad": null
    }
  ]
}`,
};

// Generic analysis handler
async function handleAnalysis(
  gateway: AIGatewayService,
  systemPrompt: string,
  userPrompt: string,
  analysisName: string,
): Promise<unknown> {
  const response = await gateway.completeSimple(systemPrompt, userPrompt);

  try {
    const cleanResponse = response
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    return JSON.parse(cleanResponse);
  } catch {
    console.error(
      `[AI-Analysis] Failed to parse ${analysisName} response:`,
      response,
    );
    throw new Error(
      `Error al procesar la respuesta de IA para ${analysisName}`,
    );
  }
}

function optionalField(value: string | undefined, label: string): string {
  return value !== undefined && value !== "" ? `${label}: ${value}` : "";
}

// Base interface for analysis requests
interface BaseAnalysisBody {
  objeto: string;
  unidad?: string;
  organo?: string;
}

interface TipoAnalysisBody extends BaseAnalysisBody {
  cpvPrincipal?: string;
}

interface BudgetAnalysisBody extends BaseAnalysisBody {
  cpvPrincipal?: string;
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
      const { objeto, unidad, organo } = req.body;
      const userPrompt = `Analiza el siguiente objeto de contrato y sugiere códigos CPV:

OBJETO: ${objeto}
${optionalField(unidad, "UNIDAD")}
${optionalField(organo, "ÓRGANO")}`;

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
      const { objeto, unidad, organo, cpvPrincipal } = req.body;
      const userPrompt = `Determina el tipo de contrato para:

OBJETO: ${objeto}
${optionalField(cpvPrincipal, "CPV PRINCIPAL")}
${optionalField(unidad, "UNIDAD")}
${optionalField(organo, "ÓRGANO")}`;

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
      const { objeto, unidad, organo } = req.body;
      const userPrompt = `Analiza si el siguiente objeto de contrato podría justificar tramitación de emergencia (Art. 120 LCSP):

OBJETO: ${objeto}
${optionalField(unidad, "UNIDAD")}
${optionalField(organo, "ÓRGANO")}`;

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
      const { objeto, unidad, organo } = req.body;
      const userPrompt = `Analiza si el siguiente objeto de contrato podría estar cubierto por contratación centralizada (DGRCC):

OBJETO: ${objeto}
${optionalField(unidad, "UNIDAD")}
${optionalField(organo, "ÓRGANO")}`;

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
      const { objeto, unidad, organo } = req.body;
      const userPrompt = `Analiza si el siguiente objeto de contrato podría ser prestado por un medio propio (Arts. 32-33 LCSP):

OBJETO: ${objeto}
${optionalField(unidad, "UNIDAD")}
${optionalField(organo, "ÓRGANO")}`;

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
      const { objeto, unidad, organo, cpvPrincipal } = req.body;
      const userPrompt = `Analiza si el siguiente objeto de contrato tiene características de suscripción:

OBJETO: ${objeto}
${optionalField(cpvPrincipal, "CPV PRINCIPAL")}
${optionalField(unidad, "UNIDAD")}
${optionalField(organo, "ÓRGANO")}`;

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
      const { objeto, unidad, organo, cpvPrincipal } = req.body;
      const userPrompt = `Analiza el nivel de innovación requerido para:

OBJETO: ${objeto}
${optionalField(cpvPrincipal, "CPV PRINCIPAL")}
${optionalField(unidad, "UNIDAD")}
${optionalField(organo, "ÓRGANO")}`;

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
      const { objeto, tipoContrato, cpvPrincipal } = req.body;
      const userPrompt = `Estima la duración recomendada para el contrato:

OBJETO: ${objeto}
${optionalField(tipoContrato, "TIPO")}
${optionalField(cpvPrincipal, "CPV PRINCIPAL")}`;

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
      const { objeto, tipoContrato, cpvPrincipal } = req.body;
      const userPrompt = `Analiza si el contrato debería dividirse en lotes (Art. 99.3 LCSP):

OBJETO: ${objeto}
${optionalField(tipoContrato, "TIPO")}
${optionalField(cpvPrincipal, "CPV PRINCIPAL")}`;

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
      const { objeto, tipoContrato, cpvPrincipal, numLotes, lotes } = req.body;
      let userPrompt = `Propón las partidas presupuestarias para:

OBJETO: ${objeto}
${optionalField(tipoContrato, "TIPO")}
${optionalField(cpvPrincipal, "CPV PRINCIPAL")}`;

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
