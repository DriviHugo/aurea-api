import type { FastifyPluginAsync } from 'fastify';
import type { PrismaClient } from '@prisma/client';

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // Schemas
  const cpvCodigoSchema = {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      codigo: { type: 'string' },
      descripcion: { type: 'string' },
      descripcionEn: { type: 'string', nullable: true },
      nivel: { type: 'integer' },
      codigoPadre: { type: 'string', nullable: true },
      activo: { type: 'boolean' },
      createdAt: { type: 'string', format: 'date-time' }
    }
  };

  const createCpvCodigoSchema = {
    type: 'object',
    required: ['codigo', 'descripcion', 'nivel'],
    properties: {
      codigo: { type: 'string', minLength: 1 },
      descripcion: { type: 'string', minLength: 1 },
      descripcionEn: { type: 'string' },
      nivel: { type: 'integer', minimum: 1 },
      codigoPadre: { type: 'string' },
      activo: { type: 'boolean', default: true }
    },
    additionalProperties: false
  };

  const updateCpvCodigoSchema = {
    type: 'object',
    properties: {
      codigo: { type: 'string', minLength: 1 },
      descripcion: { type: 'string', minLength: 1 },
      descripcionEn: { type: 'string' },
      nivel: { type: 'integer', minimum: 1 },
      codigoPadre: { type: 'string' },
      activo: { type: 'boolean' }
    },
    additionalProperties: false
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

  // GET /cpv-codigos - List with pagination
  fastify.get('/', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['CPV Códigos'],
      description: 'Get paginated list of CPV codes',
      querystring: paginationSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: cpvCodigoSchema
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
      const { page = 1, limit = 10 } = request.query as { page?: number; limit?: number };
      const skip = (page - 1) * limit;

      const [data, total] = await Promise.all([
        prisma.cpvCodigo.findMany({
          skip,
          take: limit,
          orderBy: [
            { nivel: 'asc' },
            { codigo: 'asc' }
          ]
        }),
        prisma.cpvCodigo.count()
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
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // GET /cpv-codigos/:id - Get by ID
  fastify.get('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['CPV Códigos'],
      description: 'Get CPV code by ID',
      params: idParamSchema,
      response: {
        200: cpvCodigoSchema,
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

      const cpvCodigo = await prisma.cpvCodigo.findUnique({
        where: { id }
      });

      if (!cpvCodigo) {
        return reply.status(404).send({ error: 'CPV code not found' });
      }

      return reply.status(200).send(cpvCodigo);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // POST /cpv-codigos - Create
  fastify.post('/', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['CPV Códigos'],
      description: 'Create new CPV code',
      body: createCpvCodigoSchema,
      response: {
        201: cpvCodigoSchema,
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
        codigo: string;
        descripcion: string;
        descripcionEn?: string;
        nivel: number;
        codigoPadre?: string;
        activo?: boolean;
      };

      // Check if codigo already exists
      const existingCpvCodigo = await prisma.cpvCodigo.findUnique({
        where: { codigo: data.codigo }
      });

      if (existingCpvCodigo) {
        return reply.status(400).send({ error: 'CPV code already exists' });
      }

      // Validate codigoPadre exists if provided
      if (data.codigoPadre) {
        const parentExists = await prisma.cpvCodigo.findUnique({
          where: { codigo: data.codigoPadre }
        });

        if (!parentExists) {
          return reply.status(400).send({ error: 'Parent code does not exist' });
        }
      }

      const cpvCodigo = await prisma.cpvCodigo.create({
        data: {
          codigo: data.codigo,
          descripcion: data.descripcion,
          descripcionEn: data.descripcionEn,
          nivel: data.nivel,
          codigoPadre: data.codigoPadre,
          activo: data.activo ?? true
        }
      });

      return reply.status(201).send(cpvCodigo);
    } catch (error) {
      fastify.log.error(error);
      if (error.code === 'P2002') {
        return reply.status(400).send({ error: 'CPV code already exists' });
      }
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // PUT /cpv-codigos/:id - Update
  fastify.put('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['CPV Códigos'],
      description: 'Update CPV code by ID',
      params: idParamSchema,
      body: updateCpvCodigoSchema,
      response: {
        200: cpvCodigoSchema,
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
        codigo?: string;
        descripcion?: string;
        descripcionEn?: string;
        nivel?: number;
        codigoPadre?: string;
        activo?: boolean;
      };

      // Check if CPV code exists
      const existingCpvCodigo = await prisma.cpvCodigo.findUnique({
        where: { id }
      });

      if (!existingCpvCodigo) {
        return reply.status(404).send({ error: 'CPV code not found' });
      }

      // Check if new codigo already exists (if being updated)
      if (data.codigo && data.codigo !== existingCpvCodigo.codigo) {
        const codigoExists = await prisma.cpvCodigo.findUnique({
          where: { codigo: data.codigo }
        });

        if (codigoExists) {
          return reply.status(400).send({ error: 'CPV code already exists' });
        }
      }

      // Validate codigoPadre exists if provided
      if (data.codigoPadre) {
        const parentExists = await prisma.cpvCodigo.findUnique({
          where: { codigo: data.codigoPadre }
        });

        if (!parentExists) {
          return reply.status(400).send({ error: 'Parent code does not exist' });
        }
      }

      const cpvCodigo = await prisma.cpvCodigo.update({
        where: { id },
        data: {
          ...(data.codigo !== undefined && { codigo: data.codigo }),
          ...(data.descripcion !== undefined && { descripcion: data.descripcion }),
          ...(data.descripcionEn !== undefined && { descripcionEn: data.descripcionEn }),
          ...(data.nivel !== undefined && { nivel: data.nivel }),
          ...(data.codigoPadre !== undefined && { codigoPadre: data.codigoPadre }),
          ...(data.activo !== undefined && { activo: data.activo })
        }
      });

      return reply.status(200).send(cpvCodigo);
    } catch (error) {
      fastify.log.error(error);
      if (error.code === 'P2002') {
        return reply.status(400).send({ error: 'CPV code already exists' });
      }
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // DELETE /cpv-codigos/:id - Delete
  fastify.delete('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['CPV Códigos'],
      description: 'Delete CPV code by ID',
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

      // Check if CPV code exists
      const existingCpvCodigo = await prisma.cpvCodigo.findUnique({
        where: { id }
      });

      if (!existingCpvCodigo) {
        return reply.status(404).send({ error: 'CPV code not found' });
      }

      await prisma.cpvCodigo.delete({
        where: { id }
      });

      return reply.status(200).send({ message: 'CPV code deleted successfully' });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
};

export default routes;