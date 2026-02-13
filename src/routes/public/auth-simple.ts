import type { FastifyInstance } from "fastify";
import * as authController from "../../controllers/auth-simple.js";

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

  // Register - público
  app.post("/register", {
    schema: {
      body: {
        type: "object",
        required: ["email", "password", "nombre"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 6 },
          nombre: { type: "string", minLength: 1 },
          apellidos: { type: "string" },
        },
      },
    },
    handler: authController.register,
  });

  // Me - requiere autenticación
  app.get("/me", {
    preValidation: [app.authAccessToken],
    handler: authController.me,
  });
}
