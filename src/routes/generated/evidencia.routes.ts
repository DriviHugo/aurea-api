import type { FastifyPluginAsync } from 'fastify';
import type { PrismaClient } from '@prisma/client';

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // Schemas
  const evidenciaSchema = {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      tipoFuente: { type: 'string', enum: ['LEY', 'DECRETO', 'RESOLUCION', 'CIRCULAR', 'OTRO'] },
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
  };

  const createEvidenciaSchema = {
    type: 'object',
    required: ['tipoFuente', 'fuenteId', 'fuenteNombre', 'version', 'fechaVigenciaInicio', 'textoFragmento'],
    properties: {
      tipoFuente: { type: 'string', enum: ['LEY', 'DECRETO', 'RESOLUCION', 'CIRCULAR', 'OTRO'] },
      fuenteId: { type: 'string', minLength: 1 },
      fuenteNombre: { type: 'string', minLength: 1 },
      seccion: { type: 'string' },
      rango: { type: 'string' },
      version: { type: 'string', minLength: 1 },
      fechaVigenciaInicio: { type: 'string', format: 'date' },
      fechaVigenciaFin: { type: 'string', format: 'date' },
      textoFragmento: { type: 'string', minLength: 1 },
      metadatos: { type: 'object', default: {} }
    }
  };

  const updateEvidenciaSchema = {
    type: 'object',
    properties: {
      tipoFuente: { type: 'string', enum: ['LEY', 'DECRETO', 'RESOLUCION', 'CIRCULAR', 'OTRO'] },
      fuenteId: { type: 'string', minLength: 1 },
      fuenteNombre: { type: 'string', minLength: 1 },
      seccion: { type: 'string' },
      rango: { type: 'string' },
      version: { type: 'string', minLength: 1 },
      fechaVigenciaInicio: { type: 'string', format: 'date' },
      fechaVigenciaFin: { type: 'string', format: 'date' },
      textoFragmento: { type: 'string', minLength: 1 },
      metadatos: { type: 'object' }
    }
  };

  const paginationSchema = {
    type: 'object',
    properties: {
      page: { type: 'integer', minimum: 1, default: 1 },
      limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 }
    }
  };

  const idParamSchema = {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', format: 'uuid' }
    }
  };

  // GET /evidencias - List with pagination
  fastify.get('/', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['Evidencias'],
      description: 'Get paginated list of evidencias',
      querystring: paginationSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: evidenciaSchema
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

      const [evidencias, total] = await Promise.all([
        prisma.evidencia.findMany({
          skip,
          take: limit,
          orderBy: { fechaVigenciaInicio: 'desc' }
        }),
        prisma.evidencia.count()
      ]);

      const totalPages = Math.ceil(total / limit);

      return reply.status(200).send({
        data: evidencias,
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

  // GET /evidencias/:id - Get by ID
  fastify.get('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['Evidencias'],
      description: 'Get evidencia by ID',
      params: idParamSchema,
      response: {
        200: evidenciaSchema,
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
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // POST /evidencias - Create
  fastify.post('/', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['Evidencias'],
      description: 'Create new evidencia',
      body: createEvidenciaSchema,
      response: {
        201: evidenciaSchema,
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
      const data = request.body as {
        tipoFuente: string;
        fuenteId: string;
        fuenteNombre: string;
        seccion?: string;
        rango?: string;
        version: string;
        fechaVigenciaInicio: string;
        fechaVigenciaFin?: string;
        textoFragmento: string;
        metadatos?: object;
      };

      const evidencia = await prisma.evidencia.create({
        data: {
          tipoFuente: data.tipoFuente as any,
          fuenteId: data.fuenteId,
          fuenteNombre: data.fuenteNombre,
          seccion: data.seccion || null,
          rango: data.rango || null,
          version: data.version,
          fechaVigenciaInicio: new Date(data.fechaVigenciaInicio),
          fechaVigenciaFin: data.fechaVigenciaFin ? new Date(data.fechaVigenciaFin) : null,
          textoFragmento: data.textoFragmento,
          metadatos: data.metadatos || {}
        }
      });

      return reply.status(201).send(evidencia);
    } catch (error) {
      fastify.log.error(error);
      if (error.code === 'P2002') {
        return reply.status(400).send({ error: 'Duplicate entry' });
      }
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // PUT /evidencias/:id - Update
  fastify.put('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['Evidencias'],
      description: 'Update evidencia by ID',
      params: idParamSchema,
      body: updateEvidenciaSchema,
      response: {
        200: evidenciaSchema,
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
      const data = request.body as {
        tipoFuente?: string;
        fuenteId?: string;
        fuenteNombre?: string;
        seccion?: string;
        rango?: string;
        version?: string;
        fechaVigenciaInicio?: string;
        fechaVigenciaFin?: string;
        textoFragmento?: string;
        metadatos?: object;
      };

      const existingEvidencia = await prisma.evidencia.findUnique({
        where: { id }
      });

      if (!existingEvidencia) {
        return reply.status(404).send({ error: 'Evidencia not found' });
      }

      const updateData: any = {};
      if (data.tipoFuente !== undefined) updateData.tipoFuente = data.tipoFuente;
      if (data.fuenteId !== undefined) updateData.fuenteId = data.fuenteId;
      if (data.fuenteNombre !== undefined) updateData.fuenteNombre = data.fuenteNombre;
      if (data.seccion !== undefined) updateData.seccion = data.seccion || null;
      if (data.rango !== undefined) updateData.rango = data.rango || null;
      if (data.version !== undefined) updateData.version = data.version;
      if (data.fechaVigenciaInicio !== undefined) updateData.fechaVigenciaInicio = new Date(data.fechaVigenciaInicio);
      if (data.fechaVigenciaFin !== undefined) updateData.fechaVigenciaFin = data.fechaVigenciaFin ? new Date(data.fechaVigenciaFin) : null;
      if (data.textoFragmento !== undefined) updateData.textoFragmento = data.textoFragmento;
      if (data.metadatos !== undefined) updateData.metadatos = data.metadatos;

      const evidencia = await prisma.evidencia.update({
        where: { id },
        data: updateData
      });

      return reply.status(200).send(evidencia);
    } catch (error) {
      fastify.log.error(error);
      if (error.code === 'P2002') {
        return reply.status(400).send({ error: 'Duplicate entry' });
      }
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // DELETE /evidencias/:id - Delete
  fastify.delete('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['Evidencias'],
      description: 'Delete evidencia by ID',
      params: idParamSchema,
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
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
};

export default routes;