import type { FastifyInstance } from "fastify";
import { find, findOne, update } from "../../controllers/user.js";
import {
  findUserQuerySchema,
  updateUserBodySchema,
  userIDSchema,
  userResponseSchema,
} from "../../schema/user.js";

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    handler: find,
    method: "GET",
    onRequest: [fastify.authAccessToken],
    preHandler: [fastify.allowAdmin],
    url: "/",
    schema: {
      summary: "List users",
      description: "Retrieve a list of users with optional filtering.",
      tags: ["users"],
      security: [
        {
          cookieAccessTokenAuth: [],
        },
      ],
      querystring: findUserQuerySchema,
      response: {
        200: {
          description: "Successful retrieval of user list.",
          type: "object",
          properties: {
            users: {
              type: "array",
              items: userResponseSchema,
            },
          },
        },
      },
    },
  });

  fastify.route({
    handler: findOne,
    method: "GET",
    onRequest: [fastify.authAccessToken],
    preHandler: [fastify.allowAdmin],
    url: "/:userId",
    schema: {
      summary: "Get user by ID",
      description: "Retrieve a user by their unique ID.",
      tags: ["users"],
      security: [
        {
          cookieAccessTokenAuth: [],
        },
      ],
      params: userIDSchema,
      response: {
        200: userResponseSchema,
      },
    },
  });

  fastify.route({
    handler: update,
    method: "PATCH",
    onRequest: [fastify.authAccessToken],
    preHandler: [fastify.allowAdmin],
    url: "/:userId",
    schema: {
      summary: "Update user",
      description: "Update user details by their unique ID.",
      tags: ["users"],
      security: [
        {
          cookieAccessTokenAuth: [],
        },
      ],
      params: userIDSchema,
      body: updateUserBodySchema,
      response: {
        200: userResponseSchema,
      },
    },
  });
}
