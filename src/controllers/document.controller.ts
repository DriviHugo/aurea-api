import type { FastifyReply, FastifyRequest } from "fastify";
import {
  DocumentService,
  CreateDocumentInput,
  UpdateDocumentInput,
  DocumentFilters,
} from "../services/document.service";

export class DocumentController {
  constructor(private documentService: DocumentService) {}

  async list(
    request: FastifyRequest<{
      Querystring: {
        page?: number;
        limit?: number;
        caseId?: string;
        type?: string;
        status?: string;
      };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { page = 1, limit = 10, caseId, type, status } = request.query;
      const filters: DocumentFilters = { caseId, type, status };
      const result = await this.documentService.findAll({ page, limit }, filters);
      return reply.status(200).send(result);
    } catch (error) {
      request.log.error(error, "Error listing documents");
      return reply.status(500).send({ error: "Internal server error" });
    }
  }

  async getById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { id } = request.params;
      const document = await this.documentService.findById(id);

      if (!document) {
        return reply.status(404).send({ error: "Document not found" });
      }

      return reply.status(200).send(document);
    } catch (error) {
      request.log.error(error, "Error getting document");
      return reply.status(500).send({ error: "Internal server error" });
    }
  }

  async getByCase(
    request: FastifyRequest<{
      Params: { caseId: string };
      Querystring: { page?: number; limit?: number };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { caseId } = request.params;
      const { page = 1, limit = 10 } = request.query;

      const result = await this.documentService.findByCase(caseId, {
        page,
        limit,
      });

      return reply.status(200).send(result);
    } catch (error) {
      request.log.error(error, "Error getting documents by case");
      return reply.status(500).send({ error: "Internal server error" });
    }
  }

  async create(
    request: FastifyRequest<{ Body: CreateDocumentInput }>,
    reply: FastifyReply
  ) {
    try {
      request.log.info({ body: request.body }, "Creating document");
      const document = await this.documentService.create(request.body);
      return reply.status(201).send(document);
    } catch (error: any) {
      request.log.error(error, "Error creating document");
      if (error.code === "P2003") {
        return reply.status(400).send({ error: "Invalid case ID" });
      }
      return reply.status(500).send({ error: "Internal server error" });
    }
  }

  async update(
    request: FastifyRequest<{
      Params: { id: string };
      Body: UpdateDocumentInput;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { id } = request.params;
      request.log.info({ id, body: request.body }, "Updating document");

      const document = await this.documentService.update(id, request.body);

      if (!document) {
        return reply.status(404).send({ error: "Document not found" });
      }

      return reply.status(200).send(document);
    } catch (error) {
      request.log.error(error, "Error updating document");
      return reply.status(500).send({ error: "Internal server error" });
    }
  }

  async delete(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { id } = request.params;
      const deleted = await this.documentService.delete(id);

      if (!deleted) {
        return reply.status(404).send({ error: "Document not found" });
      }

      return reply.status(204).send();
    } catch (error) {
      request.log.error(error, "Error deleting document");
      return reply.status(500).send({ error: "Internal server error" });
    }
  }
}
