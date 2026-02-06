import type { FastifyPluginAsync } from 'fastify';
import type { PrismaClient } from '@prisma/client';

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // List CPV codes with pagination
  fastify.get('/', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['CPV Codes'],
      description: 'Get list of CPV codes with pagination',
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
          activo: { type: 'boolean' },
          nivel: { type: 'integer', minimum: 1 },
          search: { type: 'string' }
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
                  codigo: { type: 'string' },
                  descripcion: { type: 'string' },
                  descripcionEn: { type: 'string', nullable: true },
                  nivel: { type: 'integer' },
                  codigoPadre: { type: 'string', nullable: true },
                  activo: { type: 'boolean' },
                  createdAt: { type: 'string', format: 'date-time' }
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
      const { page = 1, limit = 10, activo, nivel, search } = request.query as any;
      const skip = (page - 1) * limit;

      const where: any = {};
      
      if (activo !== undefined) {
        where.activo = activo;
      }
      
      if (nivel !== undefined) {
        where.nivel = nivel;
      }
      
      if (search) {
        where.OR = [
          { codigo: { contains: search, mode: 'insensitive' } },
          { descripcion: { contains: search, mode: 'insensitive' } },
          { descripcionEn: { contains: search, mode: 'insensitive' } }
        ];
      }

      const [data, total] = await Promise.all([
        prisma.cpvCodigo.findMany({
          where,
          skip,
          take: limit,
          orderBy: { codigo: 'asc' }
        }),
        prisma.cpvCodigo.count({ where })
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

  // Get CPV code by ID
  fastify.get('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['CPV Codes'],
      description: 'Get CPV code by ID',
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
            codigo: { type: 'string' },
            descripcion: { type: 'string' },
            descripcionEn: { type: 'string', nullable: true },
            nivel: { type: 'integer' },
            codigoPadre: { type: 'string', nullable: true },
            activo: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' }
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

      const cpvCodigo = await prisma.cpvCodigo.findUnique({
        where: { id }
      });

      if (!cpvCodigo) {
        return reply.status(404).send({ error: 'CPV code not found' });
      }

      return reply.status(200).send(cpvCodigo);
    } catch (error) {
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Create new CPV code
  fastify.post('/', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['CPV Codes'],
      description: 'Create new CPV code',
      body: {
        type: 'object',
        properties: {
          codigo: { type: 'string', minLength: 1 },
          descripcion: { type: 'string', minLength: 1 },
          descripcionEn: { type: 'string', nullable: true },
          nivel: { type: 'integer', minimum: 1 },
          codigoPadre: { type: 'string', nullable: true },
          activo: { type: 'boolean', default: true }
        },
        required: ['codigo', 'descripcion', 'nivel']
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            codigo: { type: 'string' },
            descripcion: { type: 'string' },
            descripcionEn: { type: 'string', nullable: true },
            nivel: { type: 'integer' },
            codigoPadre: { type: 'string', nullable: true },
            activo: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' }
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
      const data = request.body as any;

      const cpvCodigo = await prisma.cpvCodigo.create({
        data
      });

      return reply.status(201).send(cpvCodigo);
    } catch (error: any) {
      if (error.code === 'P2002') {
        return reply.status(400).send({ error: 'CPV code already exists' });
      }
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Update CPV code
  fastify.put('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['CPV Codes'],
      description: 'Update CPV code by ID',
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
          codigo: { type: 'string', minLength: 1 },
          descripcion: { type: 'string', minLength: 1 },
          descripcionEn: { type: 'string', nullable: true },
          nivel: { type: 'integer', minimum: 1 },
          codigoPadre: { type: 'string', nullable: true },
          activo: { type: 'boolean' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            codigo: { type: 'string' },
            descripcion: { type: 'string' },
            descripcionEn: { type: 'string', nullable: true },
            nivel: { type: 'integer' },
            codigoPadre: { type: 'string', nullable: true },
            activo: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
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

      const existingCpvCodigo = await prisma.cpvCodigo.findUnique({
        where: { id }
      });

      if (!existingCpvCodigo) {
        return reply.status(404).send({ error: 'CPV code not found' });
      }

      const cpvCodigo = await prisma.cpvCodigo.update({
        where: { id },
        data
      });

      return reply.status(200).send(cpvCodigo);
    } catch (error: any) {
      if (error.code === 'P2002') {
        return reply.status(400).send({ error: 'CPV code already exists' });
      }
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Delete CPV code
  fastify.delete('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['CPV Codes'],
      description: 'Delete CPV code by ID',
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
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
};

export default routes;