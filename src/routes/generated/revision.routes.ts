import type { FastifyPluginAsync } from 'fastify';
import type { PrismaClient } from '@prisma/client';

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // List revisions with pagination
  fastify.get('/', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['Revisions'],
      description: 'Get paginated list of revisions',
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
          expedienteId: { type: 'string', format: 'uuid' },
          documentoId: { type: 'string', format: 'uuid' },
          usuarioId: { type: 'string', format: 'uuid' },
          rol: { type: 'string', enum: ['ADMIN', 'REVISOR', 'USUARIO'] },
          decision: { type: 'string', enum: ['APROBADO', 'RECHAZADO', 'PENDIENTE'] }
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
                  expedienteId: { type: 'string', format: 'uuid' },
                  documentoId: { type: 'string', format: 'uuid', nullable: true },
                  usuarioId: { type: 'string', format: 'uuid' },
                  rol: { type: 'string', enum: ['ADMIN', 'REVISOR', 'USUARIO'] },
                  cambioDescripcion: { type: 'string' },
                  decision: { type: 'string', enum: ['APROBADO', 'RECHAZADO', 'PENDIENTE'] },
                  motivo: { type: 'string', nullable: true },
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
      const { page = 1, limit = 10, expedienteId, documentoId, usuarioId, rol, decision } = request.query as any;
      const skip = (page - 1) * limit;

      const where: any = {};
      if (expedienteId) where.expedienteId = expedienteId;
      if (documentoId) where.documentoId = documentoId;
      if (usuarioId) where.usuarioId = usuarioId;
      if (rol) where.rol = rol;
      if (decision) where.decision = decision;

      const [revisions, total] = await Promise.all([
        prisma.revision.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.revision.count({ where })
      ]);

      const totalPages = Math.ceil(total / limit);

      return reply.status(200).send({
        data: revisions,
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

  // Get revision by ID
  fastify.get('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['Revisions'],
      description: 'Get revision by ID',
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
            expedienteId: { type: 'string', format: 'uuid' },
            documentoId: { type: 'string', format: 'uuid', nullable: true },
            usuarioId: { type: 'string', format: 'uuid' },
            rol: { type: 'string', enum: ['ADMIN', 'REVISOR', 'USUARIO'] },
            cambioDescripcion: { type: 'string' },
            decision: { type: 'string', enum: ['APROBADO', 'RECHAZADO', 'PENDIENTE'] },
            motivo: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            expediente: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                numero: { type: 'string' },
                titulo: { type: 'string' }
              }
            },
            documento: {
              type: 'object',
              nullable: true,
              properties: {
                id: { type: 'string', format: 'uuid' },
                nombre: { type: 'string' },
                tipo: { type: 'string' }
              }
            },
            comentarios: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  contenido: { type: 'string' },
                  createdAt: { type: 'string', format: 'date-time' }
                }
              }
            }
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

      const revision = await prisma.revision.findUnique({
        where: { id },
        include: {
          expediente: {
            select: {
              id: true,
              numero: true,
              titulo: true
            }
          },
          documento: {
            select: {
              id: true,
              nombre: true,
              tipo: true
            }
          },
          comentarios: {
            select: {
              id: true,
              contenido: true,
              createdAt: true
            },
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      if (!revision) {
        return reply.status(404).send({ error: 'Revision not found' });
      }

      return reply.status(200).send(revision);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Create revision
  fastify.post('/', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['Revisions'],
      description: 'Create a new revision',
      body: {
        type: 'object',
        required: ['expedienteId', 'usuarioId', 'rol', 'cambioDescripcion', 'decision'],
        properties: {
          expedienteId: { type: 'string', format: 'uuid' },
          documentoId: { type: 'string', format: 'uuid', nullable: true },
          usuarioId: { type: 'string', format: 'uuid' },
          rol: { type: 'string', enum: ['ADMIN', 'REVISOR', 'USUARIO'] },
          cambioDescripcion: { type: 'string', minLength: 1, maxLength: 1000 },
          decision: { type: 'string', enum: ['APROBADO', 'RECHAZADO', 'PENDIENTE'] },
          motivo: { type: 'string', maxLength: 500, nullable: true }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            expedienteId: { type: 'string', format: 'uuid' },
            documentoId: { type: 'string', format: 'uuid', nullable: true },
            usuarioId: { type: 'string', format: 'uuid' },
            rol: { type: 'string', enum: ['ADMIN', 'REVISOR', 'USUARIO'] },
            cambioDescripcion: { type: 'string' },
            decision: { type: 'string', enum: ['APROBADO', 'RECHAZADO', 'PENDIENTE'] },
            motivo: { type: 'string', nullable: true },
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
      const { expedienteId, documentoId, usuarioId, rol, cambioDescripcion, decision, motivo } = request.body as any;

      // Verify expediente exists
      const expediente = await prisma.expediente.findUnique({
        where: { id: expedienteId }
      });

      if (!expediente) {
        return reply.status(400).send({ error: 'Expediente not found' });
      }

      // Verify documento exists if provided
      if (documentoId) {
        const documento = await prisma.documento.findUnique({
          where: { id: documentoId }
        });

        if (!documento) {
          return reply.status(400).send({ error: 'Documento not found' });
        }
      }

      const revision = await prisma.revision.create({
        data: {
          expedienteId,
          documentoId: documentoId || null,
          usuarioId,
          rol,
          cambioDescripcion,
          decision,
          motivo: motivo || null
        }
      });

      return reply.status(201).send(revision);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Update revision
  fastify.put('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['Revisions'],
      description: 'Update revision by ID',
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
          expedienteId: { type: 'string', format: 'uuid' },
          documentoId: { type: 'string', format: 'uuid', nullable: true },
          usuarioId: { type: 'string', format: 'uuid' },
          rol: { type: 'string', enum: ['ADMIN', 'REVISOR', 'USUARIO'] },
          cambioDescripcion: { type: 'string', minLength: 1, maxLength: 1000 },
          decision: { type: 'string', enum: ['APROBADO', 'RECHAZADO', 'PENDIENTE'] },
          motivo: { type: 'string', maxLength: 500, nullable: true }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            expedienteId: { type: 'string', format: 'uuid' },
            documentoId: { type: 'string', format: 'uuid', nullable: true },
            usuarioId: { type: 'string', format: 'uuid' },
            rol: { type: 'string', enum: ['ADMIN', 'REVISOR', 'USUARIO'] },
            cambioDescripcion: { type: 'string' },
            decision: { type: 'string', enum: ['APROBADO', 'RECHAZADO', 'PENDIENTE'] },
            motivo: { type: 'string', nullable: true },
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
      const updateData = request.body as any;

      // Check if revision exists
      const existingRevision = await prisma.revision.findUnique({
        where: { id }
      });

      if (!existingRevision) {
        return reply.status(404).send({ error: 'Revision not found' });
      }

      // Verify expediente exists if being updated
      if (updateData.expedienteId) {
        const expediente = await prisma.expediente.findUnique({
          where: { id: updateData.expedienteId }
        });

        if (!expediente) {
          return reply.status(400).send({ error: 'Expediente not found' });
        }
      }

      // Verify documento exists if being updated
      if (updateData.documentoId) {
        const documento = await prisma.documento.findUnique({
          where: { id: updateData.documentoId }
        });

        if (!documento) {
          return reply.status(400).send({ error: 'Documento not found' });
        }
      }

      const revision = await prisma.revision.update({
        where: { id },
        data: {
          ...updateData,
          documentoId: updateData.documentoId || null,
          motivo: updateData.motivo || null
        }
      });

      return reply.status(200).send(revision);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Delete revision
  fastify.delete('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['Revisions'],
      description: 'Delete revision by ID',
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

      // Check if revision exists
      const revision = await prisma.revision.findUnique({
        where: { id }
      });

      if (!revision) {
        return reply.status(404).send({ error: 'Revision not found' });
      }

      await prisma.revision.delete({
        where: { id }
      });

      return reply.status(200).send({ message: 'Revision deleted successfully' });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
};

export default routes;