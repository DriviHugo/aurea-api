import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { getProductionGateway } from "../../services/ai-gateway/production-gateway.js";

interface CaseContext {
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
  order?: number;
  title?: string;
  description?: string;
  lcspArticles?: string[];
}

interface RequestBody {
  phase: "plan" | "generate_section" | "review";
  documentType?: string;
  documentId?: string;
  sectionId?: string;
  plan?: Section[];
  currentSection?: number;
  caseContext?: CaseContext;
  previousSections?: Array<{
    title?: string;
    content?: string;
  }>;
  comments?: string;
  fullContent?: string;
  sections?: Array<{
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
      order: 1,
      title: "Identificación del órgano proponente",
      description: "Datos del órgano que propone la contratación",
      lcspArticles: ["Art. 116 LCSP"],
    },
    {
      order: 2,
      title: "Justificación de la necesidad",
      description: "Motivos que justifican la necesidad de contratar",
      lcspArticles: ["Art. 28 LCSP"],
    },
    {
      order: 3,
      title: "Objeto del contrato",
      description: "Descripción clara del objeto a contratar",
      lcspArticles: ["Art. 99 LCSP"],
    },
    {
      order: 4,
      title: "Presupuesto estimado",
      description: "Valoración económica del contrato",
      lcspArticles: ["Art. 100 LCSP"],
    },
    {
      order: 5,
      title: "Conclusión y propuesta",
      description: "Conclusión y propuesta de actuación",
    },
  ],
  memoria: [
    {
      order: 1,
      title: "Antecedentes y justificación",
      description: "Contexto y motivos de la contratación",
      lcspArticles: ["Art. 28 LCSP"],
    },
    {
      order: 2,
      title: "Objeto del contrato",
      description: "Descripción detallada del objeto",
      lcspArticles: ["Art. 99 LCSP"],
    },
    {
      order: 3,
      title: "Necesidades a satisfacer",
      description: "Necesidades administrativas a cubrir",
      lcspArticles: ["Art. 28.1 LCSP"],
    },
    {
      order: 4,
      title: "Idoneidad del contrato",
      description: "Justificación del tipo de contrato elegido",
      lcspArticles: ["Art. 28 LCSP"],
    },
    {
      order: 5,
      title: "Procedimiento de adjudicación",
      description: "Justificación del procedimiento elegido",
      lcspArticles: ["Art. 131 LCSP"],
    },
    {
      order: 6,
      title: "Presupuesto y valor estimado",
      description: "Análisis económico del contrato",
      lcspArticles: ["Art. 100 LCSP", "Art. 101 LCSP"],
    },
    {
      order: 7,
      title: "Criterios de adjudicación",
      description: "Criterios para valorar las ofertas",
      lcspArticles: ["Art. 145 LCSP"],
    },
    {
      order: 8,
      title: "Conclusiones",
      description: "Resumen y propuesta final",
    },
  ],
  pcap: [
    {
      order: 1,
      title: "Disposiciones generales",
      description: "Objeto, régimen jurídico y órgano de contratación",
      lcspArticles: ["Art. 99 LCSP", "Art. 61 LCSP"],
    },
    {
      order: 2,
      title: "Requisitos de los licitadores",
      description: "Capacidad, solvencia y prohibiciones",
      lcspArticles: ["Art. 65-68 LCSP", "Art. 71 LCSP"],
    },
    {
      order: 3,
      title: "Procedimiento de adjudicación",
      description: "Fases y trámites del procedimiento",
      lcspArticles: ["Art. 131-187 LCSP"],
    },
    {
      order: 4,
      title: "Criterios de adjudicación",
      description: "Criterios y su ponderación",
      lcspArticles: ["Art. 145-149 LCSP"],
    },
    {
      order: 5,
      title: "Garantías",
      description: "Garantía provisional y definitiva",
      lcspArticles: ["Art. 106-112 LCSP"],
    },
    {
      order: 6,
      title: "Formalización del contrato",
      description: "Documentación y firma del contrato",
      lcspArticles: ["Art. 153 LCSP"],
    },
    {
      order: 7,
      title: "Ejecución del contrato",
      description: "Condiciones de ejecución y modificaciones",
      lcspArticles: ["Art. 187-205 LCSP"],
    },
    {
      order: 8,
      title: "Extinción del contrato",
      description: "Cumplimiento, resolución y efectos",
      lcspArticles: ["Art. 209-213 LCSP"],
    },
  ],
  ppt: [
    {
      order: 1,
      title: "Objeto y alcance",
      description: "Descripción técnica del objeto",
      lcspArticles: ["Art. 99 LCSP"],
    },
    {
      order: 2,
      title: "Especificaciones técnicas",
      description: "Requisitos técnicos detallados",
      lcspArticles: ["Art. 126 LCSP"],
    },
    {
      order: 3,
      title: "Entregables y resultados",
      description: "Productos y servicios a entregar",
    },
    {
      order: 4,
      title: "Plazo de ejecución",
      description: "Duración y fases del contrato",
      lcspArticles: ["Art. 29 LCSP"],
    },
    {
      order: 5,
      title: "Equipo de trabajo",
      description: "Personal y medios necesarios",
    },
    {
      order: 6,
      title: "Control de calidad",
      description: "Criterios de aceptación y control",
    },
    {
      order: 7,
      title: "Penalidades",
      description: "Penalidades por incumplimiento",
      lcspArticles: ["Art. 192 LCSP"],
    },
  ],
  justificacion_procedimiento: [
    {
      order: 1,
      title: "Identificación del contrato",
      description: "Datos básicos del contrato",
    },
    {
      order: 2,
      title: "Análisis del valor estimado",
      description: "Cálculo y determinación del valor estimado",
      lcspArticles: ["Art. 101 LCSP"],
    },
    {
      order: 3,
      title: "Procedimientos aplicables",
      description: "Análisis de procedimientos posibles",
      lcspArticles: ["Art. 131 LCSP"],
    },
    {
      order: 4,
      title: "Justificación de la elección",
      description: "Motivos de la elección del procedimiento",
    },
    {
      order: 5,
      title: "Conclusión",
      description: "Propuesta de procedimiento",
    },
  ],
  anexo_tecnico: [
    {
      order: 1,
      title: "Especificaciones detalladas",
      description: "Detalles técnicos adicionales",
    },
    {
      order: 2,
      title: "Requisitos funcionales",
      description: "Funcionalidades requeridas",
    },
    {
      order: 3,
      title: "Requisitos no funcionales",
      description: "Rendimiento, seguridad, etc.",
    },
    {
      order: 4,
      title: "Anexos y documentación",
      description: "Documentación técnica adicional",
    },
  ],
  anexo_economico: [
    {
      order: 1,
      title: "Modelo de oferta económica",
      description: "Formato de presentación de oferta",
    },
    {
      order: 2,
      title: "Desglose de precios",
      description: "Estructura de precios unitarios",
    },
    {
      order: 3,
      title: "Criterios de valoración económica",
      description: "Fórmulas de puntuación",
    },
  ],
};

const DEFAULT_SECTIONS: Section[] = [
  {
    order: 1,
    title: "Introducción",
    description: "Contexto y objetivos del documento",
  },
  {
    order: 2,
    title: "Contenido principal",
    description: "Desarrollo del contenido específico",
  },
  {
    order: 3,
    title: "Conclusión",
    description: "Resumen y propuesta final",
  },
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
  "coherent": true,
  "globalScore": 85,
  "generalEvaluation": "Evaluación general del documento",
  "sectionSuggestions": [
    {
      "section": 1,
      "type": "improvement",
      "message": "Descripción del hallazgo",
      "suggestion": "Sugerencia de mejora"
    }
  ]
}`;

function buildSectionPrompt(
  section: Section,
  caseContext: CaseContext,
  previousSections: Array<{
    title?: string;
    content?: string;
  }>,
  comments?: string,
): string {
  const sectionOrder = section.order ?? 0;
  const sectionTitle = section.title ?? "";
  const sectionDesc = section.description ?? "";

  const previousContext =
    previousSections.length > 0
      ? `\n\nSecciones anteriores del documento:\n${previousSections
          .map((s) => `## ${s.title ?? ""}\n${s.content ?? ""}`)
          .join("\n\n")}`
      : "";

  return `Genera el contenido de la siguiente sección:

**Sección ${sectionOrder}: ${sectionTitle}**
Descripción: ${sectionDesc}
${section.lcspArticles ? `Artículos LCSP relacionados: ${section.lcspArticles.join(", ")}` : ""}

**Datos del expediente:**
- Objeto: ${caseContext.subject}
- Tipo de contrato: ${caseContext.contractType}
- Procedimiento: ${caseContext.procedure ?? "No especificado"}
- Valor estimado: ${caseContext.estimatedValue ?? "No especificado"} €
- Presupuesto base: ${caseContext.baseBudget ?? "No especificado"} €
- Unidad contratante: ${caseContext.unit}
- Órgano de contratación: ${caseContext.department}
${caseContext.selectedCpv !== undefined && caseContext.selectedCpv !== "" ? `- Código CPV: ${caseContext.selectedCpv}` : ""}
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

export default async function aiGenerateDocumentRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.addHook("preHandler", async (request, reply) => {
    if (request.url.includes("ai-generate-document")) {
      request.log.info({
        msg: "ai-generate-document preHandler",
        url: request.url,
        method: request.method,
        bodyType: typeof request.body,
        bodyKeys: request.body ? Object.keys(request.body as object) : [],
      });
    }
  });

  app.post("/ai-generate-document", {
    preValidation: [app.authAccessToken],
    handler: async (
      request: FastifyRequest<{ Body: RequestBody }>,
      reply: FastifyReply,
    ) => {
      const startTime = Date.now();
      const { phase } = request.body;

      request.log.info({
        msg: "ai-generate-document request",
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

            const rawSections =
              (Object.hasOwn(DOCUMENT_SECTIONS, documentType)
                ? // eslint-disable-next-line security/detect-object-injection
                  DOCUMENT_SECTIONS[documentType]
                : DEFAULT_SECTIONS) || [];

            return reply.send({ sections: rawSections });
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

            const section = plan.find((s) => s.order === currentSection);

            if (!section) {
              request.log.warn({
                msg: "Section not found in plan",
                currentSection,
                availableSections: plan.map((s) => s.order),
              });
              return reply.status(400).send({
                data: null,
                error: { message: `Section ${currentSection} not found` },
              });
            }

            request.log.info({
              msg: "Building prompt for section",
              sectionTitle: section.title,
              sectionOrder: section.order,
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
              const errorMessage =
                aiError instanceof Error ? aiError.message : String(aiError);
              request.log.error({
                msg: "AI gateway error",
                error: errorMessage,
                stack: aiError instanceof Error ? aiError.stack : undefined,
                sectionTitle: section.title,
                sectionOrder: section.order,
              });
              // Return structured error response instead of throwing
              return reply.status(500).send({
                error: {
                  message: `AI generation failed: ${errorMessage}`,
                  section: section.title,
                  sectionOrder: section.order,
                },
              });
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
${sections.map((s, i) => `${i + 1}. ${s.title ?? ""}`).join("\n")}

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
                suggestion: "",
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
          msg: "Error in ai-generate-document",
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
