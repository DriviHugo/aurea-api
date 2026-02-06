import type { FastifyPluginAsync } from 'fastify';
import type { PrismaClient } from '@prisma/client';

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // List DocumentoEvidencia with pagination
  fastify.get('/', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['DocumentoEvidencia'],
      description: 'Get all documento evidencias with pagination',
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
          documentoId: { type: 'string', format: 'uuid' },
          evidenciaId: { type: 'string', format: 'uuid' }
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
                  id: { type: 'string', format: 'uuid' },
                  documentoId: { type: 'string', format: 'uuid' },
                  evidenciaId: { type: 'string', format: 'uuid' },
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
      const { page = 1, limit = 10, documentoId, evidenciaId } = request.query as any;
      const skip = (page - 1) * limit;

      const where: any = {};
      if (documentoId) where.documentoId = documentoId;
      if (evidenciaId) where.evidenciaId = evidenciaId;

      const [data, total] = await Promise.all([
        prisma.documentoEvidencia.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.documentoEvidencia.count({ where })
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

  // Get DocumentoEvidencia by ID
  fastify.get('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['DocumentoEvidencia'],
      description: 'Get documento evidencia by ID',
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
            id: { type: 'string', format: 'uuid' },
            documentoId: { type: 'string', format: 'uuid' },
            evidenciaId: { type: 'string', format: 'uuid' },
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

      const documentoEvidencia = await prisma.documentoEvidencia.findUnique({
        where: { id }
      });

      if (!documentoEvidencia) {
        return reply.status(404).send({ error: 'DocumentoEvidencia not found' });
      }

      return reply.status(200).send(documentoEvidencia);
    } catch (error) {
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Create DocumentoEvidencia
  fastify.post('/', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['DocumentoEvidencia'],
      description: 'Create new documento evidencia',
      body: {
        type: 'object',
        required: ['documentoId', 'evidenciaId'],
        properties: {
          documentoId: { type: 'string', format: 'uuid' },
          evidenciaId: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            documentoId: { type: 'string', format: 'uuid' },
            evidenciaId: { type: 'string', format: 'uuid' },
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
      const { documentoId, evidenciaId } = request.body as {
        documentoId: string;
        evidenciaId: string;
      };

      // Check if documento exists
      const documento = await prisma.documento.findUnique({
        where: { id: documentoId }
      });
      if (!documento) {
        return reply.status(400).send({ error: 'Documento not found' });
      }

      // Check if evidencia exists
      const evidencia = await prisma.evidencia.findUnique({
        where: { id: evidenciaId }
      });
      if (!evidencia) {
        return reply.status(400).send({ error: 'Evidencia not found' });
      }

      const documentoEvidencia = await prisma.documentoEvidencia.create({
        data: {
          documentoId,
          evidenciaId
        }
      });

      return reply.status(201).send(documentoEvidencia);
    } catch (error: any) {
      if (error.code === 'P2002') {
        return reply.status(400).send({ error: 'DocumentoEvidencia relationship already exists' });
      }
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Update DocumentoEvidencia
  fastify.put('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['DocumentoEvidencia'],
      description: 'Update documento evidencia by ID',
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
          documentoId: { type: 'string', format: 'uuid' },
          evidenciaId: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            documentoId: { type: 'string', format: 'uuid' },
            evidenciaId: { type: 'string', format: 'uuid' },
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
      const { documentoId, evidenciaId } = request.body as {
        documentoId?: string;
        evidenciaId?: string;
      };

      const existingDocumentoEvidencia = await prisma.documentoEvidencia.findUnique({
        where: { id }
      });

      if (!existingDocumentoEvidencia) {
        return reply.status(404).send({ error: 'DocumentoEvidencia not found' });
      }

      const updateData: any = {};

      if (documentoId) {
        const documento = await prisma.documento.findUnique({
          where: { id: documentoId }
        });
        if (!documento) {
          return reply.status(400).send({ error: 'Documento not found' });
        }
        updateData.documentoId = documentoId;
      }

      if (evidenciaId) {
        const evidencia = await prisma.evidencia.findUnique({
          where: { id: evidenciaId }
        });
        if (!evidencia) {
          return reply.status(400).send({ error: 'Evidencia not found' });
        }
        updateData.evidenciaId = evidenciaId;
      }

      const documentoEvidencia = await prisma.documentoEvidencia.update({
        where: { id },
        data: updateData
      });

      return reply.status(200).send(documentoEvidencia);
    } catch (error: any) {
      if (error.code === 'P2002') {
        return reply.status(400).send({ error: 'DocumentoEvidencia relationship already exists' });
      }
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Delete DocumentoEvidencia
  fastify.delete('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['DocumentoEvidencia'],
      description: 'Delete documento evidencia by ID',
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

      const existingDocumentoEvidencia = await prisma.documentoEvidencia.findUnique({
        where: { id }
      });

      if (!existingDocumentoEvidencia) {
        return reply.status(404).send({ error: 'DocumentoEvidencia not found' });
      }

      await prisma.documentoEvidencia.delete({
        where: { id }
      });

      return reply.status(200).send({ message: 'DocumentoEvidencia deleted successfully' });
    } catch (error) {
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
};

export default routes;