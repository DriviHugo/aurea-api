import type { FastifyRequest, FastifyReply } from "fastify";
import prisma from "../config/prisma.js";
import {
  consumeForgotPasswordLimiter,
  consumeRegisterLimiter,
  consumeLoginLimiter,
} from "../services/ratelimiter.js";
import {
  generateRandomHexToken,
  hashPassword,
  validatePasswordHash,
} from "../utils/crypto.js";
import {
  signAccessToken,
  REFRESH_TOKEN_EXPIRATION_IN_SECONDS,
  ACCESS_TOKEN_EXPIRATION_IN_SECONDS,
  signRefreshToken,
  signEmailValidation,
  verifyEmailValidation,
} from "../utils/jwt.js";
import { sendEmail } from "../services/mailer.js";
import { Errors } from "../errors/appErrorFactory.js";
import { AppError } from "../errors/appError.js";
import {
  requestNewPasswordTemplate,
  verifyMailTemplate,
} from "../utils/mailTemplates.js";
import type {
  LoginBody,
  RegisterBody,
  ForgotPasswordBody,
  ResetPasswordBody,
  DeleteSessionParams,
  UpdateMeBody,
} from "../schema/auth.js";

const DUMMY_PASSWORD_HASH =
  "$2b$10$CwTycUXWue0Thq9StjUM0uJ8rQpQ1rQ1rQ1rQ1rQ1rQ1rQ1rQ1rQ";

export const login = async (
  req: FastifyRequest<{
    Body: LoginBody;
  }>,
  res: FastifyReply,
): Promise<void> => {
  const { email, password, fingerprint, ip, agent } = req.body;

  const limiterResult = await consumeLoginLimiter(req, res);
  if (limiterResult.isLimited) {
    throw new Errors.tooManyRequests();
  }

  const user = await prisma.userEntity.findUnique({
    where: { email, isActive: true },
  });

  const passwordHash = user?.password ?? DUMMY_PASSWORD_HASH;
  const passwordCheck = await validatePasswordHash(password, passwordHash);
  if (user && passwordCheck) {
    const sessionId = generateRandomHexToken(32);
    const accessToken = signAccessToken({ sub: user.id, jti: sessionId });
    const opaqueToken = generateRandomHexToken(64);
    const refreshToken = signRefreshToken(opaqueToken);

    await prisma.sessionEntity.upsert({
      where: {
        userId_fingerprint: { userId: user.id, fingerprint: fingerprint },
      },
      update: {
        sessionId: sessionId,
        ip: ip,
        userAgent: agent,
        refreshToken: opaqueToken,
        expiresAt: new Date(
          Date.now() + REFRESH_TOKEN_EXPIRATION_IN_SECONDS * 1000,
        ),
        revoked: false,
      },
      create: {
        sessionId: sessionId,
        userId: user.id,
        fingerprint: fingerprint,
        ip: ip,
        userAgent: agent,
        refreshToken: opaqueToken,
        expiresAt: new Date(
          Date.now() + REFRESH_TOKEN_EXPIRATION_IN_SECONDS * 1000,
        ),
      },
    });

    if (limiterResult.clearFailCounters) {
      await limiterResult.clearFailCounters();
    }
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
      .code(200)
      .send();
  }

  if (limiterResult.incrementFailCounters) {
    await limiterResult.incrementFailCounters();
  }

  throw new Errors.forbidden();
};

export const logout = async (
  req: FastifyRequest,
  res: FastifyReply,
): Promise<void> => {
  await prisma.sessionEntity.deleteMany({
    where: { userId: req.userId, sessionId: req.sessionId },
  });

  return res
    .clearCookie(
      process.env["NODE_ENV"] === "production"
        ? "__Secure-access_token"
        : "access_token",
      { path: "/api/private" },
    )
    .clearCookie(
      process.env["NODE_ENV"] === "production"
        ? "__Secure-refresh_token"
        : "refresh_token",
      { path: "/api/private/auth/refresh" },
    )
    .code(204)
    .send();
};

export const refreshToken = async (
  req: FastifyRequest,
  res: FastifyReply,
): Promise<void> => {
  const session = await prisma.sessionEntity.findUnique({
    where: {
      refreshToken: req.refreshOpaqueToken,
      revoked: false,
      expiresAt: {
        gt: new Date(),
      },
    },
  });
  if (!session) {
    throw new Errors.unauthorizedToken();
  }

  const accessToken = signAccessToken({
    sub: session.userId,
    jti: session.sessionId,
  });

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
    .code(200)
    .send();
};

export const extendRefreshToken = async (
  req: FastifyRequest,
  res: FastifyReply,
): Promise<void> => {
  const session = await prisma.sessionEntity.findUnique({
    where: {
      refreshToken: req.refreshOpaqueToken,
      revoked: false,
      expiresAt: {
        gt: new Date(),
      },
    },
  });
  if (!session) {
    throw new Errors.unauthorizedToken();
  }
  const newOpaqueToken = generateRandomHexToken(64);
  const newRefreshToken = signRefreshToken(newOpaqueToken);
  await prisma.sessionEntity.update({
    where: { sessionId: session.sessionId },
    data: {
      refreshToken: newOpaqueToken,
      expiresAt: new Date(
        Date.now() + REFRESH_TOKEN_EXPIRATION_IN_SECONDS * 1000,
      ),
    },
  });
  return res
    .setCookie(
      process.env["NODE_ENV"] === "production"
        ? "__Secure-refresh_token"
        : "refresh_token",
      newRefreshToken,
      {
        httpOnly: true,
        secure: process.env["NODE_ENV"] === "production",
        sameSite: "lax",
        path: "/api/private/auth/refresh",
        maxAge: REFRESH_TOKEN_EXPIRATION_IN_SECONDS,
        signed: true,
      },
    )
    .code(200)
    .send();
};

export const register = async (
  req: FastifyRequest<{
    Body: RegisterBody;
  }>,
  res: FastifyReply,
): Promise<void> => {
  const { email, name, password } = req.body;

  const { isLimited } = await consumeRegisterLimiter(req, res);
  if (isLimited) {
    throw new Errors.tooManyRequests();
  }

  const existingUser = await prisma.userEntity.findUnique({
    where: { email },
  });

  if (!existingUser) {
    await prisma.userEntity.create({
      data: {
        email,
        name,
        password: await hashPassword(password),
        validatedAt: null,
      },
    });

    const token = signEmailValidation({ email });

    sendEmail(verifyMailTemplate(name, email, token)).catch((error) => {
      new AppError({
        statusCode: 500,
        message: "Error sending registration email",
        code: "MAIL_SEND_FAILED",
        cause: error,
        request: req,
        level: "warn",
      }).report();
    });
  }

  return res.code(201).send();
};

export const validateEmail = async (
  req: FastifyRequest<{
    Querystring: { token: string };
  }>,
  res: FastifyReply,
): Promise<void> => {
  const email = verifyEmailValidation(req.query.token);
  if (email !== null) {
    await prisma.userEntity.update({
      where: { email: email, isActive: false },
      data: { validatedAt: new Date(), isActive: true },
    });
  }
  return res.code(200).send();
};

export const forgotPassword = async (
  req: FastifyRequest<{
    Body: ForgotPasswordBody;
  }>,
  res: FastifyReply,
): Promise<void> => {
  const { isLimited } = await consumeForgotPasswordLimiter(req, res);
  if (isLimited) {
    throw new Errors.tooManyRequests();
  }

  const user = await prisma.userEntity.findUnique({
    where: { email: req.body.email, isActive: true },
  });
  if (user) {
    const token = signEmailValidation({ email: user.email });

    sendEmail(requestNewPasswordTemplate(user.name, user.email, token)).catch(
      (error) => {
        new AppError({
          statusCode: 500,
          message: "Error sending forgot password email",
          code: "MAIL_SEND_FAILED",
          cause: error,
          request: req,
          level: "warn",
        }).report();
      },
    );
  }
  return res
    .code(200)
    .send({ message: "If the email exists, a reset link has been sent." });
};

export const resetPassword = async (
  req: FastifyRequest<{
    Body: ResetPasswordBody;
  }>,
  res: FastifyReply,
): Promise<void> => {
  const { newPassword, token } = req.body;

  const email = verifyEmailValidation(token);
  if (email !== null) {
    const user = await prisma.userEntity.findUnique({
      where: { email, isActive: true },
    });
    if (user) {
      await prisma.userEntity.update({
        where: { id: user.id },
        data: { password: await hashPassword(newPassword) },
      });

      return res.code(200).send();
    }
  }
  throw new Errors.forbidden();
};

export const listSessions = async (
  req: FastifyRequest,
  res: FastifyReply,
): Promise<void> => {
  const sessions = await prisma.sessionEntity.findMany({
    where: {
      userId: req.userId,
      revoked: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
    select: {
      sessionId: true,
      userAgent: true,
      ip: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return res.code(200).send({
    sessions: sessions.map((session: (typeof sessions)[number]) => ({
      sessionId: session.sessionId,
      ip: session.ip,
      agent: session.userAgent,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    })),
  });
};

export const deleteSession = async (
  req: FastifyRequest<{
    Params: DeleteSessionParams;
  }>,
  res: FastifyReply,
): Promise<void> => {
  const { sessionId } = req.params;

  const session = await prisma.sessionEntity.findUnique({
    where: { sessionId, userId: req.userId, revoked: false },
  });

  if (!session) {
    throw new Errors.notFound();
  }

  await prisma.sessionEntity.delete({
    where: { sessionId: sessionId, userId: req.userId, revoked: false },
  });

  return res.code(204).send();
};

export const getMe = async (
  req: FastifyRequest,
  res: FastifyReply,
): Promise<void> => {
  const user = await prisma.userEntity.findUnique({
    where: { id: req.userId, isActive: true },
  });

  if (!user) {
    throw new Errors.notFound();
  }

  return res.code(200).send(user);
};

export const updateMe = async (
  req: FastifyRequest<{
    Body: UpdateMeBody;
  }>,
  res: FastifyReply,
): Promise<void> => {
  const { email, name, password, imageUrl } = req.body;

  const user = await prisma.userEntity.findUnique({
    where: { id: req.userId, isActive: true },
  });

  if (!user) {
    throw new Errors.notFound();
  }

  const userUpdate = await prisma.userEntity.update({
    where: { id: req.userId },
    data: {
      email: email ?? user.email,
      name: name ?? user.name,
      password: password ? await hashPassword(password) : user.password,
      imageUrl: imageUrl ?? user.imageUrl,
    },
  });
  if (email && email !== user.email) {
    const token = signEmailValidation({ email: userUpdate.email });
    await prisma.userEntity.update({
      where: { id: userUpdate.id },
      data: { validatedAt: null, isActive: false },
    });
    sendEmail(
      verifyMailTemplate(userUpdate.name, userUpdate.email, token),
    ).catch((error) => {
      new AppError({
        statusCode: 500,
        message: "Error sending email validation",
        code: "MAIL_SEND_FAILED",
        cause: error,
        request: req,
        level: "warn",
      }).report();
    });
  }

  return res.code(200).send(userUpdate);
};
