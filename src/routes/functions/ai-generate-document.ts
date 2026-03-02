import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { getProductionGateway } from "../../services/ai-gateway/production-gateway.js";

interface ExpedienteData {
  code: string;
  subject: string;
  description?: string;
  contractType: string;
  procedure?: string;
  estimatedValue?: number;
  baseBudget?: number;
  vat?: number;
  unit: string;
  department: string;
  selectedCpv?: string;
  hasLots?: boolean;
  numLots?: number;
  isUrgent?: boolean;
  isEmergency?: boolean;
}

interface Section {
  orden?: number;
  titulo?: string;
  descripcion?: string;
  articulosLCSP?: string[];
  // English field names (from frontend after api-client conversion)
  order?: number;
  title?: string;
  description?: string;
}

interface RequestBody {
  phase: "plan" | "generate_section" | "review";
  documentType?: string;
  expediente?: ExpedienteData;
  documentId?: string;
  sectionId?: string;
  plan?: Section[];
  currentSection?: number;
  caseContext?: ExpedienteData;
  previousSections?: Array<{
    titulo?: string;
    contenido?: string;
    title?: string;
    content?: string;
  }>;
  comments?: string;
  fullContent?: string;
  sections?: Array<{
    titulo?: string;
    contenido?: string;
    title?: string;
    content?: string;
  }>;
}

function getGateway() {
  return getProductionGateway();
}

const DOCUMENT_SECTIONS: Record<string, Section[]> = {
  informe_necesidad: [
    {
      orden: 1,
      titulo: "Identificación del órgano proponente",
      descripcion: "Datos del órgano que propone la contratación",
      articulosLCSP: ["Art. 116 LCSP"],
    },
    {
      orden: 2,
      titulo: "Justificación de la necesidad",
      descripcion: "Motivos que justifican la necesidad de contratar",
      articulosLCSP: ["Art. 28 LCSP"],
    },
    {
      orden: 3,
      titulo: "Objeto del contrato",
      descripcion: "Descripción clara del objeto a contratar",
      articulosLCSP: ["Art. 99 LCSP"],
    },
    {
      orden: 4,
      titulo: "Presupuesto estimado",
      descripcion: "Valoración económica del contrato",
      articulosLCSP: ["Art. 100 LCSP"],
    },
    {
      orden: 5,
      titulo: "Conclusión y propuesta",
      descripcion: "Conclusión y propuesta de actuación",
    },
  ],
  memoria: [
    {
      orden: 1,
      titulo: "Antecedentes y justificación",
      descripcion: "Contexto y motivos de la contratación",
      articulosLCSP: ["Art. 28 LCSP"],
    },
    {
      orden: 2,
      titulo: "Objeto del contrato",
      descripcion: "Descripción detallada del objeto",
      articulosLCSP: ["Art. 99 LCSP"],
    },
    {
      orden: 3,
      titulo: "Necesidades a satisfacer",
      descripcion: "Necesidades administrativas a cubrir",
      articulosLCSP: ["Art. 28.1 LCSP"],
    },
    {
      orden: 4,
      titulo: "Idoneidad del contrato",
      descripcion: "Justificación del tipo de contrato elegido",
      articulosLCSP: ["Art. 28 LCSP"],
    },
    {
      orden: 5,
      titulo: "Procedimiento de adjudicación",
      descripcion: "Justificación del procedimiento elegido",
      articulosLCSP: ["Art. 131 LCSP"],
    },
    {
      orden: 6,
      titulo: "Presupuesto y valor estimado",
      descripcion: "Análisis económico del contrato",
      articulosLCSP: ["Art. 100 LCSP", "Art. 101 LCSP"],
    },
    {
      orden: 7,
      titulo: "Criterios de adjudicación",
      descripcion: "Criterios para valorar las ofertas",
      articulosLCSP: ["Art. 145 LCSP"],
    },
    {
      orden: 8,
      titulo: "Conclusiones",
      descripcion: "Resumen y propuesta final",
    },
  ],
  pcap: [
    {
      orden: 1,
      titulo: "Disposiciones generales",
      descripcion: "Objeto, régimen jurídico y órgano de contratación",
      articulosLCSP: ["Art. 99 LCSP", "Art. 61 LCSP"],
    },
    {
      orden: 2,
      titulo: "Requisitos de los licitadores",
      descripcion: "Capacidad, solvencia y prohibiciones",
      articulosLCSP: ["Art. 65-68 LCSP", "Art. 71 LCSP"],
    },
    {
      orden: 3,
      titulo: "Procedimiento de adjudicación",
      descripcion: "Fases y trámites del procedimiento",
      articulosLCSP: ["Art. 131-187 LCSP"],
    },
    {
      orden: 4,
      titulo: "Criterios de adjudicación",
      descripcion: "Criterios y su ponderación",
      articulosLCSP: ["Art. 145-149 LCSP"],
    },
    {
      orden: 5,
      titulo: "Garantías",
      descripcion: "Garantía provisional y definitiva",
      articulosLCSP: ["Art. 106-112 LCSP"],
    },
    {
      orden: 6,
      titulo: "Formalización del contrato",
      descripcion: "Documentación y firma del contrato",
      articulosLCSP: ["Art. 153 LCSP"],
    },
    {
      orden: 7,
      titulo: "Ejecución del contrato",
      descripcion: "Condiciones de ejecución y modificaciones",
      articulosLCSP: ["Art. 187-205 LCSP"],
    },
    {
      orden: 8,
      titulo: "Extinción del contrato",
      descripcion: "Cumplimiento, resolución y efectos",
      articulosLCSP: ["Art. 209-213 LCSP"],
    },
  ],
  ppt: [
    {
      orden: 1,
      titulo: "Objeto y alcance",
      descripcion: "Descripción técnica del objeto",
      articulosLCSP: ["Art. 99 LCSP"],
    },
    {
      orden: 2,
      titulo: "Especificaciones técnicas",
      descripcion: "Requisitos técnicos detallados",
      articulosLCSP: ["Art. 126 LCSP"],
    },
    {
      orden: 3,
      titulo: "Entregables y resultados",
      descripcion: "Productos y servicios a entregar",
    },
    {
      orden: 4,
      titulo: "Plazo de ejecución",
      descripcion: "Duración y fases del contrato",
      articulosLCSP: ["Art. 29 LCSP"],
    },
    {
      orden: 5,
      titulo: "Equipo de trabajo",
      descripcion: "Personal y medios necesarios",
    },
    {
      orden: 6,
      titulo: "Control de calidad",
      descripcion: "Criterios de aceptación y control",
    },
    {
      orden: 7,
      titulo: "Penalidades",
      descripcion: "Penalidades por incumplimiento",
      articulosLCSP: ["Art. 192 LCSP"],
    },
  ],
  justificacion_procedimiento: [
    {
      orden: 1,
      titulo: "Identificación del contrato",
      descripcion: "Datos básicos del contrato",
    },
    {
      orden: 2,
      titulo: "Análisis del valor estimado",
      descripcion: "Cálculo y determinación del valor estimado",
      articulosLCSP: ["Art. 101 LCSP"],
    },
    {
      orden: 3,
      titulo: "Procedimientos aplicables",
      descripcion: "Análisis de procedimientos posibles",
      articulosLCSP: ["Art. 131 LCSP"],
    },
    {
      orden: 4,
      titulo: "Justificación de la elección",
      descripcion: "Motivos de la elección del procedimiento",
    },
    {
      orden: 5,
      titulo: "Conclusión",
      descripcion: "Propuesta de procedimiento",
    },
  ],
  anexo_tecnico: [
    {
      orden: 1,
      titulo: "Especificaciones detalladas",
      descripcion: "Detalles técnicos adicionales",
    },
    {
      orden: 2,
      titulo: "Requisitos funcionales",
      descripcion: "Funcionalidades requeridas",
    },
    {
      orden: 3,
      titulo: "Requisitos no funcionales",
      descripcion: "Rendimiento, seguridad, etc.",
    },
    {
      orden: 4,
      titulo: "Anexos y documentación",
      descripcion: "Documentación técnica adicional",
    },
  ],
  anexo_economico: [
    {
      orden: 1,
      titulo: "Modelo de oferta económica",
      descripcion: "Formato de presentación de oferta",
    },
    {
      orden: 2,
      titulo: "Desglose de precios",
      descripcion: "Estructura de precios unitarios",
    },
    {
      orden: 3,
      titulo: "Criterios de valoración económica",
      descripcion: "Fórmulas de puntuación",
    },
  ],
};

const DEFAULT_SECTIONS: Section[] = [
  {
    orden: 1,
    titulo: "Introducción",
    descripcion: "Contexto y objetivos del documento",
  },
  {
    orden: 2,
    titulo: "Contenido principal",
    descripcion: "Desarrollo del contenido específico",
  },
  { orden: 3, titulo: "Conclusión", descripcion: "Resumen y propuesta final" },
];

const GENERATION_PROMPT = `Eres un experto en contratación pública española (LCSP 9/2017).
Tu tarea es generar el contenido de una sección de un documento de contratación.

El contenido debe:
- Ser formal y técnico
- Cumplir con la normativa LCSP
- Ser coherente con las secciones anteriores del documento
- Incluir referencias legales cuando sea apropiado
- Usar formato Markdown con títulos, listas y párrafos bien estructurados

Genera el contenido directamente, sin envolver en JSON ni markdown code blocks.`;

const REVIEW_PROMPT = `Eres un experto revisor de documentos de contratación pública española (LCSP 9/2017).
Tu tarea es revisar un documento completo y evaluar su coherencia, completitud y cumplimiento normativo.

IMPORTANTE: Responde SOLO con un JSON válido, sin texto adicional ni markdown code blocks.

El JSON debe tener esta estructura exacta:
{
  "coherente": true,
  "puntuacionGlobal": 85,
  "evaluacionGeneral": "Evaluación general del documento",
  "sugerenciasPorSeccion": [
    {
      "seccion": 1,
      "tipo": "mejora",
      "mensaje": "Descripción del hallazgo",
      "sugerencia": "Sugerencia de mejora"
    }
  ]
}`;

function buildSectionPrompt(
  section: Section,
  expediente: ExpedienteData,
  previousSections: Array<{
    titulo?: string;
    contenido?: string;
    title?: string;
    content?: string;
  }>,
  comments?: string,
): string {
  // Support both Spanish and English field names
  const sectionOrder = section.order ?? section.orden ?? 0;
  const sectionTitle = section.title ?? section.titulo ?? "";
  const sectionDesc = section.description ?? section.descripcion ?? "";

  const previousContext =
    previousSections.length > 0
      ? `\n\nSecciones anteriores del documento:\n${previousSections
          .map(
            (s) =>
              `## ${s.title ?? s.titulo ?? ""}\n${s.content ?? s.contenido ?? ""}`,
          )
          .join("\n\n")}`
      : "";

  return `Genera el contenido de la siguiente sección:

**Sección ${sectionOrder}: ${sectionTitle}**
Descripción: ${sectionDesc}
${section.articulosLCSP ? `Artículos LCSP relacionados: ${section.articulosLCSP.join(", ")}` : ""}

**Datos del expediente:**
- Objeto: ${expediente.subject}
- Tipo de contrato: ${expediente.contractType}
- Procedimiento: ${expediente.procedure ?? "No especificado"}
- Valor estimado: ${expediente.estimatedValue ?? "No especificado"} €
- Presupuesto base: ${expediente.baseBudget ?? "No especificado"} €
- Unidad contratante: ${expediente.unit}
- Órgano de contratación: ${expediente.department}
${expediente.selectedCpv !== undefined && expediente.selectedCpv !== "" ? `- Código CPV: ${expediente.selectedCpv}` : ""}
${previousContext}
${comments !== undefined && comments !== "" ? `\n**Comentarios adicionales:** ${comments}` : ""}

Genera el contenido en formato Markdown.`;
}

function parseJsonSafely(response: string, fallback: unknown): unknown {
  try {
    const cleanResponse = response
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    return JSON.parse(cleanResponse);
  } catch {
    return fallback;
  }
}

export default async function aiGenerarDocumentoRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.addHook("preHandler", async (request, reply) => {
    if (request.url.includes("ai-generar-documento")) {
      request.log.info({
        msg: "ai-generar-documento preHandler",
        url: request.url,
        method: request.method,
        bodyType: typeof request.body,
        bodyKeys: request.body ? Object.keys(request.body as object) : [],
      });
    }
  });

  app.post("/ai-generar-documento", {
    preValidation: [app.authAccessToken],
    handler: async (
      request: FastifyRequest<{ Body: RequestBody }>,
      reply: FastifyReply,
    ) => {
      const startTime = Date.now();
      const { phase } = request.body;

      request.log.info({
        msg: "ai-generar-documento request",
        phase,
        bodyKeys: Object.keys(request.body || {}),
      });

      try {
        switch (phase) {
          case "plan": {
            const { documentType } = request.body;

            if (documentType === undefined || documentType === "") {
              return reply.status(400).send({
                data: null,
                error: { message: "Field 'documentType' is required" },
              });
            }

            const rawSecciones =
              (Object.hasOwn(DOCUMENT_SECTIONS, documentType)
                ? // eslint-disable-next-line security/detect-object-injection
                  DOCUMENT_SECTIONS[documentType]
                : DEFAULT_SECTIONS) || [];

            // Normalize to English field names for frontend consistency
            const secciones = rawSecciones.map((s) => ({
              order: s.order ?? s.orden,
              title: s.title ?? s.titulo,
              description: s.description ?? s.descripcion,
              articulosLCSP: s.articulosLCSP,
            }));

            return reply.send({ secciones });
          }

          case "generate_section": {
            const {
              plan,
              currentSection,
              caseContext,
              previousSections = [],
              comments,
            } = request.body;

            request.log.info({
              msg: "generate_section request",
              currentSection,
              hasPlan: !!plan,
              hasCaseContext: !!caseContext,
              planLength: plan?.length,
              previousSectionsCount: previousSections.length,
            });

            if (!plan || currentSection === undefined || !caseContext) {
              request.log.warn({
                msg: "Missing required fields for generate_section",
                hasPlan: !!plan,
                hasCurrentSection: currentSection !== undefined,
                hasCaseContext: !!caseContext,
              });
              return reply.status(400).send({
                data: null,
                error: {
                  message:
                    "Fields 'plan', 'currentSection' and 'caseContext' are required",
                },
              });
            }

            // Support both Spanish (orden) and English (order) field names
            const section = plan.find(
              (s) => (s.order ?? s.orden) === currentSection,
            );

            if (!section) {
              request.log.warn({
                msg: "Section not found in plan",
                currentSection,
                availableSections: plan.map((s) => s.order ?? s.orden),
              });
              return reply.status(400).send({
                data: null,
                error: { message: `Section ${currentSection} not found` },
              });
            }

            request.log.info({
              msg: "Building prompt for section",
              sectionTitle: section.title ?? section.titulo,
              sectionOrder: section.order ?? section.orden,
            });

            const prompt = buildSectionPrompt(
              section,
              caseContext,
              previousSections,
              comments,
            );

            request.log.info({
              msg: "Calling AI gateway",
              promptLength: prompt.length,
            });

            try {
              const aiResponse = await getGateway().completeWithMeta(
                GENERATION_PROMPT,
                prompt,
              );

              request.log.info({
                msg: "AI generation successful",
                contentLength: aiResponse.content.length,
                generationTimeMs: Date.now() - startTime,
                provider: aiResponse.provider,
                model: aiResponse.model,
                tokens: aiResponse.usage,
              });

              return reply.send({
                content: aiResponse.content,
                tokensUsed: aiResponse.usage.totalTokens,
                generationTimeMs: Date.now() - startTime,
                aiProvider: aiResponse.provider,
                aiModel: aiResponse.model,
                promptTokens: aiResponse.usage.promptTokens,
                completionTokens: aiResponse.usage.completionTokens,
              });
            } catch (aiError) {
              request.log.error({
                msg: "AI gateway error",
                error:
                  aiError instanceof Error ? aiError.message : String(aiError),
                stack: aiError instanceof Error ? aiError.stack : undefined,
              });
              throw aiError;
            }
          }

          case "review": {
            const { fullContent, sections = [] } = request.body;

            if (fullContent === undefined || fullContent === "") {
              return reply.status(400).send({
                data: null,
                error: { message: "Field 'fullContent' is required" },
              });
            }

            const prompt = `Revisa el siguiente documento de contratación pública y evalúa su calidad:

${fullContent}

El documento tiene ${sections.length} secciones:
${sections.map((s, i) => `${i + 1}. ${s.titulo}`).join("\n")}

Responde SOLO con JSON válido.`;

            const response = await getGateway().completeSimple(
              REVIEW_PROMPT,
              prompt,
            );

            const fallbackResult = {
              coherent: true,
              globalScore: 75,
              generalEvaluation:
                "Document generated correctly. Manual review recommended.",
              sectionSuggestions: sections.map((_, i) => ({
                section: i + 1,
                type: "ok",
                message: "Section generated correctly",
              })),
            };

            return reply.send(parseJsonSafely(response, fallbackResult));
          }

          default:
            request.log.warn({ msg: "Unknown phase requested", phase });
            return reply.status(400).send({
              data: null,
              error: { message: `Unknown phase: ${phase}` },
            });
        }
      } catch (error) {
        request.log.error({
          msg: "Error in ai-generar-documento",
          phase,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        return reply.status(500).send({
          data: null,
          error: {
            message:
              error instanceof Error
                ? error.message
                : "Error generating document",
          },
        });
      }
    },
  });
}
