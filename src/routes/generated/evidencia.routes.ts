import type { FastifyPluginAsync } from 'fastify';
import type { PrismaClient } from '@prisma/client';

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // List evidencias with pagination
  fastify.get('/', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['Evidencia'],
      description: 'Get list of evidencias with pagination',
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  tipoFuente: { type: 'string' },
                  fuenteId: { type: 'string' },
                  fuenteNombre: { type: 'string' },
                  seccion: { type: 'string', nullable: true },
                  rango: { type: 'string', nullable: true },
                  version: { type: 'string' },
                  fechaVigenciaInicio: { type: 'string', format: 'date' },
                  fechaVigenciaFin: { type: 'string', format: 'date', nullable: true },
                  textoFragmento: { type: 'string' },
                  metadatos: { type: 'object' }
                }
              }
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
      const { page = 1, limit = 10 } = request.query as { page?: number; limit?: number };
      const skip = (page - 1) * limit;

      const [data, total] = await Promise.all([
        prisma.evidencia.findMany({
          skip,
          take: limit,
          orderBy: { fechaVigenciaInicio: 'desc' }
        }),
        prisma.evidencia.count()
      ]);

      const totalPages = Math.ceil(total / limit);

      return reply.status(200).send({
        data,
        total,
        page,
        limit,
        totalPages
      });
    } catch (error) {
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Get evidencia by ID
  fastify.get('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['Evidencia'],
      description: 'Get evidencia by ID',
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
            id: { type: 'string' },
            tipoFuente: { type: 'string' },
            fuenteId: { type: 'string' },
            fuenteNombre: { type: 'string' },
            seccion: { type: 'string', nullable: true },
            rango: { type: 'string', nullable: true },
            version: { type: 'string' },
            fechaVigenciaInicio: { type: 'string', format: 'date' },
            fechaVigenciaFin: { type: 'string', format: 'date', nullable: true },
            textoFragmento: { type: 'string' },
            metadatos: { type: 'object' }
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

      const evidencia = await prisma.evidencia.findUnique({
        where: { id }
      });

      if (!evidencia) {
        return reply.status(404).send({ error: 'Evidencia not found' });
      }

      return reply.status(200).send(evidencia);
    } catch (error) {
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Create evidencia
  fastify.post('/', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['Evidencia'],
      description: 'Create new evidencia',
      body: {
        type: 'object',
        properties: {
          tipoFuente: { type: 'string', enum: ['LEY', 'DECRETO', 'RESOLUCION', 'CIRCULAR', 'CONCEPTO', 'SENTENCIA', 'OTRO'] },
          fuenteId: { type: 'string' },
          fuenteNombre: { type: 'string' },
          seccion: { type: 'string', nullable: true },
          rango: { type: 'string', nullable: true },
          version: { type: 'string' },
          fechaVigenciaInicio: { type: 'string', format: 'date' },
          fechaVigenciaFin: { type: 'string', format: 'date', nullable: true },
          textoFragmento: { type: 'string' },
          metadatos: { type: 'object', default: {} }
        },
        required: ['tipoFuente', 'fuenteId', 'fuenteNombre', 'version', 'fechaVigenciaInicio', 'textoFragmento']
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            tipoFuente: { type: 'string' },
            fuenteId: { type: 'string' },
            fuenteNombre: { type: 'string' },
            seccion: { type: 'string', nullable: true },
            rango: { type: 'string', nullable: true },
            version: { type: 'string' },
            fechaVigenciaInicio: { type: 'string', format: 'date' },
            fechaVigenciaFin: { type: 'string', format: 'date', nullable: true },
            textoFragmento: { type: 'string' },
            metadatos: { type: 'object' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const data = request.body as any;

      const evidencia = await prisma.evidencia.create({
        data: {
          ...data,
          fechaVigenciaInicio: new Date(data.fechaVigenciaInicio),
          fechaVigenciaFin: data.fechaVigenciaFin ? new Date(data.fechaVigenciaFin) : null,
          metadatos: data.metadatos || {}
        }
      });

      return reply.status(201).send(evidencia);
    } catch (error) {
      return reply.status(400).send({ error: 'Invalid data provided' });
    }
  });

  // Update evidencia
  fastify.put('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['Evidencia'],
      description: 'Update evidencia by ID',
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
          tipoFuente: { type: 'string', enum: ['LEY', 'DECRETO', 'RESOLUCION', 'CIRCULAR', 'CONCEPTO', 'SENTENCIA', 'OTRO'] },
          fuenteId: { type: 'string' },
          fuenteNombre: { type: 'string' },
          seccion: { type: 'string', nullable: true },
          rango: { type: 'string', nullable: true },
          version: { type: 'string' },
          fechaVigenciaInicio: { type: 'string', format: 'date' },
          fechaVigenciaFin: { type: 'string', format: 'date', nullable: true },
          textoFragmento: { type: 'string' },
          metadatos: { type: 'object' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            tipoFuente: { type: 'string' },
            fuenteId: { type: 'string' },
            fuenteNombre: { type: 'string' },
            seccion: { type: 'string', nullable: true },
            rango: { type: 'string', nullable: true },
            version: { type: 'string' },
            fechaVigenciaInicio: { type: 'string', format: 'date' },
            fechaVigenciaFin: { type: 'string', format: 'date', nullable: true },
            textoFragmento: { type: 'string' },
            metadatos: { type: 'object' }
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
      const data = request.body as any;

      const existingEvidencia = await prisma.evidencia.findUnique({
        where: { id }
      });

      if (!existingEvidencia) {
        return reply.status(404).send({ error: 'Evidencia not found' });
      }

      const evidencia = await prisma.evidencia.update({
        where: { id },
        data: {
          ...data,
          fechaVigenciaInicio: data.fechaVigenciaInicio ? new Date(data.fechaVigenciaInicio) : undefined,
          fechaVigenciaFin: data.fechaVigenciaFin ? new Date(data.fechaVigenciaFin) : null
        }
      });

      return reply.status(200).send(evidencia);
    } catch (error) {
      return reply.status(400).send({ error: 'Invalid data provided' });
    }
  });

  // Delete evidencia
  fastify.delete('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['Evidencia'],
      description: 'Delete evidencia by ID',
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

      const existingEvidencia = await prisma.evidencia.findUnique({
        where: { id }
      });

      if (!existingEvidencia) {
        return reply.status(404).send({ error: 'Evidencia not found' });
      }

      await prisma.evidencia.delete({
        where: { id }
      });

      return reply.status(200).send({ message: 'Evidencia deleted successfully' });
    } catch (error) {
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
};

export default routes;