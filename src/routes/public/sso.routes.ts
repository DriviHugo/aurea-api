/**
 * SSO Routes - OpenAM/OIDC Authentication Endpoints
 *
 * Implements the full OIDC authorization code flow:
 * 1. /sso/login - Redirects to OpenAM
 * 2. /sso/callback - Handles OpenAM callback
 * 3. /sso/logout - SSO logout
 * 4. /sso/status - Check SSO availability
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { getOIDCService } from "../../services/oidc.service.js";
import logger from "../../config/logger.js";

// Cookie configuration
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env["NODE_ENV"] === "production",
  sameSite: "lax" as const,
  path: "/",
};

const ACCESS_TOKEN_COOKIE =
  process.env["NODE_ENV"] === "production"
    ? "__Secure-access_token"
    : "access_token";

const REFRESH_TOKEN_COOKIE =
  process.env["NODE_ENV"] === "production"
    ? "__Secure-refresh_token"
    : "refresh_token";

export default async function ssoRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /sso/status
   * Returns SSO configuration status
   */
  app.get("/status", {
    schema: {
      summary: "Check SSO availability",
      description: "Returns whether SSO/OIDC is configured and available",
      tags: ["auth", "sso"],
      response: {
        200: {
          type: "object",
          properties: {
            ssoEnabled: { type: "boolean" },
            provider: { type: "string" },
            message: { type: "string" },
          },
        },
      },
    },
    handler: async (_request: FastifyRequest, _reply: FastifyReply) => {
      const oidcService = getOIDCService();
      const isConfigured =
        oidcService !== null && oidcService.isConfigured() === true;

      return {
        ssoEnabled: isConfigured,
        provider: isConfigured ? "OpenAM/OIDC" : "none",
        message: isConfigured
          ? "SSO disponible. Use /sso/login para iniciar sesiÃ³n."
          : "SSO no configurado. Use login local con email/password.",
      };
    },
  });

  /**
   * GET /sso/login
   * Initiates OIDC login flow - redirects to OpenAM
   */
  app.get(
    "/login",
    {
      schema: {
        summary: "Initiate SSO login",
        description: "Redirects to OpenAM for authentication",
        tags: ["auth", "sso"],
        querystring: {
          type: "object",
          properties: {
            returnUrl: {
              type: "string",
              description: "URL to redirect after successful login",
            },
          },
        },
        response: {
          302: {
            type: "null",
            description: "Redirect to OpenAM",
          },
          503: {
            type: "object",
            properties: {
              error: { type: "string" },
              message: { type: "string" },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Querystring: { returnUrl?: string } }>,
      reply: FastifyReply,
    ) => {
      const oidcService = getOIDCService();

      if (oidcService === null || oidcService.isConfigured() === false) {
        return reply.status(503).send({
          error: "sso_not_configured",
          message:
            "SSO no estÃ¡ configurado. Configure OIDC_ISSUER_URL en las variables de entorno.",
        });
      }

      try {
        const { url } = oidcService.getAuthorizationUrl(
          request.query.returnUrl,
        );

        logger.info({
          event: "sso_login_redirect",
          returnUrl: request.query.returnUrl,
          ip: request.ip,
        });

        return reply.status(302).redirect(url);
      } catch (error) {
        logger.error({
          event: "sso_login_error",
          error: error instanceof Error ? error.message : "Unknown error",
        });
        return reply.status(500).send({
          error: "sso_error",
          message: "Error al iniciar el proceso de autenticaciÃ³n SSO",
        });
      }
    },
  );

  /**
   * GET /sso/callback
   * Handles OpenAM callback after authentication
   */
  app.get(
    "/callback",
    {
      schema: {
        summary: "SSO callback handler",
        description: "Handles the callback from OpenAM after authentication",
        tags: ["auth", "sso"],
        querystring: {
          type: "object",
          properties: {
            code: { type: "string", description: "Authorization code" },
            state: { type: "string", description: "State parameter" },
            error: { type: "string", description: "Error code if auth failed" },
            error_description: { type: "string", description: "Error details" },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Querystring: {
          code?: string;
          state?: string;
          error?: string;
          error_description?: string;
        };
      }>,
      reply: FastifyReply,
    ) => {
      const oidcService = getOIDCService();

      if (oidcService === null || oidcService.isConfigured() === false) {
        return reply.status(503).send({
          error: "sso_not_configured",
          message: "SSO no estÃ¡ configurado",
        });
      }

      const { code, state, error, error_description } = request.query;

      // Handle authentication errors from OpenAM
      if (error !== undefined && error !== "") {
        logger.error({
          event: "sso_callback_error",
          error,
          error_description,
        });

        // Redirect to frontend with error
        const frontendUrl =
          process.env["FRONTEND_BASE_URL"] ?? "http://localhost:5173";
        return reply
          .status(302)
          .redirect(
            `${frontendUrl}/login?error=${encodeURIComponent(error)}&message=${encodeURIComponent(error_description ?? "Error de autenticaciÃ³n")}`,
          );
      }

      if (
        code === undefined ||
        code === "" ||
        state === undefined ||
        state === ""
      ) {
        return reply.status(400).send({
          error: "invalid_callback",
          message: "Faltan parÃ¡metros requeridos (code, state)",
        });
      }

      try {
        // Exchange code for tokens and get/create user
        const callbackUrl = request.url;
        const result = await oidcService.handleCallback(callbackUrl, state);

        // Set cookies with tokens
        reply.setCookie(ACCESS_TOKEN_COOKIE, result.accessToken, {
          ...COOKIE_OPTIONS,
          maxAge: result.expiresIn,
          signed: true,
        });

        reply.setCookie(REFRESH_TOKEN_COOKIE, result.refreshToken, {
          ...COOKIE_OPTIONS,
          maxAge: 30 * 24 * 60 * 60, // 30 days
          signed: true,
        });

        logger.info({
          event: "sso_callback_success",
          userId: result.user.id,
          email: result.user.email,
          isNewUser: result.isNewUser,
        });

        // Redirect to frontend
        const frontendUrl =
          process.env["FRONTEND_BASE_URL"] ?? "http://localhost:5173";
        const returnUrl = oidcService.getReturnUrl(state) ?? "/";

        // Build redirect URL with user info (for frontend state)
        const redirectUrl = new URL(
          returnUrl.startsWith("http")
            ? returnUrl
            : `${frontendUrl}${returnUrl}`,
        );
        redirectUrl.searchParams.set("sso_success", "true");

        return reply.status(302).redirect(redirectUrl.toString());
      } catch (error) {
        logger.error({
          event: "sso_callback_failed",
          error: error instanceof Error ? error.message : "Unknown error",
        });

        const frontendUrl =
          process.env["FRONTEND_BASE_URL"] ?? "http://localhost:5173";
        return reply
          .status(302)
          .redirect(
            `${frontendUrl}/login?error=sso_failed&message=${encodeURIComponent("Error al procesar la autenticaciÃ³n SSO")}`,
          );
      }
    },
  );

  /**
   * POST /sso/logout
   * Initiates SSO logout
   */
  app.post(
    "/logout",
    {
      schema: {
        summary: "SSO logout",
        description: "Logs out from local session and optionally from OpenAM",
        tags: ["auth", "sso"],
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              logoutUrl: { type: "string", nullable: true },
              message: { type: "string" },
            },
          },
        },
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      // Clear local cookies
      reply.clearCookie(ACCESS_TOKEN_COOKIE, { path: "/" });
      reply.clearCookie(REFRESH_TOKEN_COOKIE, { path: "/" });

      // Get SSO logout URL if available
      const oidcService = getOIDCService();
      const logoutUrl = oidcService?.getLogoutUrl() ?? null;

      logger.info({
        event: "sso_logout",
        hasLogoutUrl: logoutUrl !== null && logoutUrl !== "",
      });

      return {
        success: true,
        logoutUrl,
        message:
          logoutUrl !== null && logoutUrl !== ""
            ? "SesiÃ³n local cerrada. Redirige a logoutUrl para cerrar sesiÃ³n en OpenAM."
            : "SesiÃ³n cerrada correctamente.",
      };
    },
  );

  /**
   * GET /sso/userinfo
   * Returns current user info from session (for debugging)
   */
  app.get(
    "/userinfo",
    {
      preValidation: [app.authAccessToken],
      schema: {
        summary: "Get SSO user info",
        description: "Returns current authenticated user information",
        tags: ["auth", "sso"],
        security: [{ cookieAccessTokenAuth: [] }],
        response: {
          200: {
            type: "object",
            properties: {
              userId: { type: "string" },
              sessionId: { type: "string" },
              ssoEnabled: { type: "boolean" },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, _reply: FastifyReply) => {
      const oidcService = getOIDCService();

      return {
        userId: request.userId,
        sessionId: request.sessionId,
        ssoEnabled: oidcService?.isConfigured() === true,
      };
    },
  );
}
