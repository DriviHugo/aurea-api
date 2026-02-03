import type { FastifyInstance } from "fastify";
import {
  register,
  validateEmail,
  forgotPassword,
  resetPassword,
  login,
  refreshToken,
  logout,
  deleteSession,
  listSessions,
  extendRefreshToken,
  getMe,
  updateMe,
} from "../../controllers/auth.js";
import {
  registerBodySchema,
  resetPasswordBodySchema,
  loginBodySchema,
  forgotPasswordBodySchema,
  deleteSessionParamsSchema,
  listSessionsResponseSchema,
  updateMeBodySchema,
  getMeResponseSchema,
} from "../../schema/auth.js";
import { basicResponseSchema } from "../../schema/common.js";

export default async (fastify: FastifyInstance): Promise<void> => {
  fastify.route({
    handler: login,
    method: "POST",
    schema: {
      summary: "User login",
      description: "Authenticate a user and return access and refresh tokens.",
      tags: ["auth"],
      body: loginBodySchema,
      response: {
        200: {
          description:
            "Successful login, returns access and refresh tokens in cookies.",
          type: "null",
          headers: {
            "Set-Cookie": {
              type: "string",
              description:
                "__Secure-access_token and __Secure-refresh_token cookies",
            },
          },
        },
      },
    },
    url: "/login",
  });

  fastify.route({
    handler: logout,
    method: "POST",
    onRequest: [fastify.authAccessToken],
    url: "/logout",
    schema: {
      summary: "User logout",
      description: "Clear access and refresh tokens from cookies.",
      tags: ["auth"],
      security: [
        {
          cookieAccessTokenAuth: [],
        },
      ],
      response: {
        204: {
          description: "Successful logout, clears access and refresh tokens.",
          type: "null",
        },
      },
    },
  });

  fastify.route({
    handler: refreshToken,
    method: "POST",
    onRequest: [fastify.authRefreshToken],
    url: "/refresh",
    schema: {
      summary: "Refresh access token",
      description:
        "Refresh the access token using the refresh token cookie. Returns new access token in cookie.",
      tags: ["auth"],
      security: [
        {
          cookieRefreshTokenAuth: [],
        },
      ],
      response: {
        200: {
          description:
            "Successful refresh, returns new access token in cookie.",
          type: "null",
          headers: {
            "Set-Cookie": {
              type: "string",
              description: "__Secure-access_token cookie",
            },
          },
        },
      },
    },
  });

  fastify.route({
    handler: extendRefreshToken,
    method: "POST",
    onRequest: [fastify.authRefreshToken],
    url: "/refresh/extend",
    schema: {
      summary: "Extend refresh token",
      description:
        "Extend the expiration of the refresh token. Returns new refresh token in cookie.",
      tags: ["auth"],
      security: [
        {
          cookieRefreshTokenAuth: [],
        },
      ],
      response: {
        200: {
          description:
            "Successful extension, returns new refresh token in cookie.",
          type: "null",
          headers: {
            "Set-Cookie": {
              type: "string",
              description: "__Secure-refresh_token cookie",
            },
          },
        },
      },
    },
  });

  fastify.route({
    handler: register,
    method: "POST",
    schema: {
      summary: "User registration",
      description: "Register a new user and send email validation.",
      tags: ["auth"],
      body: registerBodySchema,
      response: {
        201: {
          description:
            "Successful registration, sends email validation link to user.",
          type: "null",
        },
      },
    },
    url: "/register",
  });

  fastify.route({
    handler: validateEmail,
    method: "GET",
    schema: {
      summary: "Validate user email",
      description: "Validate the user's email using a token.",
      tags: ["auth"],
      querystring: {
        type: "object",
        properties: {
          token: {
            type: "string",
            description: "Email validation token",
          },
        },
        required: ["token"],
      },
      response: {
        200: {
          description: "Email successfully validated.",
          type: "null",
        },
      },
    },
    url: "/register/validate",
  });

  fastify.route({
    handler: forgotPassword,
    method: "POST",
    schema: {
      summary: "Forgot password",
      description: "Request a password reset link for the user.",
      tags: ["auth"],
      body: forgotPasswordBodySchema,
      response: {
        200: basicResponseSchema,
      },
    },
    url: "/forgot-password",
  });

  fastify.route({
    handler: resetPassword,
    method: "POST",
    schema: {
      summary: "Reset password",
      description: "Reset the user's password using a token.",
      tags: ["auth"],
      body: resetPasswordBodySchema,
      response: {
        200: {
          description: "Password successfully reset.",
          type: "null",
        },
      },
    },
    url: "/reset-password",
  });

  fastify.route({
    handler: listSessions,
    method: "GET",
    onRequest: [fastify.authAccessToken],
    url: "/sessions",
    schema: {
      summary: "List user sessions",
      description: "Get a list of active sessions for the authenticated user.",
      security: [
        {
          cookieAccessTokenAuth: [],
        },
      ],
      tags: ["auth"],
      response: {
        200: listSessionsResponseSchema,
      },
    },
  });

  fastify.route({
    handler: deleteSession,
    method: "DELETE",
    onRequest: [fastify.authAccessToken],
    url: "/sessions/:sessionId",
    schema: {
      summary: "Delete user session",
      description: "Delete session for the authenticated user.",
      security: [
        {
          cookieAccessTokenAuth: [],
        },
      ],
      params: deleteSessionParamsSchema,
      tags: ["auth"],
      response: {
        204: {
          description: "Session successfully deleted.",
          type: "null",
        },
      },
    },
  });

  fastify.route({
    handler: getMe,
    method: "GET",
    onRequest: [fastify.authAccessToken],
    url: "/me",
    schema: {
      summary: "Get authenticated user",
      description: "Retrieve the authenticated user's details.",
      security: [
        {
          cookieAccessTokenAuth: [],
        },
      ],
      tags: ["auth"],
      response: {
        200: getMeResponseSchema,
      },
    },
  });

  fastify.route({
    handler: updateMe,
    method: "PATCH",
    onRequest: [fastify.authAccessToken],
    url: "/me",
    schema: {
      summary: "Update authenticated user",
      description: "Update the authenticated user's details.",
      security: [
        {
          cookieAccessTokenAuth: [],
        },
      ],
      tags: ["auth"],
      body: updateMeBodySchema,
      response: {
        200: getMeResponseSchema,
      },
    },
  });
};
