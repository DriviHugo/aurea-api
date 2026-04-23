import type { FastifyInstance } from "fastify";
import * as authController from "../../controllers/auth-simple.js";

export default async function authRoutes(app: FastifyInstance): Promise<void> {
  app.get("/me", {
    preValidation: [app.authAccessToken],
    handler: authController.me,
  });

  app.post("/refresh", {
    preValidation: [app.authRefreshToken],
    handler: authController.refreshAccessToken,
  });

  app.post("/logout", {
    preValidation: [app.authAccessToken],
    handler: authController.logout,
  });
}
