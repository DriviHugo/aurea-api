import type { FastifyRequest, FastifyReply } from "fastify";
import prisma from "../config/prisma.js";
import { hashPassword, validatePasswordHash } from "../utils/crypto.js";
import {
  signAccessToken,
  signRefreshToken,
  REFRESH_TOKEN_EXPIRATION_IN_SECONDS,
  ACCESS_TOKEN_EXPIRATION_IN_SECONDS,
} from "../utils/jwt.js";

interface LoginBody {
  email: string;
  password: string;
}

interface RegisterBody {
  email: string;
  password: string;
  nombre: string;
  apellidos?: string;
}

const DUMMY_PASSWORD_HASH =
  "$2b$10$CwTycUXWue0Thq9StjUM0uJ8rQpQ1rQ1rQ1rQ1rQ1rQ1rQ1rQ1rQ";

export const login = async (
  req: FastifyRequest<{ Body: LoginBody }>,
  res: FastifyReply,
): Promise<void> => {
  const { email, password } = req.body;

  // Buscar usuario por email
  const user = await prisma.profile.findUnique({
    where: { email },
  });

  // Validar contraseña
  const passwordHash = user?.password ?? DUMMY_PASSWORD_HASH;
  const passwordCheck = await validatePasswordHash(password, passwordHash);

  if (!user || !passwordCheck || !user.activo) {
    return res.status(401).send({
      error: "Credenciales inválidas",
    });
  }

  // Generar tokens JWT
  const accessToken = signAccessToken({ sub: user.id });
  const refreshToken = signRefreshToken(user.id);

  return res.send({
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: ACCESS_TOKEN_EXPIRATION_IN_SECONDS,
    user: {
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      apellidos: user.apellidos,
    },
  });
};

export const register = async (
  req: FastifyRequest<{ Body: RegisterBody }>,
  res: FastifyReply,
): Promise<void> => {
  const { email, password, nombre, apellidos } = req.body;

  // Verificar si el usuario ya existe
  const existingUser = await prisma.profile.findUnique({
    where: { email },
  });

  if (existingUser) {
    return res.status(400).send({
      error: "El email ya está registrado",
    });
  }

  // Hash de la contraseña
  const hashedPassword = await hashPassword(password);

  // Crear usuario
  const user = await prisma.profile.create({
    data: {
      id: crypto.randomUUID(),
      email,
      password: hashedPassword,
      nombre,
      apellidos,
      activo: true,
    },
  });

  // Generar tokens JWT
  const accessToken = signAccessToken({ sub: user.id });
  const refreshToken = signRefreshToken(user.id);

  return res.status(201).send({
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: ACCESS_TOKEN_EXPIRATION_IN_SECONDS,
    user: {
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      apellidos: user.apellidos,
    },
  });
};

export const me = async (
  req: FastifyRequest,
  res: FastifyReply,
): Promise<void> => {
  // @ts-ignore - userId viene del middleware de autenticación
  const userId = req.user?.sub;

  if (!userId) {
    return res.status(401).send({ error: "No autenticado" });
  }

  const user = await prisma.profile.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      nombre: true,
      apellidos: true,
      unidad: true,
      activo: true,
    },
  });

  if (!user) {
    return res.status(404).send({ error: "Usuario no encontrado" });
  }

  return res.send({ user });
};
