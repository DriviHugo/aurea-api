import type { FastifyPluginAsync } from 'fastify';
import type { PrismaClient } from '@prisma/client';

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // GET /documentos - List with pagination
  fastify.get('/', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['Documentos'],
      description: 'Get paginated list of documentos',
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
          expedienteId: { type: 'string', format: 'uuid' },
          tipo: { type: 'string' },
          estado: { type: 'string' }
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
                  expedienteId: { type: 'string' },
                  tipo: { type: 'string' },
                  nombre: { type: 'string' },
                  version: { type: 'integer' },
                  hash: { type: 'string', nullable: true },
                  estado: { type: 'string' },
                  contenido: { type: 'object', nullable: true },
                  urlDocx: { type: 'string', nullable: true },
                  urlPdf: { type: 'string', nullable: true },
                  creadorId: { type: 'string' },
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' }
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
      const { page = 1, limit = 10, expedienteId, tipo, estado } = request.query as any;
      const skip = (page - 1) * limit;

      const where: any = {};
      if (expedienteId) where.expedienteId = expedienteId;
      if (tipo) where.tipo = tipo;
      if (estado) where.estado = estado;

      const [documentos, total] = await Promise.all([
        prisma.documento.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            expediente: { select: { id: true, numero: true } },
            creador: { select: { id: true, nombre: true, apellido: true } }
          }
        }),
        prisma.documento.count({ where })
      ]);

      const totalPages = Math.ceil(total / limit);

      return reply.status(200).send({
        data: documentos,
        total,
        page,
        limit,
        totalPages
      });
    } catch (error) {
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // GET /documentos/:id - Get single documento
  fastify.get('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['Documentos'],
      description: 'Get documento by ID',
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            expedienteId: { type: 'string' },
            tipo: { type: 'string' },
            nombre: { type: 'string' },
            version: { type: 'integer' },
            hash: { type: 'string', nullable: true },
            estado: { type: 'string' },
            contenido: { type: 'object', nullable: true },
            urlDocx: { type: 'string', nullable: true },
            urlPdf: { type: 'string', nullable: true },
            creadorId: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            expediente: { type: 'object' },
            creador: { type: 'object' }
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

      const documento = await prisma.documento.findUnique({
        where: { id },
        include: {
          expediente: { select: { id: true, numero: true, titulo: true } },
          creador: { select: { id: true, nombre: true, apellido: true } },
          documentosEvidencias: true,
          validaciones: true,
          revisiones: true,
          secciones: true,
          generaciones: true,
          versiones: true
        }
      });

      if (!documento) {
        return reply.status(404).send({ error: 'Documento not found' });
      }

      return reply.status(200).send(documento);
    } catch (error) {
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // POST /documentos - Create documento
  fastify.post('/', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['Documentos'],
      description: 'Create new documento',
      body: {
        type: 'object',
        required: ['expedienteId', 'tipo', 'nombre', 'creadorId'],
        properties: {
          expedienteId: { type: 'string', format: 'uuid' },
          tipo: { type: 'string' },
          nombre: { type: 'string', minLength: 1 },
          version: { type: 'integer', minimum: 1 },
          hash: { type: 'string' },
          estado: { type: 'string' },
          contenido: { type: 'object' },
          urlDocx: { type: 'string' },
          urlPdf: { type: 'string' },
          creadorId: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            expedienteId: { type: 'string' },
            tipo: { type: 'string' },
            nombre: { type: 'string' },
            version: { type: 'integer' },
            hash: { type: 'string', nullable: true },
            estado: { type: 'string' },
            contenido: { type: 'object', nullable: true },
            urlDocx: { type: 'string', nullable: true },
            urlPdf: { type: 'string', nullable: true },
            creadorId: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
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

      // Verify expediente exists
      const expediente = await prisma.expediente.findUnique({
        where: { id: data.expedienteId }
      });

      if (!expediente) {
        return reply.status(400).send({ error: 'Expediente not found' });
      }

      // Verify creador exists
      const creador = await prisma.profile.findUnique({
        where: { id: data.creadorId }
      });

      if (!creador) {
        return reply.status(400).send({ error: 'Creador not found' });
      }

      const documento = await prisma.documento.create({
        data: {
          expedienteId: data.expedienteId,
          tipo: data.tipo,
          nombre: data.nombre,
          version: data.version || 1,
          hash: data.hash,
          estado: data.estado || 'pendiente',
          contenido: data.contenido,
          urlDocx: data.urlDocx,
          urlPdf: data.urlPdf,
          creadorId: data.creadorId
        }
      });

      return reply.status(201).send(documento);
    } catch (error) {
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // PUT /documentos/:id - Update documento
  fastify.put('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['Documentos'],
      description: 'Update documento by ID',
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      },
      body: {
        type: 'object',
        properties: {
          tipo: { type: 'string' },
          nombre: { type: 'string', minLength: 1 },
          version: { type: 'integer', minimum: 1 },
          hash: { type: 'string' },
          estado: { type: 'string' },
          contenido: { type: 'object' },
          urlDocx: { type: 'string' },
          urlPdf: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            expedienteId: { type: 'string' },
            tipo: { type: 'string' },
            nombre: { type: 'string' },
            version: { type: 'integer' },
            hash: { type: 'string', nullable: true },
            estado: { type: 'string' },
            contenido: { type: 'object', nullable: true },
            urlDocx: { type: 'string', nullable: true },
            urlPdf: { type: 'string', nullable: true },
            creadorId: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
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

      const existingDocumento = await prisma.documento.findUnique({
        where: { id }
      });

      if (!existingDocumento) {
        return reply.status(404).send({ error: 'Documento not found' });
      }

      const documento = await prisma.documento.update({
        where: { id },
        data: {
          tipo: data.tipo,
          nombre: data.nombre,
          version: data.version,
          hash: data.hash,
          estado: data.estado,
          contenido: data.contenido,
          urlDocx: data.urlDocx,
          urlPdf: data.urlPdf
        }
      });

      return reply.status(200).send(documento);
    } catch (error) {
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // DELETE /documentos/:id - Delete documento
  fastify.delete('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['Documentos'],
      description: 'Delete documento by ID',
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
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

      const existingDocumento = await prisma.documento.findUnique({
        where: { id }
      });

      if (!existingDocumento) {
        return reply.status(404).send({ error: 'Documento not found' });
      }

      await prisma.documento.delete({
        where: { id }
      });

      return reply.status(200).send({ message: 'Documento deleted successfully' });
    } catch (error) {
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
};

export default routes;