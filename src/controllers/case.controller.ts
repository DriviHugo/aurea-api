import type { FastifyReply, FastifyRequest } from "fastify";
import { CaseService, CreateCaseInput, UpdateCaseInput } from "../services/case.service";

export class CaseController {
  constructor(private caseService: CaseService) {}

  async list(
    request: FastifyRequest<{
      Querystring: { page?: number; limit?: number };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { page = 1, limit = 10 } = request.query;
      const result = await this.caseService.findAll({ page, limit });
      return reply.status(200).send(result);
    } catch (error) {
      request.log.error(error, "Error listing cases");
      return reply.status(500).send({ error: "Internal server error" });
    }
  }

  async getById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { id } = request.params;
      const caseData = await this.caseService.findById(id);

      if (!caseData) {
        return reply.status(404).send({ error: "Case not found" });
      }

      return reply.status(200).send(caseData);
    } catch (error) {
      request.log.error(error, "Error getting case");
      return reply.status(500).send({ error: "Internal server error" });
    }
  }

  async getByCode(
    request: FastifyRequest<{ Params: { code: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { code } = request.params;
      const caseData = await this.caseService.findByCode(code);

      if (!caseData) {
        return reply.status(404).send({ error: "Case not found" });
      }

      return reply.status(200).send(caseData);
    } catch (error) {
      request.log.error(error, "Error getting case by code");
      return reply.status(500).send({ error: "Internal server error" });
    }
  }

  async create(
    request: FastifyRequest<{ Body: CreateCaseInput }>,
    reply: FastifyReply
  ) {
    try {
      request.log.info({ body: request.body }, "Creating case");
      const caseData = await this.caseService.create(request.body);
      return reply.status(201).send(caseData);
    } catch (error: any) {
      request.log.error(error, "Error creating case");
      if (error.code === "P2002") {
        return reply
          .status(400)
          .send({ error: "Case with this code already exists" });
      }
      return reply.status(500).send({ error: "Internal server error" });
    }
  }

  async update(
    request: FastifyRequest<{
      Params: { id: string };
      Body: UpdateCaseInput;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { id } = request.params;
      request.log.info({ id, body: request.body }, "Updating case");

      const caseData = await this.caseService.update(id, request.body);

      if (!caseData) {
        return reply.status(404).send({ error: "Case not found" });
      }

      return reply.status(200).send(caseData);
    } catch (error: any) {
      request.log.error(error, "Error updating case");
      if (error.code === "P2002") {
        return reply
          .status(400)
          .send({ error: "A case with this code already exists" });
      }
      return reply.status(500).send({ error: "Internal server error" });
    }
  }

  async delete(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { id } = request.params;
      const deleted = await this.caseService.delete(id);

      if (!deleted) {
        return reply.status(404).send({ error: "Case not found" });
      }

      return reply.status(204).send();
    } catch (error) {
      request.log.error(error, "Error deleting case");
      return reply.status(500).send({ error: "Internal server error" });
    }
  }

  async getByCreator(
    request: FastifyRequest<{
      Params: { creatorId: string };
      Querystring: { page?: number; limit?: number };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { creatorId } = request.params;
      const { page = 1, limit = 10 } = request.query;

      const result = await this.caseService.findByCreator(creatorId, {
        page,
        limit,
      });

      return reply.status(200).send(result);
    } catch (error) {
      request.log.error(error, "Error getting cases by creator");
      return reply.status(500).send({ error: "Internal server error" });
    }
  }
}
