import type { FastifyRequest, FastifyReply } from "fastify";
import prisma from "../config/prisma.js";
import {
  hashPassword,
  validatePasswordHash,
  generateRandomHexToken,
} from "../utils/crypto.js";
import {
  signAccessToken,
  signRefreshToken,
  ACCESS_TOKEN_EXPIRATION_IN_SECONDS,
  REFRESH_TOKEN_EXPIRATION_IN_SECONDS,
} from "../utils/jwt.js";

interface LoginBody {
  email: string;
  password: string;
}

interface RegisterBody {
  email: string;
  password: string;
  name: string;
  lastName?: string;
}

const DUMMY_PASSWORD_HASH =
  "$2b$10$CwTycUXWue0Thq9StjUM0uJ8rQpQ1rQ1rQ1rQ1rQ1rQ1rQ1rQ1rQ";

export const login = async (
  req: FastifyRequest<{ Body: LoginBody }>,
  res: FastifyReply,
): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await prisma.profile.findUnique({
      where: { email },
    });

    const passwordHash = user?.password ?? DUMMY_PASSWORD_HASH;
    const passwordCheck = await validatePasswordHash(password, passwordHash);

    if (user === null || !passwordCheck || user.active !== true) {
      return res.status(401).send({
        error: "Invalid credentials",
      });
    }

    const sessionId = generateRandomHexToken(32);
    const accessToken = signAccessToken({ sub: user.id, jti: sessionId });
    const refreshToken = signRefreshToken(sessionId);

    return res
      .setCookie(
        process.env["NODE_ENV"] === "production"
          ? "__Secure-access_token"
          : "access_token",
        accessToken,
        {
          httpOnly: true,
          secure: process.env["NODE_ENV"] === "production",
          sameSite: "lax",
          path: "/api/private",
          maxAge: ACCESS_TOKEN_EXPIRATION_IN_SECONDS,
          signed: true,
        },
      )
      .setCookie(
        process.env["NODE_ENV"] === "production"
          ? "__Secure-refresh_token"
          : "refresh_token",
        refreshToken,
        {
          httpOnly: true,
          secure: process.env["NODE_ENV"] === "production",
          sameSite: "lax",
          path: "/api/private/auth/refresh",
          maxAge: REFRESH_TOKEN_EXPIRATION_IN_SECONDS,
          signed: true,
        },
      )
      .send({
        expires_in: ACCESS_TOKEN_EXPIRATION_IN_SECONDS,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          lastName: user.lastName,
        },
      });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).send({
      error: "Error interno del servidor",
    });
  }
};

export const register = async (
  req: FastifyRequest<{ Body: RegisterBody }>,
  res: FastifyReply,
): Promise<void> => {
  const { email, password, name, lastName } = req.body;

  const existingUser = await prisma.profile.findUnique({
    where: { email },
  });

  if (existingUser !== null) {
    return res.status(400).send({
      error: "Email already registered",
    });
  }

  const hashedPassword = await hashPassword(password);

  const user = await prisma.profile.create({
    data: {
      id: crypto.randomUUID(),
      email,
      password: hashedPassword,
      name,
      lastName: lastName ?? null,
      active: true,
    },
  });

  const sessionId = generateRandomHexToken(32);
  const accessToken = signAccessToken({ sub: user.id, jti: sessionId });
  const refreshToken = signRefreshToken(sessionId);

  return res
    .setCookie(
      process.env["NODE_ENV"] === "production"
        ? "__Secure-access_token"
        : "access_token",
      accessToken,
      {
        httpOnly: true,
        secure: process.env["NODE_ENV"] === "production",
        sameSite: "lax",
        path: "/api/private",
        maxAge: ACCESS_TOKEN_EXPIRATION_IN_SECONDS,
        signed: true,
      },
    )
    .setCookie(
      process.env["NODE_ENV"] === "production"
        ? "__Secure-refresh_token"
        : "refresh_token",
      refreshToken,
      {
        httpOnly: true,
        secure: process.env["NODE_ENV"] === "production",
        sameSite: "lax",
        path: "/api/private/auth/refresh",
        maxAge: REFRESH_TOKEN_EXPIRATION_IN_SECONDS,
        signed: true,
      },
    )
    .status(201)
    .send({
      expires_in: ACCESS_TOKEN_EXPIRATION_IN_SECONDS,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        lastName: user.lastName,
      },
    });
};

export const me = async (
  req: FastifyRequest,
  res: FastifyReply,
): Promise<void> => {
  const user = await prisma.profile.findUnique({
    where: { id: req.userId },
    select: {
      id: true,
      email: true,
      name: true,
      lastName: true,
      unit: true,
      active: true,
    },
  });

  if (user === null) {
    return res.status(404).send({ error: "User not found" });
  }

  return res.send({ user });
};
