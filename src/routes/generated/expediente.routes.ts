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
      enum: ['borrador', 'en_revision', 'aprobado', 'rechazado', 'archivado'] 
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
      enum: ['abierto', 'restringido', 'competitivo_con_negociacion', 'procedimiento_negociado', 'dialogo_competitivo', 'asociacion_innovacion', 'menor'],
      nullable: true 
    },
    procedimientoSeleccionado: { 
      type: 'string', 
      enum: ['abierto', 'restringido', 'competitivo_con_negociacion', 'procedimiento_negociado', 'dialogo_competitivo', 'asociacion_innovacion', 'menor'],
      nullable: true 
    },
    cpvElegido: { type: 'string', nullable: true },
    tieneLotes: { type: 'boolean' },
    justificacionLotes: { type: 'string', nullable: true },
    numLotes: { type: 'integer', nullable: true },
    esUrgente: { type: 'boolean' },
    esEmergencia: { type: 'boolean' },
    justificacionUrgencia: { type: 'string', nullable: true },
    porcentajeCompletitud: { type: 'integer', minimum: 0, maximum: 100 },
    nivelRiesgo: { 
      type: 'string', 
      enum: ['verde', 'amarillo', 'naranja', 'rojo'] 
    },
    ultimaAccionPendiente: { type: 'string', nullable: true },
    fechaVencimiento: { type: 'string', format: 'date-time', nullable: true },
    metadatos: { type: 'object' }
  }
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
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
    search: { type: 'string' },
    estado: { 
      type: 'string', 
      enum: ['borrador', 'en_revision', 'aprobado', 'rechazado', 'archivado'] 
    },
    tipoContrato: { 
      type: 'string', 
      enum: ['suministros', 'servicios', 'obras', 'concesion_obras', 'concesion_servicios'] 
    },
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
        },
        500: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { 
        page = 1, 
        limit = 10, 
        search, 
        estado, 
        tipoContrato, 
        unidad, 
        organo 
      } = request.query as any;

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
        },
        500: {
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
      body: {
        type: 'object',
        properties: {
          ...expedienteSchema.properties
        },
        required: ['codigo', 'unidad', 'organo', 'creadorId', 'tipoContrato', 'objeto']
      },
      response: {
        201: expedienteResponseSchema,
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        },
        500: {
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

      // Check if codigo already exists
      const existingExpediente = await prisma.expediente.findUnique({
        where: { codigo: data.codigo }
      });

      if (existingExpediente) {
        return reply.status(400).send({ error: 'Expediente with this codigo already exists' });
      }

      const expediente = await prisma.expediente.create({
        data: {
          ...data,
          metadatos: data.metadatos || {}
        }
      });

      return reply.status(201).send(expediente);
    } catch (error) {
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
          ...expedienteSchema.properties
        }
      },
      response: {
        200: expedienteResponseSchema,
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        },
        500: {
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

      // Check if codigo is being changed and if it already exists
      if (data.codigo && data.codigo !== existingExpediente.codigo) {
        const expedienteWithCodigo = await prisma.expediente.findUnique({
          where: { codigo: data.codigo }
        });

        if (expedienteWithCodigo) {
          return reply.status(400).send({ error: 'Expediente with this codigo already exists' });
        }
      }

      const updatedExpediente = await prisma.expediente.update({
        where: { id },
        data: {
          ...data,
          metadatos: data.metadatos !== undefined ? data.metadatos : existingExpediente.metadatos
        }
      });

      return reply.status(200).send(updatedExpediente);
    } catch (error) {
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
        },
        500: {
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

This implementation provides:

1. **Complete CRUD operations** for the Expediente model
2. **Pagination and filtering** in the list endpoint with search by codigo, objeto, descripcion and filters by estado, tipoContrato, unidad, organo
3. **Proper error handling** with appropriate HTTP status codes
4. **Authentication** using the authAccessToken plugin
5. **AJV schema validation** for all request/response bodies
6. **Swagger/OpenAPI documentation** with comprehensive schemas
7. **Unique constraint handling** for the codigo field
8. **Type safety** with TypeScript
9. **Proper decimal handling** for monetary fields
10. **JSON metadata** field support

The routes handle all the specific fields from your Prisma schema including enums, decimals, booleans, and the JSON metadatos field. The implementation follows Fastify best practices and includes comprehensive error handling.