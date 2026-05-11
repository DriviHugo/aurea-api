import type { FastifyInstance } from "fastify";
import * as authController from "../../controllers/auth-simple.js";
import { FEATURE_FLAGS } from "../../env.js";

export default async function authRoutes(app: FastifyInstance): Promise<void> {
  // Login - público
  app.post("/login", {
    schema: {
      body: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 6 },
        },
      },
    },
    handler: authController.login,
  });

  // Register - public, but only enabled if LOCAL_AUTH_ENABLED=true
  if (FEATURE_FLAGS.localAuthRegisterEnabled) {
    app.post("/register", {
      schema: {
        body: {
          type: "object",
          required: ["email", "password", "name"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 6 },
            name: { type: "string", minLength: 1 },
            lastName: { type: "string" },
          },
        },
      },
      handler: authController.register,
    });
  }

  // Me - requiere autenticación
  app.get("/me", {
    preValidation: [app.authAccessToken],
    handler: authController.me,
  });

  // Refresh access token - requiere refresh cookie
  app.post("/refresh", {
    preValidation: [app.authRefreshToken],
    handler: authController.refreshAccessToken,
  });

  // Logout - clear cookies
  app.post("/logout", {
    preValidation: [app.authAccessToken],
    handler: authController.logout,
  });
}
