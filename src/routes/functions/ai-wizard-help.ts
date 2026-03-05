/**
 * AI Wizard Help endpoint
 * Provides contextual AI-powered help for the expediente wizard
 */

import type { FastifyInstance } from "fastify";
import { getProductionGateway } from "../../services/ai-gateway/production-gateway.js";

interface WizardHelpRequest {
  stepId: string;
  sectionId?: string;
  subject?: string;
  contractType?: string;
  context?: Record<string, unknown>;
}

const SYSTEM_PROMPT = `Eres un experto en contratación pública española (LCSP 9/2017).
Tu tarea es proporcionar ayuda contextual y concisa para el asistente de creación de expedientes.

Responde SIEMPRE en formato JSON con esta estructura:
{
  "ayuda": "Texto de ayuda principal (2-3 párrafos máximo)",
  "section": "Nombre de la sección",
  "articuloLCSP": "Artículo relevante de la LCSP (opcional)",
  "consejos": ["Consejo 1", "Consejo 2"],
  "errorComun": "Error común a evitar (opcional)"
}

Sé conciso y práctico. No incluyas información innecesaria.`;

const STEP_CONTEXTS: Record<string, string> = {
  objeto:
    "El usuario está definiendo el OBJETO del contrato. Ayúdale a redactar un objeto claro, preciso y conforme al Art. 99 LCSP.",
  analisis:
    "El usuario está en la fase de ANÁLISIS del expediente. Proporciona información sobre los análisis necesarios según LCSP.",
  presupuestos:
    "El usuario está definiendo PRESUPUESTOS. Ayúdale con el valor estimado, IVA y desglose según Art. 100-101 LCSP.",
  excepciones:
    "El usuario está revisando EXCEPCIONES al procedimiento ordinario. Explica las excepciones aplicables según Art. 168 LCSP.",
  procedimiento:
    "El usuario está seleccionando el PROCEDIMIENTO de contratación. Ayúdale a elegir entre abierto, restringido, negociado, etc.",
  resumen:
    "El usuario está en el RESUMEN final. Ofrece una revisión general del expediente antes de crearlo.",
};

const SECTION_CONTEXTS: Record<string, string> = {
  cpv: "Sección de clasificación CPV. Ayuda a elegir los códigos CPV adecuados para el objeto del contrato.",
  tipo: "Sección de tipo de contrato. Ayuda a determinar si es obras, servicios, suministros o mixto.",
  emergencia:
    "Sección de análisis de emergencia (Art. 120 LCSP). Evalúa si aplica tramitación de emergencia.",
  centralizacion:
    "Sección de contratación centralizada. Verifica si el objeto está en catálogo centralizado.",
  "medio-propio":
    "Sección de encargos a medios propios (Art. 32-33 LCSP). Evalúa si aplica encargo a medio propio.",
  subscripcion:
    "Sección de suscripción/arrendamiento. Determina si es mejor suscripción que adquisición.",
  innovacion:
    "Sección de compra pública innovadora. Evalúa el nivel de innovación del contrato.",
  duracion:
    "Sección de duración del contrato (Art. 29 LCSP). Ayuda a definir plazos y prórrogas.",
  lotes:
    "Sección de división en lotes (Art. 99.3 LCSP). Evalúa si procede dividir en lotes.",
  resumen:
    "Resumen del análisis realizado. Ofrece una visión global de las características del expediente.",
};

export default async function aiWizardHelpRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.post("/ai-wizard-help", {
    preValidation: [app.authAccessToken],
    schema: {
      tags: ["AI Functions"],
      description: "Get contextual AI help for wizard steps",
      body: {
        type: "object",
        properties: {
          stepId: { type: "string" },
          sectionId: { type: "string" },
          subject: { type: "string" },
          contractType: { type: "string" },
          context: { type: "object" },
        },
        required: ["stepId"],
      },
    },
    handler: async (request, reply) => {
      const { stepId, sectionId, subject, contractType, context } =
        request.body as WizardHelpRequest;

      try {
        const gateway = getProductionGateway();

        const stepContext = Object.hasOwn(STEP_CONTEXTS, stepId)
          ? // eslint-disable-next-line security/detect-object-injection
            STEP_CONTEXTS[stepId]
          : "Proporciona ayuda general sobre contratación pública.";
        const sectionContext =
          sectionId !== undefined && sectionId !== ""
            ? Object.hasOwn(SECTION_CONTEXTS, sectionId)
              ? // eslint-disable-next-line security/detect-object-injection
                SECTION_CONTEXTS[sectionId]
              : ""
            : "";

        const userPrompt = `
PASO ACTUAL: ${stepId}${sectionId !== undefined && sectionId !== "" ? ` > ${sectionId}` : ""}
${stepContext}
${sectionContext}

CONTEXTO DEL EXPEDIENTE:
- Objeto: ${subject ?? "No definido aún"}
- Tipo de contrato: ${contractType ?? "No determinado"}
${context !== undefined ? `- Datos adicionales: ${JSON.stringify(context)}` : ""}

Proporciona ayuda contextual y práctica para este paso.`;

        const response = await gateway.completeSimple(
          SYSTEM_PROMPT,
          userPrompt,
        );

        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          return reply.status(200).send({
            ayuda: response,
            section: sectionId ?? stepId,
          });
        }

        const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
        return reply.status(200).send(parsed);
      } catch (error) {
        console.error("[ai-wizard-help] Error:", error);
        return reply.status(200).send({
          ayuda: getStaticHelp(stepId, sectionId),
          section: sectionId ?? stepId,
          consejos: getStaticConsejos(stepId, sectionId),
        });
      }
    },
  });
}

function getStaticHelp(stepId: string, sectionId?: string): string {
  const helps: Record<string, string> = {
    objeto:
      "Define el objeto del contrato de forma clara y precisa. Según el Art. 99 LCSP, el objeto debe ser determinado y la necesidad a satisfacer debe quedar claramente establecida.",
    analisis:
      "En esta fase se analizan las características del contrato para determinar el procedimiento más adecuado según la LCSP.",
    presupuestos:
      "Establece el valor estimado del contrato (Art. 101 LCSP) y el presupuesto base de licitación. Recuerda incluir el IVA y posibles prórrogas.",
    excepciones:
      "Revisa si aplican excepciones al procedimiento ordinario según los artículos 167-168 LCSP.",
    procedimiento:
      "Selecciona el procedimiento de contratación más adecuado según el tipo de contrato, importe y características específicas.",
    resumen:
      "Revisa todos los datos del expediente antes de crearlo. Asegúrate de que toda la información es correcta.",
  };

  const DEFAULT_HELP = "Completa la información requerida en este paso.";

  if (sectionId !== undefined && sectionId !== "") {
    const sectionHelps: Record<string, string> = {
      cpv: "Los códigos CPV (Common Procurement Vocabulary) clasifican el objeto del contrato. Elige el código que mejor describa la prestación principal.",
      tipo: "El tipo de contrato (obras, servicios, suministros) determina la normativa aplicable y los umbrales de licitación.",
      emergencia:
        "La tramitación de emergencia (Art. 120 LCSP) solo aplica en casos de acontecimientos catastróficos, situaciones de peligro o necesidad de defensa nacional.",
      centralizacion:
        "Verifica si el objeto está incluido en algún catálogo de contratación centralizada antes de iniciar un procedimiento propio.",
      lotes:
        "El Art. 99.3 LCSP establece la obligación de dividir en lotes salvo justificación en contrario. Evalúa si la división es conveniente.",
    };
    const sectionHelp = Object.hasOwn(sectionHelps, sectionId)
      ? // eslint-disable-next-line security/detect-object-injection
        sectionHelps[sectionId]
      : undefined;
    const stepHelp = Object.hasOwn(helps, stepId)
      ? // eslint-disable-next-line security/detect-object-injection
        helps[stepId]
      : undefined;
    return sectionHelp ?? stepHelp ?? DEFAULT_HELP;
  }

  return Object.hasOwn(helps, stepId)
    ? // eslint-disable-next-line security/detect-object-injection
      helps[stepId]!
    : DEFAULT_HELP;
}

function getStaticConsejos(stepId: string, _sectionId?: string): string[] {
  const defaultConsejos = [
    "Consulta la LCSP 9/2017 ante cualquier duda",
    "Documenta todas las decisiones tomadas",
    "Verifica los umbrales de contratación vigentes",
  ];

  const stepConsejos: Record<string, string[]> = {
    objeto: [
      "Evita términos vagos o ambiguos",
      "No incluyas marcas comerciales salvo justificación",
      "Define claramente el alcance de la prestación",
    ],
    presupuestos: [
      "El valor estimado incluye prórrogas y modificados",
      "El IVA debe indicarse por separado",
      "Utiliza precios de mercado actualizados",
    ],
    procedimiento: [
      "El procedimiento abierto es el más garantista",
      "El negociado sin publicidad es excepcional",
      "Justifica siempre la elección del procedimiento",
    ],
  };

  return Object.hasOwn(stepConsejos, stepId)
    ? // eslint-disable-next-line security/detect-object-injection
      stepConsejos[stepId]!
    : defaultConsejos;
}
