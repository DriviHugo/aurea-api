import type { FastifyPluginAsync } from 'fastify';
import type { PrismaClient } from '@prisma/client';

const expedienteSchema = {
  type: 'object',
  properties: {
    codigo: { type: 'string' },
    unidad: { type: 'string' },
    organo: { type: 'string' },
    creadorId: { type: 'string', format: 'uuid' },
    estado: { type: 'string', enum: ['borrador', 'en_tramite', 'aprobado', 'rechazado', 'finalizado'] },
    tipoContrato: { type: 'string', enum: ['suministros', 'servicios', 'obras', 'concesion_obras', 'concesion_servicios'] },
    objeto: { type: 'string' },
    descripcion: { type: 'string' },
    valorEstimadoContrato: { type: 'number' },
    presupuestoBaseLicitacion: { type: 'number' },
    iva: { type: 'number' },
    importeProrrogas: { type: 'number' },
    importeModificados: { type: 'number' },
    procedimientoPropuesto: { type: 'string', enum: ['abierto', 'restringido', 'negociado', 'dialogo_competitivo', 'asociacion_innovacion'] },
    procedimientoSeleccionado: { type: 'string', enum: ['abierto', 'restringido', 'negociado', 'dialogo_competitivo', 'asociacion_innovacion'] },
    cpvElegido: { type: 'string' },
    tieneLotes: { type: 'boolean' },
    justificacionLotes: { type: 'string' },
    numLotes: { type: 'integer' },
    esUrgente: { type: 'boolean' },
    esEmergencia: { type: 'boolean' },
    justificacionUrgencia: { type: 'string' },
    porcentajeCompletitud: { type: 'integer', minimum: 0, maximum: 100 },
    nivelRiesgo: { type: 'string', enum: ['verde', 'amarillo', 'rojo'] },
    ultimaAccionPendiente: { type: 'string' },
    fechaVencimiento: { type: 'string', format: 'date-time' },
    metadatos: { type: 'object' }
  },
  required: ['codigo', 'unidad', 'organo', 'creadorId', 'tipoContrato', 'objeto']
};

const expedienteResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    ...expedienteSchema.properties,
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' }
  }
};

const paginationQuerySchema = {
  type: 'object',
  properties: {
    page: { type: 'integer', minimum: 1, default: 1 },
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 }
  }
};

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // GET /expedientes - List with pagination
  fastify.get('/', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['Expedientes'],
      description: 'Get paginated list of expedientes',
      querystring: paginationQuerySchema,
      response: {
        200: {
          type: 'object',
          properties: {
            data: { type: 'array', items: expedienteResponseSchema },
            total: { type: 'integer' },
            page: { type: 'integer' },
            limit: { type: 'integer' },
            totalPages: { type: 'integer' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { page = 1, limit = 10 } = request.query as { page?: number; limit?: number };
      const skip = (page - 1) * limit;

      const [expedientes, total] = await Promise.all([
        prisma.expediente.findMany({
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.expediente.count()
      ]);

      const totalPages = Math.ceil(total / limit);

      return reply.status(200).send({
        data: expedientes,
        total,
        page,
        limit,
        totalPages
      });
    } catch (error) {
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // GET /expedientes/:id - Get by ID
  fastify.get('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['Expedientes'],
      description: 'Get expediente by ID',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      response: {
        200: expedienteResponseSchema,
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const expediente = await prisma.expediente.findUnique({
        where: { id }
      });

      if (!expediente) {
        return reply.status(404).send({ error: 'Expediente not found' });
      }

      return reply.status(200).send(expediente);
    } catch (error) {
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // POST /expedientes - Create
  fastify.post('/', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['Expedientes'],
      description: 'Create new expediente',
      body: expedienteSchema,
      response: {
        201: expedienteResponseSchema,
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const data = request.body as any;

      const expediente = await prisma.expediente.create({
        data: {
          ...data,
          valorEstimadoContrato: data.valorEstimadoContrato ? parseFloat(data.valorEstimadoContrato) : null,
          presupuestoBaseLicitacion: data.presupuestoBaseLicitacion ? parseFloat(data.presupuestoBaseLicitacion) : null,
          iva: data.iva ? parseFloat(data.iva) : null,
          importeProrrogas: data.importeProrrogas ? parseFloat(data.importeProrrogas) : null,
          importeModificados: data.importeModificados ? parseFloat(data.importeModificados) : null,
          fechaVencimiento: data.fechaVencimiento ? new Date(data.fechaVencimiento) : null,
          metadatos: data.metadatos || {}
        }
      });

      return reply.status(201).send(expediente);
    } catch (error: any) {
      if (error.code === 'P2002') {
        return reply.status(400).send({ error: 'Expediente with this codigo already exists' });
      }
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // PUT /expedientes/:id - Update
  fastify.put('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['Expedientes'],
      description: 'Update expediente by ID',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: expedienteSchema.properties
      },
      response: {
        200: expedienteResponseSchema,
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = request.body as any;

      const existingExpediente = await prisma.expediente.findUnique({
        where: { id }
      });

      if (!existingExpediente) {
        return reply.status(404).send({ error: 'Expediente not found' });
      }

      const expediente = await prisma.expediente.update({
        where: { id },
        data: {
          ...data,
          valorEstimadoContrato: data.valorEstimadoContrato ? parseFloat(data.valorEstimadoContrato) : undefined,
          presupuestoBaseLicitacion: data.presupuestoBaseLicitacion ? parseFloat(data.presupuestoBaseLicitacion) : undefined,
          iva: data.iva ? parseFloat(data.iva) : undefined,
          importeProrrogas: data.importeProrrogas ? parseFloat(data.importeProrrogas) : undefined,
          importeModificados: data.importeModificados ? parseFloat(data.importeModificados) : undefined,
          fechaVencimiento: data.fechaVencimiento ? new Date(data.fechaVencimiento) : undefined
        }
      });

      return reply.status(200).send(expediente);
    } catch (error: any) {
      if (error.code === 'P2002') {
        return reply.status(400).send({ error: 'Expediente with this codigo already exists' });
      }
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // DELETE /expedientes/:id - Delete
  fastify.delete('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['Expedientes'],
      description: 'Delete expediente by ID',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' }
          }
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const existingExpediente = await prisma.expediente.findUnique({
        where: { id }
      });

      if (!existingExpediente) {
        return reply.status(404).send({ error: 'Expediente not found' });
      }

      await prisma.expediente.delete({
        where: { id }
      });

      return reply.status(200).send({ message: 'Expediente deleted successfully' });
    } catch (error) {
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
};

export default routes;