import { type FastifyInstance } from "fastify";
import { find, create, update, rotate } from "../../controllers/apikey.js";
import {
  apiKeyIdSchema,
  apiKeyResponseSchema,
  createApiKeyBodySchema,
  createApiKeyResponseSchema,
  findApiKeyQuerySchema,
  updateApiKeyBodySchema,
} from "../../schema/apikey.js";

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    handler: find,
    method: "GET",
    onRequest: [fastify.authAccessToken, fastify.allowAdmin],
    url: "/",
    schema: {
      summary: "List API keys",
      description: "Retrieve a list of API keys.",
      tags: ["apikey"],
      security: [
        {
          cookieAccessTokenAuth: [],
        },
      ],
      querystring: findApiKeyQuerySchema,
      response: {
        200: {
          description: "Successful retrieval of API keys.",
          type: "object",
          properties: {
            apiKeys: {
              type: "array",
              items: apiKeyResponseSchema,
            },
          },
        },
      },
    },
  });
  fastify.route({
    handler: create,
    method: "POST",
    onRequest: [fastify.authAccessToken, fastify.allowAdmin],
    url: "/",
    schema: {
      summary: "Create API key",
      description: "Create a new API key for accessing public endpoints.",
      tags: ["apikey"],
      security: [
        {
          cookieAccessTokenAuth: [],
        },
      ],
      body: createApiKeyBodySchema,
      response: {
        201: createApiKeyResponseSchema,
      },
    },
  });

  fastify.route({
    handler: update,
    method: "PATCH",
    onRequest: [fastify.authAccessToken, fastify.allowAdmin],
    url: "/:keyId",
    schema: {
      summary: "Update API key",
      description: "Update an existing API key.",
      tags: ["apikey"],
      security: [
        {
          cookieAccessTokenAuth: [],
        },
      ],
      params: apiKeyIdSchema,
      body: updateApiKeyBodySchema,
      response: {
        200: apiKeyResponseSchema,
      },
    },
  });

  fastify.route({
    handler: rotate,
    method: "PATCH",
    onRequest: [fastify.authAccessToken, fastify.allowAdmin],
    url: "/:keyId/rotate",
    schema: {
      summary: "Rotate API key",
      description: "Rotate an existing API key to generate a new key.",
      tags: ["apikey"],
      security: [
        {
          cookieAccessTokenAuth: [],
        },
      ],
      params: apiKeyIdSchema,
      response: {
        200: createApiKeyResponseSchema,
      },
    },
  });
}
