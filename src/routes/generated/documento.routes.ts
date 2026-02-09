import type { FastifyPluginAsync } from 'fastify';
import type { PrismaClient } from '@prisma/client';

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // Schemas
  const documentoSchema = {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      expedienteId: { type: 'string', format: 'uuid' },
      tipo: { type: 'string', enum: ['contrato', 'acta', 'informe', 'resolucion', 'dictamen', 'otro'] },
      nombre: { type: 'string', minLength: 1, maxLength: 255 },
      version: { type: 'integer', minimum: 1 },
      hash: { type: ['string', 'null'] },
      estado: { type: 'string', enum: ['pendiente', 'en_revision', 'aprobado', 'rechazado'] },
      contenido: { type: ['object', 'null'] },
      urlDocx: { type: ['string', 'null'] },
      urlPdf: { type: ['string', 'null'] },
      creadorId: { type: 'string', format: 'uuid' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' }
    }
  };

  const createDocumentoSchema = {
    type: 'object',
    required: ['expedienteId', 'tipo', 'nombre', 'creadorId'],
    properties: {
      expedienteId: { type: 'string', format: 'uuid' },
      tipo: { type: 'string', enum: ['contrato', 'acta', 'informe', 'resolucion', 'dictamen', 'otro'] },
      nombre: { type: 'string', minLength: 1, maxLength: 255 },
      version: { type: 'integer', minimum: 1 },
      hash: { type: 'string' },
      estado: { type: 'string', enum: ['pendiente', 'en_revision', 'aprobado', 'rechazado'] },
      contenido: { type: 'object' },
      urlDocx: { type: 'string' },
      urlPdf: { type: 'string' },
      creadorId: { type: 'string', format: 'uuid' }
    },
    additionalProperties: false
  };

  const updateDocumentoSchema = {
    type: 'object',
    properties: {
      tipo: { type: 'string', enum: ['contrato', 'acta', 'informe', 'resolucion', 'dictamen', 'otro'] },
      nombre: { type: 'string', minLength: 1, maxLength: 255 },
      version: { type: 'integer', minimum: 1 },
      hash: { type: 'string' },
      estado: { type: 'string', enum: ['pendiente', 'en_revision', 'aprobado', 'rechazado'] },
      contenido: { type: 'object' },
      urlDocx: { type: 'string' },
      urlPdf: { type: 'string' }
    },
    additionalProperties: false
  };

  const paginationSchema = {
    type: 'object',
    properties: {
      page: { type: 'integer', minimum: 1, default: 1 },
      limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
      expedienteId: { type: 'string', format: 'uuid' },
      tipo: { type: 'string', enum: ['contrato', 'acta', 'informe', 'resolucion', 'dictamen', 'otro'] },
      estado: { type: 'string', enum: ['pendiente', 'en_revision', 'aprobado', 'rechazado'] }
    }
  };

  const idParamSchema = {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', format: 'uuid' }
    }
  };

  // GET /documentos - List documentos with pagination and filters
  fastify.get('/', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['Documentos'],
      description: 'Get paginated list of documentos with optional filters',
      querystring: paginationSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            data: { type: 'array', items: documentoSchema },
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
            expediente: {
              select: { id: true, numero: true, titulo: true }
            }
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
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // GET /documentos/:id - Get documento by ID
  fastify.get('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['Documentos'],
      description: 'Get documento by ID',
      params: idParamSchema,
      response: {
        200: documentoSchema,
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
          expediente: {
            select: { id: true, numero: true, titulo: true }
          },
          documentosEvidencias: true,
          validaciones: true,
          revisiones: true,
          documentoSecciones: true,
          documentoGeneraciones: true,
          documentoVersiones: true
        }
      });

      if (!documento) {
        return reply.status(404).send({ error: 'Documento not found' });
      }

      return reply.status(200).send(documento);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // POST /documentos - Create new documento
  fastify.post('/', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['Documentos'],
      description: 'Create new documento',
      body: createDocumentoSchema,
      response: {
        201: documentoSchema,
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
      const documentoData = request.body as any;

      // Verify expediente exists
      const expediente = await prisma.expediente.findUnique({
        where: { id: documentoData.expedienteId }
      });

      if (!expediente) {
        return reply.status(400).send({ error: 'Expediente not found' });
      }

      const documento = await prisma.documento.create({
        data: documentoData,
        include: {
          expediente: {
            select: { id: true, numero: true, titulo: true }
          }
        }
      });

      return reply.status(201).send(documento);
    } catch (error) {
      fastify.log.error(error);
      if (error.code === 'P2002') {
        return reply.status(400).send({ error: 'Documento with this data already exists' });
      }
      if (error.code === 'P2003') {
        return reply.status(400).send({ error: 'Invalid foreign key reference' });
      }
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // PUT /documentos/:id - Update documento
  fastify.put('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['Documentos'],
      description: 'Update documento by ID',
      params: idParamSchema,
      body: updateDocumentoSchema,
      response: {
        200: documentoSchema,
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
      const updateData = request.body as any;

      // Check if documento exists
      const existingDocumento = await prisma.documento.findUnique({
        where: { id }
      });

      if (!existingDocumento) {
        return reply.status(404).send({ error: 'Documento not found' });
      }

      const documento = await prisma.documento.update({
        where: { id },
        data: updateData,
        include: {
          expediente: {
            select: { id: true, numero: true, titulo: true }
          }
        }
      });

      return reply.status(200).send(documento);
    } catch (error) {
      fastify.log.error(error);
      if (error.code === 'P2002') {
        return reply.status(400).send({ error: 'Documento with this data already exists' });
      }
      if (error.code === 'P2003') {
        return reply.status(400).send({ error: 'Invalid foreign key reference' });
      }
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // DELETE /documentos/:id - Delete documento
  fastify.delete('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['Documentos'],
      description: 'Delete documento by ID',
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

      // Check if documento exists
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
      fastify.log.error(error);
      if (error.code === 'P2003') {
        return reply.status(400).send({ error: 'Cannot delete documento due to existing references' });
      }
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
};

export default routes;