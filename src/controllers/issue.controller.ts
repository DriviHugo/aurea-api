import type { FastifyReply, FastifyRequest } from "fastify";
import {
  IssueService,
  CreateIssueInput,
  UpdateIssueInput,
  IssueFilters,
} from "../services/issue.service";

export class IssueController {
  constructor(private issueService: IssueService) {}

  async list(
    request: FastifyRequest<{
      Querystring: {
        page?: number;
        limit?: number;
        userId?: string;
        status?: string;
      };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { page = 1, limit = 10, userId, status } = request.query;
      const filters: IssueFilters = { userId, status };
      const result = await this.issueService.findAll({ page, limit }, filters);
      return reply.status(200).send(result);
    } catch (error) {
      request.log.error(error, "Error listing issues");
      return reply.status(500).send({ error: "Internal server error" });
    }
  }

  async getById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { id } = request.params;
      const issue = await this.issueService.findById(id);

      if (!issue) {
        return reply.status(404).send({ error: "Issue not found" });
      }

      return reply.status(200).send(issue);
    } catch (error) {
      request.log.error(error, "Error getting issue");
      return reply.status(500).send({ error: "Internal server error" });
    }
  }

  async getByUser(
    request: FastifyRequest<{
      Params: { userId: string };
      Querystring: { page?: number; limit?: number };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { userId } = request.params;
      const { page = 1, limit = 10 } = request.query;

      const result = await this.issueService.findByUser(userId, {
        page,
        limit,
      });

      return reply.status(200).send(result);
    } catch (error) {
      request.log.error(error, "Error getting issues by user");
      return reply.status(500).send({ error: "Internal server error" });
    }
  }

  async create(
    request: FastifyRequest<{ Body: CreateIssueInput }>,
    reply: FastifyReply
  ) {
    try {
      request.log.info({ body: request.body }, "Creating issue");
      const issue = await this.issueService.create(request.body);
      return reply.status(201).send(issue);
    } catch (error: any) {
      request.log.error(error, "Error creating issue");
      if (error.code === "P2003") {
        return reply.status(400).send({ error: "Invalid user ID" });
      }
      return reply.status(500).send({ error: "Internal server error" });
    }
  }

  async update(
    request: FastifyRequest<{
      Params: { id: string };
      Body: UpdateIssueInput;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { id } = request.params;
      request.log.info({ id, body: request.body }, "Updating issue");

      const issue = await this.issueService.update(id, request.body);

      if (!issue) {
        return reply.status(404).send({ error: "Issue not found" });
      }

      return reply.status(200).send(issue);
    } catch (error) {
      request.log.error(error, "Error updating issue");
      return reply.status(500).send({ error: "Internal server error" });
    }
  }

  async updateStatus(
    request: FastifyRequest<{
      Params: { id: string };
      Body: { status: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { id } = request.params;
      const { status } = request.body;

      request.log.info({ id, status }, "Updating issue status");

      const issue = await this.issueService.updateStatus(id, status);

      if (!issue) {
        return reply.status(404).send({ error: "Issue not found" });
      }

      return reply.status(200).send(issue);
    } catch (error) {
      request.log.error(error, "Error updating issue status");
      return reply.status(500).send({ error: "Internal server error" });
    }
  }

  async delete(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { id } = request.params;
      const deleted = await this.issueService.delete(id);

      if (!deleted) {
        return reply.status(404).send({ error: "Issue not found" });
      }

      return reply.status(204).send();
    } catch (error) {
      request.log.error(error, "Error deleting issue");
      return reply.status(500).send({ error: "Internal server error" });
    }
  }
}
