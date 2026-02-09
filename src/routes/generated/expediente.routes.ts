import type { FastifyPluginAsync } from 'fastify';
import type { PrismaClient } from '@prisma/client';

const expedienteSchema = {
  type: 'object',
  properties: {
    codigo: { type: 'string' },
    unidad: { type: 'string' },
    organo: { type: 'string' },
    creadorId: { type: 'string', format: 'uuid' },
    estado: { 
      type: 'string', 
      enum: ['borrador', 'en_tramite', 'aprobado', 'rechazado', 'finalizado'] 
    },
    tipoContrato: { 
      type: 'string', 
      enum: ['suministros', 'servicios', 'obras', 'concesion_obras', 'concesion_servicios'] 
    },
    objeto: { type: 'string' },
    descripcion: { type: 'string', nullable: true },
    valorEstimadoContrato: { type: 'number', nullable: true },
    presupuestoBaseLicitacion: { type: 'number', nullable: true },
    iva: { type: 'number', nullable: true },
    importeProrrogas: { type: 'number', nullable: true },
    importeModificados: { type: 'number', nullable: true },
    procedimientoPropuesto: { 
      type: 'string', 
      enum: ['abierto', 'restringido', 'negociado', 'dialogo_competitivo', 'asociacion_innovacion'],
      nullable: true 
    },
    procedimientoSeleccionado: { 
      type: 'string', 
      enum: ['abierto', 'restringido', 'negociado', 'dialogo_competitivo', 'asociacion_innovacion'],
      nullable: true 
    },
    cpvElegido: { type: 'string', nullable: true },
    tieneLotes: { type: 'boolean' },
    justificacionLotes: { type: 'string', nullable: true },
    numLotes: { type: 'integer', nullable: true },
    esUrgente: { type: 'boolean' },
    esEmergencia: { type: 'boolean' },
    justificacionUrgencia: { type: 'string', nullable: true },
    porcentajeCompletitud: { type: 'integer', minimum: 0, maximum: 100, nullable: true },
    nivelRiesgo: { 
      type: 'string', 
      enum: ['verde', 'amarillo', 'naranja', 'rojo'],
      nullable: true 
    },
    ultimaAccionPendiente: { type: 'string', nullable: true },
    fechaVencimiento: { type: 'string', format: 'date-time', nullable: true },
    metadatos: { type: 'object' }
  },
  required: ['codigo', 'unidad', 'organo', 'creadorId', 'tipoContrato', 'objeto']
};

const expedienteResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    codigo: { type: 'string' },
    unidad: { type: 'string' },
    organo: { type: 'string' },
    creadorId: { type: 'string', format: 'uuid' },
    estado: { type: 'string' },
    tipoContrato: { type: 'string' },
    objeto: { type: 'string' },
    descripcion: { type: 'string', nullable: true },
    valorEstimadoContrato: { type: 'number', nullable: true },
    presupuestoBaseLicitacion: { type: 'number', nullable: true },
    iva: { type: 'number', nullable: true },
    importeProrrogas: { type: 'number', nullable: true },
    importeModificados: { type: 'number', nullable: true },
    procedimientoPropuesto: { type: 'string', nullable: true },
    procedimientoSeleccionado: { type: 'string', nullable: true },
    cpvElegido: { type: 'string', nullable: true },
    tieneLotes: { type: 'boolean' },
    justificacionLotes: { type: 'string', nullable: true },
    numLotes: { type: 'integer', nullable: true },
    esUrgente: { type: 'boolean' },
    esEmergencia: { type: 'boolean' },
    justificacionUrgencia: { type: 'string', nullable: true },
    porcentajeCompletitud: { type: 'integer', nullable: true },
    nivelRiesgo: { type: 'string', nullable: true },
    ultimaAccionPendiente: { type: 'string', nullable: true },
    fechaVencimiento: { type: 'string', format: 'date-time', nullable: true },
    metadatos: { type: 'object' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' }
  }
};

const paginationQuerySchema = {
  type: 'object',
  properties: {
    page: { type: 'integer', minimum: 1, default: 1 },
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
    search: { type: 'string' },
    estado: { type: 'string' },
    tipoContrato: { type: 'string' },
    unidad: { type: 'string' },
    organo: { type: 'string' }
  }
};

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // GET /expedientes - List expedientes with pagination and filters
  fastify.get('/', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['Expedientes'],
      description: 'Get list of expedientes with pagination and filters',
      querystring: paginationQuerySchema,
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: expedienteResponseSchema
            },
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
      const { page = 1, limit = 10, search, estado, tipoContrato, unidad, organo } = request.query as any;
      const skip = (page - 1) * limit;

      const where: any = {};

      if (search) {
        where.OR = [
          { codigo: { contains: search, mode: 'insensitive' } },
          { objeto: { contains: search, mode: 'insensitive' } },
          { descripcion: { contains: search, mode: 'insensitive' } }
        ];
      }

      if (estado) where.estado = estado;
      if (tipoContrato) where.tipoContrato = tipoContrato;
      if (unidad) where.unidad = { contains: unidad, mode: 'insensitive' };
      if (organo) where.organo = { contains: organo, mode: 'insensitive' };

      const [expedientes, total] = await Promise.all([
        prisma.expediente.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.expediente.count({ where })
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
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // GET /expedientes/:id - Get expediente by ID
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
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // POST /expedientes - Create new expediente
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

      // Convert string dates to Date objects
      if (data.fechaVencimiento) {
        data.fechaVencimiento = new Date(data.fechaVencimiento);
      }

      // Convert numeric strings to Decimal
      const numericFields = ['valorEstimadoContrato', 'presupuestoBaseLicitacion', 'iva', 'importeProrrogas', 'importeModificados'];
      numericFields.forEach(field => {
        if (data[field] !== undefined && data[field] !== null) {
          data[field] = parseFloat(data[field]);
        }
      });

      const expediente = await prisma.expediente.create({
        data
      });

      return reply.status(201).send(expediente);
    } catch (error: any) {
      fastify.log.error(error);
      
      if (error.code === 'P2002') {
        return reply.status(400).send({ error: 'Expediente with this codigo already exists' });
      }
      
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // PUT /expedientes/:id - Update expediente
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
        properties: {
          ...expedienteSchema.properties,
          codigo: { type: 'string' } // Make codigo optional for updates
        }
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

      // Check if expediente exists
      const existingExpediente = await prisma.expediente.findUnique({
        where: { id }
      });

      if (!existingExpediente) {
        return reply.status(404).send({ error: 'Expediente not found' });
      }

      // Convert string dates to Date objects
      if (data.fechaVencimiento) {
        data.fechaVencimiento = new Date(data.fechaVencimiento);
      }

      // Convert numeric strings to Decimal
      const numericFields = ['valorEstimadoContrato', 'presupuestoBaseLicitacion', 'iva', 'importeProrrogas', 'importeModificados'];
      numericFields.forEach(field => {
        if (data[field] !== undefined && data[field] !== null) {
          data[field] = parseFloat(data[field]);
        }
      });

      const updatedExpediente = await prisma.expediente.update({
        where: { id },
        data
      });

      return reply.status(200).send(updatedExpediente);
    } catch (error: any) {
      fastify.log.error(error);
      
      if (error.code === 'P2002') {
        return reply.status(400).send({ error: 'Expediente with this codigo already exists' });
      }
      
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // DELETE /expedientes/:id - Delete expediente
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

      // Check if expediente exists
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
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
};

export default routes;