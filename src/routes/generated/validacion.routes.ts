import type { FastifyPluginAsync } from 'fastify';
import type { PrismaClient } from '@prisma/client';

const validacionSchema = {
  type: 'object',
  properties: {
    expedienteId: { type: 'string', format: 'uuid' },
    documentoId: { type: 'string', format: 'uuid', nullable: true },
    reglaId: { type: 'string', format: 'uuid' },
    passed: { type: 'boolean' },
    valorEncontrado: { type: 'string', nullable: true },
    explicacion: { type: 'string' },
    puntuacionEstructura: { type: 'integer', nullable: true },
    puntuacionContenido: { type: 'integer', nullable: true },
    usuarioId: { type: 'string', format: 'uuid' }
  },
  required: ['expedienteId', 'reglaId', 'passed', 'explicacion', 'usuarioId']
};

const validacionResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    expedienteId: { type: 'string', format: 'uuid' },
    documentoId: { type: 'string', format: 'uuid', nullable: true },
    reglaId: { type: 'string', format: 'uuid' },
    passed: { type: 'boolean' },
    valorEncontrado: { type: 'string', nullable: true },
    explicacion: { type: 'string' },
    puntuacionEstructura: { type: 'integer', nullable: true },
    puntuacionContenido: { type: 'integer', nullable: true },
    usuarioId: { type: 'string', format: 'uuid' },
    createdAt: { type: 'string', format: 'date-time' }
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

  // GET /validaciones - List validaciones with pagination
  fastify.get('/', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['Validaciones'],
      description: 'Get paginated list of validaciones',
      querystring: paginationQuerySchema,
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: validacionResponseSchema
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

      const [validaciones, total] = await Promise.all([
        prisma.validacion.findMany({
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            expediente: true,
            documento: true,
            regla: true,
            usuario: true
          }
        }),
        prisma.validacion.count()
      ]);

      const totalPages = Math.ceil(total / limit);

      return reply.status(200).send({
        data: validaciones,
        total,
        page,
        limit,
        totalPages
      });
    } catch (error) {
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // GET /validaciones/:id - Get validacion by ID
  fastify.get('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['Validaciones'],
      description: 'Get validacion by ID',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      response: {
        200: validacionResponseSchema,
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

      const validacion = await prisma.validacion.findUnique({
        where: { id },
        include: {
          expediente: true,
          documento: true,
          regla: true,
          usuario: true,
          validacionesEvidencias: true
        }
      });

      if (!validacion) {
        return reply.status(404).send({ error: 'Validacion not found' });
      }

      return reply.status(200).send(validacion);
    } catch (error) {
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // POST /validaciones - Create new validacion
  fastify.post('/', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['Validaciones'],
      description: 'Create new validacion',
      body: validacionSchema,
      response: {
        201: validacionResponseSchema,
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
        expedienteId: string;
        documentoId?: string;
        reglaId: string;
        passed: boolean;
        valorEncontrado?: string;
        explicacion: string;
        puntuacionEstructura?: number;
        puntuacionContenido?: number;
        usuarioId: string;
      };

      // Verify related entities exist
      const [expediente, regla, usuario] = await Promise.all([
        prisma.expediente.findUnique({ where: { id: data.expedienteId } }),
        prisma.regla.findUnique({ where: { id: data.reglaId } }),
        prisma.profile.findUnique({ where: { id: data.usuarioId } })
      ]);

      if (!expediente) {
        return reply.status(400).send({ error: 'Expediente not found' });
      }
      if (!regla) {
        return reply.status(400).send({ error: 'Regla not found' });
      }
      if (!usuario) {
        return reply.status(400).send({ error: 'Usuario not found' });
      }

      if (data.documentoId) {
        const documento = await prisma.documento.findUnique({ where: { id: data.documentoId } });
        if (!documento) {
          return reply.status(400).send({ error: 'Documento not found' });
        }
      }

      const validacion = await prisma.validacion.create({
        data,
        include: {
          expediente: true,
          documento: true,
          regla: true,
          usuario: true
        }
      });

      return reply.status(201).send(validacion);
    } catch (error) {
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // PUT /validaciones/:id - Update validacion
  fastify.put('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['Validaciones'],
      description: 'Update validacion by ID',
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
          expedienteId: { type: 'string', format: 'uuid' },
          documentoId: { type: 'string', format: 'uuid', nullable: true },
          reglaId: { type: 'string', format: 'uuid' },
          passed: { type: 'boolean' },
          valorEncontrado: { type: 'string', nullable: true },
          explicacion: { type: 'string' },
          puntuacionEstructura: { type: 'integer', nullable: true },
          puntuacionContenido: { type: 'integer', nullable: true },
          usuarioId: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        200: validacionResponseSchema,
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
        expedienteId?: string;
        documentoId?: string;
        reglaId?: string;
        passed?: boolean;
        valorEncontrado?: string;
        explicacion?: string;
        puntuacionEstructura?: number;
        puntuacionContenido?: number;
        usuarioId?: string;
      };

      const existingValidacion = await prisma.validacion.findUnique({ where: { id } });
      if (!existingValidacion) {
        return reply.status(404).send({ error: 'Validacion not found' });
      }

      // Verify related entities exist if they are being updated
      if (data.expedienteId) {
        const expediente = await prisma.expediente.findUnique({ where: { id: data.expedienteId } });
        if (!expediente) {
          return reply.status(400).send({ error: 'Expediente not found' });
        }
      }

      if (data.reglaId) {
        const regla = await prisma.regla.findUnique({ where: { id: data.reglaId } });
        if (!regla) {
          return reply.status(400).send({ error: 'Regla not found' });
        }
      }

      if (data.usuarioId) {
        const usuario = await prisma.profile.findUnique({ where: { id: data.usuarioId } });
        if (!usuario) {
          return reply.status(400).send({ error: 'Usuario not found' });
        }
      }

      if (data.documentoId) {
        const documento = await prisma.documento.findUnique({ where: { id: data.documentoId } });
        if (!documento) {
          return reply.status(400).send({ error: 'Documento not found' });
        }
      }

      const validacion = await prisma.validacion.update({
        where: { id },
        data,
        include: {
          expediente: true,
          documento: true,
          regla: true,
          usuario: true
        }
      });

      return reply.status(200).send(validacion);
    } catch (error) {
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // DELETE /validaciones/:id - Delete validacion
  fastify.delete('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['Validaciones'],
      description: 'Delete validacion by ID',
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

      const existingValidacion = await prisma.validacion.findUnique({ where: { id } });
      if (!existingValidacion) {
        return reply.status(404).send({ error: 'Validacion not found' });
      }

      await prisma.validacion.delete({ where: { id } });

      return reply.status(200).send({ message: 'Validacion deleted successfully' });
    } catch (error) {
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
};

export default routes;