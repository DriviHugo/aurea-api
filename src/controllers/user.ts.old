import type { FastifyRequest, FastifyReply } from "fastify";
import prisma from "../config/prisma.js";
import {
  type UserID,
  type FindUserQuery,
  type UpdateUserBody,
} from "../schema/user.js";
import { Errors } from "../errors/appErrorFactory.js";

export const find = async (
  req: FastifyRequest<{
    Querystring: FindUserQuery;
  }>,
  res: FastifyReply,
): Promise<void> => {
  const page = req.query.page;
  const limit = req.query.limit;
  const { email, name } = req.query;

  const users = await prisma.userEntity.findMany({
    skip: page * limit,
    take: limit,
    where: {
      ...(email && { email: { contains: email, mode: "insensitive" } }),
      ...(name && { name: { contains: name, mode: "insensitive" } }),
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return res.code(200).send({ users });
};

export const findOne = async (
  req: FastifyRequest<{
    Params: UserID;
  }>,
  res: FastifyReply,
): Promise<void> => {
  const { userId } = req.params;
  const user = await prisma.userEntity.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Errors.notFound();
  }

  return res.code(200).send(user);
};

export const update = async (
  req: FastifyRequest<{
    Params: UserID;
    Body: UpdateUserBody;
  }>,
  res: FastifyReply,
): Promise<void> => {
  const { userId } = req.params;
  const { isActive, isAdmin, validatedAt } = req.body;

  const updatedUser = await prisma.userEntity.update({
    where: { id: userId },
    data: {
      ...(isActive !== undefined && { isActive }),
      ...(isAdmin !== undefined && { isAdmin }),
      ...(validatedAt !== undefined && { validatedAt }),
    },
  });

  return res.code(200).send(updatedUser);
};
