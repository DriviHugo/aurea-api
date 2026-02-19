import type { FastifyPluginAsync } from "fastify";
import type { PrismaClient } from "@prisma/client";

/**
 * Convert snake_case enum value to camelCase for Prisma
 */
function snakeToCamelValue(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Convert camelCase enum value to snake_case for frontend
 */
function camelToSnakeValue(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Normalize expediente for frontend (convert enum values to snake_case)
 */
function normalizeExpediente(exp: any): any {
  if (!exp) return exp;
  return {
    ...exp,
    estado: camelToSnakeValue(exp.estado),
    tipo_contrato: camelToSnakeValue(exp.tipoContrato),
    procedimiento_propuesto: camelToSnakeValue(exp.procedimientoPropuesto),
    procedimiento_seleccionado: camelToSnakeValue(
      exp.procedimientoSeleccionado,
    ),
    nivel_riesgo: exp.nivelRiesgo,
  };
}

/**
 * Map of valid enum values (both snake_case and camelCase accepted)
 */
const PROCEDIMIENTO_VALUES = [
  "abierto",
  "abierto_simplificado",
  "abiertoSimplificado",
  "abierto_supersimplificado",
  "abiertoSupersimplificado",
  "restringido",
  "negociado_sin_publicidad",
  "negociadoSinPublicidad",
  "negociado_con_publicidad",
  "negociadoConPublicidad",
  "dialogo_competitivo",
  "dialogoCompetitivo",
  "asociacion_innovacion",
  "asociacionInnovacion",
  "menor",
  "contrato_basado",
  "contratoBasado",
];

const TIPO_CONTRATO_VALUES = [
  "obras",
  "servicios",
  "suministros",
  "concesion_obras",
  "concesionObras",
  "concesion_servicios",
  "concesionServicios",
  "mixto",
];

const ESTADO_VALUES = [
  "ingesta",
  "borrador",
  "alternativas",
  "validado",
  "aprobado",
  "revision",
  "incidencia",
  "en_redaccion",
  "enRedaccion",
  "con_observaciones",
  "conObservaciones",
  "listo_validacion",
  "listoValidacion",
  "en_intervencion",
  "enIntervencion",
  "cerrado",
];

const expedienteSchema = {
  type: "object",
  properties: {
    codigo: { type: "string" },
    unidad: { type: "string" },
    organo: { type: "string" },
    creadorId: { type: "string", format: "uuid" },
    estado: {
      type: "string",
      enum: ESTADO_VALUES,
    },
    tipoContrato: {
      type: "string",
      enum: TIPO_CONTRATO_VALUES,
    },
    objeto: { type: "string" },
    descripcion: { type: "string" },
    valorEstimadoContrato: { type: "number" },
    presupuestoBaseLicitacion: { type: "number" },
    iva: { type: "number" },
    importeProrrogas: { type: "number" },
    importeModificados: { type: "number" },
    procedimientoPropuesto: {
      type: "string",
      enum: PROCEDIMIENTO_VALUES,
    },
    procedimientoSeleccionado: {
      type: "string",
      enum: PROCEDIMIENTO_VALUES,
    },
    cpvElegido: { type: "string" },
    tieneLotes: { type: "boolean" },
    justificacionLotes: { type: "string" },
    numLotes: { type: "integer" },
    esUrgente: { type: "boolean" },
    esEmergencia: { type: "boolean" },
    justificacionUrgencia: { type: "string" },
    porcentajeCompletitud: { type: "integer", minimum: 0, maximum: 100 },
    nivelRiesgo: {
      type: "string",
      enum: ["verde", "ambar", "amarillo", "rojo"],
    },
    ultimaAccionPendiente: { type: "string" },
    fechaVencimiento: { type: "string", format: "date-time" },
    metadatos: { type: "object" },
  },
  required: [
    "codigo",
    "unidad",
    "organo",
    "creadorId",
    "tipoContrato",
    "objeto",
  ],
};

const expedienteResponseSchema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    ...expedienteSchema.properties,
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
};

const paginationQuerySchema = {
  type: "object",
  properties: {
    page: { type: "integer", minimum: 1, default: 1 },
    limit: { type: "integer", minimum: 1, maximum: 100, default: 10 },
  },
};

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // GET /expedientes - List with pagination
  fastify.get(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Expedientes"],
        description: "Get paginated list of expedientes",
        querystring: paginationQuerySchema,
        response: {
          200: {
            type: "object",
            properties: {
              data: { type: "array", items: expedienteResponseSchema },
              total: { type: "integer" },
              page: { type: "integer" },
              limit: { type: "integer" },
              totalPages: { type: "integer" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { page = 1, limit = 10 } = request.query as {
          page?: number;
          limit?: number;
        };
        const skip = (page - 1) * limit;

        const [expedientes, total] = await Promise.all([
          prisma.case.findMany({
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
          }),
          prisma.case.count(),
        ]);

        const totalPages = Math.ceil(total / limit);

        return reply.status(200).send({
          data: expedientes.map(normalizeExpediente),
          total,
          page,
          limit,
          totalPages,
        });
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // GET /expedientes/:id - Get by ID
  fastify.get(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Expedientes"],
        description: "Get expediente by ID",
        params: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
          },
          required: ["id"],
        },
        response: {
          200: expedienteResponseSchema,
          404: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };

        const expediente = await prisma.case.findUnique({
          where: { id },
        });

        if (!expediente) {
          return reply.status(404).send({ error: "Expediente not found" });
        }

        return reply.status(200).send(normalizeExpediente(expediente));
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // POST /expedientes - Create
  fastify.post(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Expedientes"],
        description: "Create new expediente",
        body: expedienteSchema,
        response: {
          201: expedienteResponseSchema,
          400: {
            type: "object",
            properties: {
              error: { type: "string" },
              message: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        fastify.log.info({ body: request.body }, "Creating expediente");
        const data = request.body as any;

        // Convert snake_case enum values to camelCase for Prisma
        const expediente = await prisma.case.create({
          data: {
            ...data,
            estado: snakeToCamelValue(data.estado) || "borrador",
            tipoContrato: snakeToCamelValue(data.tipoContrato),
            procedimientoPropuesto: snakeToCamelValue(
              data.procedimientoPropuesto,
            ),
            procedimientoSeleccionado: snakeToCamelValue(
              data.procedimientoSeleccionado,
            ),
            valorEstimadoContrato: data.valorEstimadoContrato
              ? parseFloat(data.valorEstimadoContrato)
              : null,
            presupuestoBaseLicitacion: data.presupuestoBaseLicitacion
              ? parseFloat(data.presupuestoBaseLicitacion)
              : null,
            iva: data.iva ? parseFloat(data.iva) : null,
            importeProrrogas: data.importeProrrogas
              ? parseFloat(data.importeProrrogas)
              : null,
            importeModificados: data.importeModificados
              ? parseFloat(data.importeModificados)
              : null,
            fechaVencimiento: data.fechaVencimiento
              ? new Date(data.fechaVencimiento)
              : null,
            metadatos: data.metadatos || {},
          },
        });

        return reply.status(201).send(normalizeExpediente(expediente));
      } catch (error: any) {
        if (error.code === "P2002") {
          return reply
            .status(400)
            .send({ error: "Expediente with this codigo already exists" });
        }
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // PUT /expedientes/:id - Update
  fastify.put(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Expedientes"],
        description: "Update expediente by ID",
        params: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
          },
          required: ["id"],
        },
        body: {
          type: "object",
          properties: expedienteSchema.properties,
          additionalProperties: true,
        },
        response: {
          200: expedienteResponseSchema,
          404: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
          400: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = request.body as any;

        fastify.log.info({ body: data }, "Updating expediente");

        const existingExpediente = await prisma.case.findUnique({
          where: { id },
        });

        if (!existingExpediente) {
          return reply.status(404).send({ error: "Expediente not found" });
        }

        // Build update data excluding non-updatable fields
        const updateData: Record<string, unknown> = {};

        const allowedFields = [
          "codigo",
          "unidad",
          "organo",
          "objeto",
          "descripcion",
          "cpvElegido",
          "tieneLotes",
          "justificacionLotes",
          "numLotes",
          "esUrgente",
          "esEmergencia",
          "justificacionUrgencia",
          "porcentajeCompletitud",
          "ultimaAccionPendiente",
          "metadatos",
        ];

        for (const field of allowedFields) {
          if (data[field] !== undefined) {
            updateData[field] = data[field];
          }
        }

        // Handle enum fields with conversion
        if (data.estado !== undefined) {
          updateData.estado = snakeToCamelValue(data.estado);
        }
        if (data.tipoContrato !== undefined) {
          updateData.tipoContrato = snakeToCamelValue(data.tipoContrato);
        }
        if (data.procedimientoPropuesto !== undefined) {
          updateData.procedimientoPropuesto = snakeToCamelValue(
            data.procedimientoPropuesto,
          );
        }
        if (data.procedimientoSeleccionado !== undefined) {
          updateData.procedimientoSeleccionado = snakeToCamelValue(
            data.procedimientoSeleccionado,
          );
        }
        if (data.nivelRiesgo !== undefined) {
          fastify.log.info(
            { nivelRiesgo: data.nivelRiesgo },
            "nivelRiesgo from camelCase",
          );
          updateData.nivelRiesgo = data.nivelRiesgo;
        }
        // Also handle snake_case from frontend
        if (data.nivel_riesgo !== undefined) {
          fastify.log.info(
            { nivel_riesgo: data.nivel_riesgo },
            "nivel_riesgo from snake_case",
          );
          updateData.nivelRiesgo = data.nivel_riesgo;
        }

        // Handle numeric fields
        if (data.valorEstimadoContrato !== undefined) {
          updateData.valorEstimadoContrato = parseFloat(
            data.valorEstimadoContrato,
          );
        }
        if (data.presupuestoBaseLicitacion !== undefined) {
          updateData.presupuestoBaseLicitacion = parseFloat(
            data.presupuestoBaseLicitacion,
          );
        }
        if (data.iva !== undefined) {
          updateData.iva = parseFloat(data.iva);
        }
        if (data.importeProrrogas !== undefined) {
          updateData.importeProrrogas = parseFloat(data.importeProrrogas);
        }
        if (data.importeModificados !== undefined) {
          updateData.importeModificados = parseFloat(data.importeModificados);
        }

        // Handle date field
        if (data.fechaVencimiento !== undefined) {
          updateData.fechaVencimiento = new Date(data.fechaVencimiento);
        }

        fastify.log.info({ updateData }, "Prepared update data");

        const expediente = await prisma.case.update({
          where: { id },
          data: updateData,
        });

        return reply.status(200).send(normalizeExpediente(expediente));
      } catch (error: any) {
        fastify.log.error(
          { error: error.message, code: error.code },
          "Error updating expediente",
        );
        if (error.code === "P2002") {
          return reply
            .status(400)
            .send({ error: "Expediente with this codigo already exists" });
        }
        return reply
          .status(500)
          .send({ error: error.message || "Internal server error" });
      }
    },
  );

  // DELETE /expedientes/:id - Delete
  fastify.delete(
    "/:id",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Expedientes"],
        description: "Delete expediente by ID",
        params: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
          },
          required: ["id"],
        },
        response: {
          200: {
            type: "object",
            properties: {
              message: { type: "string" },
            },
          },
          404: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };

        const existingExpediente = await prisma.case.findUnique({
          where: { id },
        });

        if (!existingExpediente) {
          return reply.status(404).send({ error: "Expediente not found" });
        }

        await prisma.case.delete({
          where: { id },
        });

        return reply
          .status(200)
          .send({ message: "Expediente deleted successfully" });
      } catch (error) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );
};

export default routes;
