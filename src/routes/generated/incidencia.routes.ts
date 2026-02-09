import type { FastifyPluginAsync } from 'fastify';
import type { PrismaClient } from '@prisma/client';

const incidenciaSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    usuarioId: { type: 'string', format: 'uuid' },
    ubicacion: { type: 'string' },
    funcionalidad: { type: 'string' },
    descripcion: { type: 'string' },
    comportamientoEsperado: { type: 'string' },
    screenshotUrl: { type: 'string', nullable: true },
    estado: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' }
  }
};

const createIncidenciaSchema = {
  type: 'object',
  required: ['usuarioId', 'ubicacion', 'funcionalidad', 'descripcion', 'comportamientoEsperado'],
  properties: {
    usuarioId: { type: 'string', format: 'uuid' },
    ubicacion: { type: 'string', minLength: 1, maxLength: 255 },
    funcionalidad: { type: 'string', minLength: 1, maxLength: 255 },
    descripcion: { type: 'string', minLength: 1, maxLength: 1000 },
    comportamientoEsperado: { type: 'string', minLength: 1, maxLength: 1000 },
    screenshotUrl: { type: 'string', nullable: true, maxLength: 500 },
    estado: { type: 'string', enum: ['pendiente', 'en_proceso', 'resuelto', 'cerrado'], default: 'pendiente' }
  },
  additionalProperties: false
};

const updateIncidenciaSchema = {
  type: 'object',
  properties: {
    ubicacion: { type: 'string', minLength: 1, maxLength: 255 },
    funcionalidad: { type: 'string', minLength: 1, maxLength: 255 },
    descripcion: { type: 'string', minLength: 1, maxLength: 1000 },
    comportamientoEsperado: { type: 'string', minLength: 1, maxLength: 1000 },
    screenshotUrl: { type: 'string', nullable: true, maxLength: 500 },
    estado: { type: 'string', enum: ['pendiente', 'en_proceso', 'resuelto', 'cerrado'] }
  },
  additionalProperties: false
};

const paginationSchema = {
  type: 'object',
  properties: {
    page: { type: 'integer', minimum: 1, default: 1 },
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
    estado: { type: 'string', enum: ['pendiente', 'en_proceso', 'resuelto', 'cerrado'] },
    usuarioId: { type: 'string', format: 'uuid' }
  }
};

const idParamSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string', format: 'uuid' }
  }
};

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // GET /incidencias - List incidencias with pagination
  fastify.get('/', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['Incidencias'],
      description: 'Get list of incidencias with pagination and filters',
      querystring: paginationSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: incidenciaSchema
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
      const { page = 1, limit = 10, estado, usuarioId } = request.query as {
        page?: number;
        limit?: number;
        estado?: string;
        usuarioId?: string;
      };

      const skip = (page - 1) * limit;
      
      const where: any = {};
      if (estado) {
        where.estado = estado;
      }
      if (usuarioId) {
        where.usuarioId = usuarioId;
      }

      const [incidencias, total] = await Promise.all([
        prisma.incidencia.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.incidencia.count({ where })
      ]);

      const totalPages = Math.ceil(total / limit);

      return reply.status(200).send({
        data: incidencias,
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

  // GET /incidencias/:id - Get single incidencia
  fastify.get('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['Incidencias'],
      description: 'Get incidencia by ID',
      params: idParamSchema,
      response: {
        200: incidenciaSchema,
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

      const incidencia = await prisma.incidencia.findUnique({
        where: { id }
      });

      if (!incidencia) {
        return reply.status(404).send({ error: 'Incidencia not found' });
      }

      return reply.status(200).send(incidencia);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // POST /incidencias - Create new incidencia
  fastify.post('/', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['Incidencias'],
      description: 'Create new incidencia',
      body: createIncidenciaSchema,
      response: {
        201: incidenciaSchema,
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
      const data = request.body as {
        usuarioId: string;
        ubicacion: string;
        funcionalidad: string;
        descripcion: string;
        comportamientoEsperado: string;
        screenshotUrl?: string;
        estado?: string;
      };

      const incidencia = await prisma.incidencia.create({
        data: {
          usuarioId: data.usuarioId,
          ubicacion: data.ubicacion,
          funcionalidad: data.funcionalidad,
          descripcion: data.descripcion,
          comportamientoEsperado: data.comportamientoEsperado,
          screenshotUrl: data.screenshotUrl || null,
          estado: data.estado || 'pendiente'
        }
      });

      return reply.status(201).send(incidencia);
    } catch (error) {
      fastify.log.error(error);
      if (error.code === 'P2002') {
        return reply.status(400).send({ error: 'Duplicate entry' });
      }
      if (error.code === 'P2003') {
        return reply.status(400).send({ error: 'Foreign key constraint failed' });
      }
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // PUT /incidencias/:id - Update incidencia
  fastify.put('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['Incidencias'],
      description: 'Update incidencia by ID',
      params: idParamSchema,
      body: updateIncidenciaSchema,
      response: {
        200: incidenciaSchema,
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
      const data = request.body as {
        ubicacion?: string;
        funcionalidad?: string;
        descripcion?: string;
        comportamientoEsperado?: string;
        screenshotUrl?: string;
        estado?: string;
      };

      const existingIncidencia = await prisma.incidencia.findUnique({
        where: { id }
      });

      if (!existingIncidencia) {
        return reply.status(404).send({ error: 'Incidencia not found' });
      }

      const updateData: any = {};
      if (data.ubicacion !== undefined) updateData.ubicacion = data.ubicacion;
      if (data.funcionalidad !== undefined) updateData.funcionalidad = data.funcionalidad;
      if (data.descripcion !== undefined) updateData.descripcion = data.descripcion;
      if (data.comportamientoEsperado !== undefined) updateData.comportamientoEsperado = data.comportamientoEsperado;
      if (data.screenshotUrl !== undefined) updateData.screenshotUrl = data.screenshotUrl;
      if (data.estado !== undefined) updateData.estado = data.estado;

      const incidencia = await prisma.incidencia.update({
        where: { id },
        data: updateData
      });

      return reply.status(200).send(incidencia);
    } catch (error) {
      fastify.log.error(error);
      if (error.code === 'P2002') {
        return reply.status(400).send({ error: 'Duplicate entry' });
      }
      if (error.code === 'P2003') {
        return reply.status(400).send({ error: 'Foreign key constraint failed' });
      }
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // DELETE /incidencias/:id - Delete incidencia
  fastify.delete('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['Incidencias'],
      description: 'Delete incidencia by ID',
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

      const existingIncidencia = await prisma.incidencia.findUnique({
        where: { id }
      });

      if (!existingIncidencia) {
        return reply.status(404).send({ error: 'Incidencia not found' });
      }

      await prisma.incidencia.delete({
        where: { id }
      });

      return reply.status(200).send({ message: 'Incidencia deleted successfully' });
    } catch (error) {
      fastify.log.error(error);
      if (error.code === 'P2003') {
        return reply.status(400).send({ error: 'Cannot delete: foreign key constraint' });
      }
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
};

export default routes;