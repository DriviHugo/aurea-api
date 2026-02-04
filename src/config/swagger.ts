import type { SwaggerOptions } from "@fastify/swagger";
import type { FastifySwaggerUiOptions } from "@fastify/swagger-ui";

export const swaggerConfig: SwaggerOptions = {
  mode: "dynamic",
  hideUntagged: true,
  openapi: {
    openapi: "3.1.0",
    info: {
      title: "1MillionBot Boilerplate API",
      description: "A boilerplate API for 1MillionBot projects",
      version: "0.1.0",
    },
    tags: [
      {
        name: "auth",
        description: "Authentication-related endpoints",
      },
      {
        name: "users",
        description: "User management endpoints",
      },
      {
        name: "public",
        description: "Public endpoints accessible with API key authentication",
      },
      {
        name: "apikey",
        description: "API key management endpoints",
      },
    ],
    components: {
      securitySchemes: {
        cookieAccessTokenAuth: {
          type: "apiKey",
          in: "cookie",
          name: "access_token",
        },
        cookieRefreshTokenAuth: {
          type: "apiKey",
          in: "cookie",
          name: "refresh_token",
        },
        apiKeyAuth: {
          type: "apiKey",
          in: "header",
          name: "Authorization",
          description:
            "API Key authentication using the format 'API-Key <token>'",
        },
      },
    },
  },
};

export const swaggerUiConfig: FastifySwaggerUiOptions = {
  routePrefix: "/docs",
  theme: {
    title: "1MillionBot Boilerplate API - Swagger UI",
  },
};
