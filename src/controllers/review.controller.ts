import type { FastifyReply, FastifyRequest } from "fastify";
import type {
  ReviewService,
  CreateReviewInput,
  UpdateReviewInput,
  ReviewFilters,
} from "../services/review.service.js";

export class ReviewController {
  constructor(private reviewService: ReviewService) {}

  async list(
    request: FastifyRequest<{
      Querystring: {
        page?: number;
        limit?: number;
        caseId?: string;
        userId?: string;
        decision?: string;
      };
    }>,
    reply: FastifyReply,
  ): Promise<FastifyReply> {
    try {
      const { page = 1, limit = 10, caseId, userId, decision } = request.query;

      const filters: ReviewFilters = {};
      if (caseId !== undefined && caseId !== "") filters.caseId = caseId;
      if (userId !== undefined && userId !== "") filters.userId = userId;
      if (decision !== undefined && decision !== "") {
        filters.decision = decision;
      }

      const result = await this.reviewService.findAll({ page, limit }, filters);
      return reply.status(200).send(result);
    } catch (error) {
      request.log.error(error, "Error listing reviews");
      return reply.status(500).send({ error: "Internal server error" });
    }
  }

  async getById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ): Promise<FastifyReply> {
    try {
      const { id } = request.params;
      const review = await this.reviewService.findById(id);

      if (review === null) {
        return reply.status(404).send({ error: "Review not found" });
      }

      return reply.status(200).send(review);
    } catch (error) {
      request.log.error(error, "Error getting review");
      return reply.status(500).send({ error: "Internal server error" });
    }
  }

  async getByCase(
    request: FastifyRequest<{
      Params: { caseId: string };
      Querystring: { page?: number; limit?: number };
    }>,
    reply: FastifyReply,
  ): Promise<FastifyReply> {
    try {
      const { caseId } = request.params;
      const { page = 1, limit = 10 } = request.query;

      const result = await this.reviewService.findByCase(caseId, {
        page,
        limit,
      });

      return reply.status(200).send(result);
    } catch (error) {
      request.log.error(error, "Error getting reviews by case");
      return reply.status(500).send({ error: "Internal server error" });
    }
  }

  async create(
    request: FastifyRequest<{ Body: CreateReviewInput }>,
    reply: FastifyReply,
  ): Promise<FastifyReply> {
    try {
      request.log.info({ body: request.body }, "Creating review");
      const review = await this.reviewService.create(request.body);
      return reply.status(201).send(review);
    } catch (error: unknown) {
      request.log.error(error, "Error creating review");
      const err = error as { code?: string };
      if (err.code === "P2003") {
        return reply.status(400).send({ error: "Invalid case or user ID" });
      }
      return reply.status(500).send({ error: "Internal server error" });
    }
  }

  async update(
    request: FastifyRequest<{
      Params: { id: string };
      Body: UpdateReviewInput;
    }>,
    reply: FastifyReply,
  ): Promise<FastifyReply> {
    try {
      const { id } = request.params;
      request.log.info({ id, body: request.body }, "Updating review");

      const review = await this.reviewService.update(id, request.body);

      if (review === null) {
        return reply.status(404).send({ error: "Review not found" });
      }

      return reply.status(200).send(review);
    } catch (error) {
      request.log.error(error, "Error updating review");
      return reply.status(500).send({ error: "Internal server error" });
    }
  }

  async delete(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ): Promise<FastifyReply> {
    try {
      const { id } = request.params;
      const deleted = await this.reviewService.delete(id);

      if (!deleted) {
        return reply.status(404).send({ error: "Review not found" });
      }

      return reply.status(204).send();
    } catch (error) {
      request.log.error(error, "Error deleting review");
      return reply.status(500).send({ error: "Internal server error" });
    }
  }
}
