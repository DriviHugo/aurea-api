import type { FastifyPluginAsync } from 'fastify';
import type { PrismaClient } from '@prisma/client';

const documentoSeccionSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    documentoId: { type: 'string', format: 'uuid' },
    orden: { type: 'integer', minimum: 1 },
    titulo: { type: 'string', minLength: 1, maxLength: 255 },
    descripcion: { type: 'string', nullable: true },
    contenido: { type: 'string', nullable: true },
    estado: { type: 'string', enum: ['pendiente', 'generando', 'completado', 'error'], default: 'pendiente' },
    tokensUsados: { type: 'integer', nullable: true, minimum: 0 },
    tiempoGeneracionMs: { type: 'integer', nullable: true, minimum: 0 },
    articulosLcsp: { type: 'array', items: { type: 'string' } },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' }
  }
};

const createDocumentoSeccionSchema = {
  type: 'object',
  required: ['documentoId', 'orden', 'titulo'],
  properties: {
    documentoId: { type: 'string', format: 'uuid' },
    orden: { type: 'integer', minimum: 1 },
    titulo: { type: 'string', minLength: 1, maxLength: 255 },
    descripcion: { type: 'string' },
    contenido: { type: 'string' },
    estado: { type: 'string', enum: ['pendiente', 'generando', 'completado', 'error'] },
    tokensUsados: { type: 'integer', minimum: 0 },
    tiempoGeneracionMs: { type: 'integer', minimum: 0 },
    articulosLcsp: { type: 'array', items: { type: 'string' } }
  },
  additionalProperties: false
};

const updateDocumentoSeccionSchema = {
  type: 'object',
  properties: {
    orden: { type: 'integer', minimum: 1 },
    titulo: { type: 'string', minLength: 1, maxLength: 255 },
    descripcion: { type: 'string' },
    contenido: { type: 'string' },
    estado: { type: 'string', enum: ['pendiente', 'generando', 'completado', 'error'] },
    tokensUsados: { type: 'integer', minimum: 0 },
    tiempoGeneracionMs: { type: 'integer', minimum: 0 },
    articulosLcsp: { type: 'array', items: { type: 'string' } }
  },
  additionalProperties: false
};

const paginationSchema = {
  type: 'object',
  properties: {
    page: { type: 'integer', minimum: 1, default: 1 },
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
    documentoId: { type: 'string', format: 'uuid' },
    estado: { type: 'string', enum: ['pendiente', 'generando', 'completado', 'error'] }
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

  // GET /documento-secciones - List with pagination and filters
  fastify.get('/', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['DocumentoSeccion'],
      description: 'Get paginated list of documento secciones',
      querystring: paginationSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            data: { type: 'array', items: documentoSeccionSchema },
            total: { type: 'integer' },
            page: { type: 'integer' },
            limit: { type: 'integer' },
            totalPages: { type: 'integer' }
          }
        },
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
      const { page = 1, limit = 10, documentoId, estado } = request.query as {
        page?: number;
        limit?: number;
        documentoId?: string;
        estado?: string;
      };

      const skip = (page - 1) * limit;
      
      const where: any = {};
      if (documentoId) where.documentoId = documentoId;
      if (estado) where.estado = estado;

      const [data, total] = await Promise.all([
        prisma.documentoSeccion.findMany({
          where,
          skip,
          take: limit,
          orderBy: [
            { documentoId: 'asc' },
            { orden: 'asc' }
          ],
          include: {
            documento: {
              select: {
                id: true,
                titulo: true,
                estado: true
              }
            }
          }
        }),
        prisma.documentoSeccion.count({ where })
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

  // GET /documento-secciones/:id - Get by ID
  fastify.get('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['DocumentoSeccion'],
      description: 'Get documento seccion by ID',
      params: idParamSchema,
      response: {
        200: documentoSeccionSchema,
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

      const documentoSeccion = await prisma.documentoSeccion.findUnique({
        where: { id },
        include: {
          documento: {
            select: {
              id: true,
              titulo: true,
              estado: true
            }
          }
        }
      });

      if (!documentoSeccion) {
        return reply.status(404).send({ error: 'Documento seccion not found' });
      }

      return reply.status(200).send(documentoSeccion);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // POST /documento-secciones - Create new
  fastify.post('/', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['DocumentoSeccion'],
      description: 'Create new documento seccion',
      body: createDocumentoSeccionSchema,
      response: {
        201: documentoSeccionSchema,
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
        documentoId: string;
        orden: number;
        titulo: string;
        descripcion?: string;
        contenido?: string;
        estado?: string;
        tokensUsados?: number;
        tiempoGeneracionMs?: number;
        articulosLcsp?: string[];
      };

      // Verify documento exists
      const documento = await prisma.documento.findUnique({
        where: { id: data.documentoId }
      });

      if (!documento) {
        return reply.status(400).send({ error: 'Documento not found' });
      }

      // Check for unique constraint (documentoId + orden)
      const existingSeccion = await prisma.documentoSeccion.findFirst({
        where: {
          documentoId: data.documentoId,
          orden: data.orden
        }
      });

      if (existingSeccion) {
        return reply.status(400).send({ error: 'A section with this order already exists for this document' });
      }

      const documentoSeccion = await prisma.documentoSeccion.create({
        data: {
          documentoId: data.documentoId,
          orden: data.orden,
          titulo: data.titulo,
          descripcion: data.descripcion,
          contenido: data.contenido,
          estado: data.estado || 'pendiente',
          tokensUsados: data.tokensUsados,
          tiempoGeneracionMs: data.tiempoGeneracionMs,
          articulosLcsp: data.articulosLcsp || []
        },
        include: {
          documento: {
            select: {
              id: true,
              titulo: true,
              estado: true
            }
          }
        }
      });

      return reply.status(201).send(documentoSeccion);
    } catch (error) {
      fastify.log.error(error);
      if (error.code === 'P2002') {
        return reply.status(400).send({ error: 'A section with this order already exists for this document' });
      }
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // PUT /documento-secciones/:id - Update
  fastify.put('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['DocumentoSeccion'],
      description: 'Update documento seccion',
      params: idParamSchema,
      body: updateDocumentoSeccionSchema,
      response: {
        200: documentoSeccionSchema,
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
        orden?: number;
        titulo?: string;
        descripcion?: string;
        contenido?: string;
        estado?: string;
        tokensUsados?: number;
        tiempoGeneracionMs?: number;
        articulosLcsp?: string[];
      };

      // Check if documento seccion exists
      const existingSeccion = await prisma.documentoSeccion.findUnique({
        where: { id }
      });

      if (!existingSeccion) {
        return reply.status(404).send({ error: 'Documento seccion not found' });
      }

      // If orden is being updated, check for unique constraint
      if (data.orden && data.orden !== existingSeccion.orden) {
        const conflictingSeccion = await prisma.documentoSeccion.findFirst({
          where: {
            documentoId: existingSeccion.documentoId,
            orden: data.orden,
            id: { not: id }
          }
        });

        if (conflictingSeccion) {
          return reply.status(400).send({ error: 'A section with this order already exists for this document' });
        }
      }

      const documentoSeccion = await prisma.documentoSeccion.update({
        where: { id },
        data: {
          ...(data.orden !== undefined && { orden: data.orden }),
          ...(data.titulo !== undefined && { titulo: data.titulo }),
          ...(data.descripcion !== undefined && { descripcion: data.descripcion }),
          ...(data.contenido !== undefined && { contenido: data.contenido }),
          ...(data.estado !== undefined && { estado: data.estado }),
          ...(data.tokensUsados !== undefined && { tokensUsados: data.tokensUsados }),
          ...(data.tiempoGeneracionMs !== undefined && { tiempoGeneracionMs: data.tiempoGeneracionMs }),
          ...(data.articulosLcsp !== undefined && { articulosLcsp: data.articulosLcsp })
        },
        include: {
          documento: {
            select: {
              id: true,
              titulo: true,
              estado: true
            }
          }
        }
      });

      return reply.status(200).send(documentoSeccion);
    } catch (error) {
      fastify.log.error(error);
      if (error.code === 'P2002') {
        return reply.status(400).send({ error: 'A section with this order already exists for this document' });
      }
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // DELETE /documento-secciones/:id - Delete
  fastify.delete('/:id', {
    preValidation: [fastify.authAccessToken],
    schema: {
      tags: ['DocumentoSeccion'],
      description: 'Delete documento seccion',
      params: idParamSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            id: { type: 'string' }
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

      // Check if documento seccion exists
      const existingSeccion = await prisma.documentoSeccion.findUnique({
        where: { id }
      });

      if (!existingSeccion) {
        return reply.status(404).send({ error: 'Documento seccion not found' });
      }

      await prisma.documentoSeccion.delete({
        where: { id }
      });

      return reply.status(200).send({
        message: 'Documento seccion deleted successfully',
        id
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
};

export default routes;