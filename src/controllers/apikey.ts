import { type FastifyReply, type FastifyRequest } from "fastify";
import type {
  ApiKeyId,
  CreateApiKeyBody,
  FindApiKeyQuery,
  UpdateApiKeyBody,
} from "../schema/apikey.js";
import prisma from "../config/prisma.js";
import { generateRandomHexToken, hashPassword } from "../utils/crypto.js";
import { Errors } from "../errors/appErrorFactory.js";

export const find = async (
  req: FastifyRequest<{
    Querystring: FindApiKeyQuery;
  }>,
  res: FastifyReply,
): Promise<void> => {
  const page = req.query.page;
  const limit = req.query.limit;
  const { name, ip, domain } = req.query;

  const apiKeys = await prisma.apiKeyEntity.findMany({
    skip: page * limit,
    take: limit,
    where: {
      ...(name && { name: { contains: name, mode: "insensitive" } }),
      ...(ip && { allowedIps: { has: ip } }),
      ...(domain && {
        allowedDomains: { has: domain },
      }),
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return res.code(200).send({ apiKeys });
};

export const create = async (
  req: FastifyRequest<{
    Body: CreateApiKeyBody;
  }>,
  res: FastifyReply,
): Promise<void> => {
  const { name, scopes, allowedIps, allowedDomains, isActive } = req.body;

  const key = generateRandomHexToken(32);
  const keyHash = await hashPassword(key);

  const apiKey = await prisma.apiKeyEntity.create({
    data: {
      name,
      scopes,
      ...(allowedIps ? { allowedIps } : {}),
      ...(allowedDomains ? { allowedDomains } : {}),
      isActive: isActive ?? true,
      keyHash,
    },
  });

  return res.code(201).send({
    ...apiKey,
    key, // Return the plain text key
  });
};

export const update = async (
  req: FastifyRequest<{
    Body: UpdateApiKeyBody;
    Params: ApiKeyId;
  }>,
  res: FastifyReply,
): Promise<void> => {
  const { keyId } = req.params;
  const { name, scopes, allowedIps, allowedDomains, isActive } = req.body;

  const existingApiKey = await prisma.apiKeyEntity.findUnique({
    where: { keyId },
  });
  if (!existingApiKey) {
    throw new Errors.notFound();
  }
  const apiKey = await prisma.apiKeyEntity.update({
    where: { keyId },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(scopes ? { scopes } : {}),
      ...(allowedIps ? { allowedIps } : {}),
      ...(allowedDomains ? { allowedDomains } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    },
  });

  return res.code(200).send(apiKey);
};

export const rotate = async (
  req: FastifyRequest<{
    Params: ApiKeyId;
  }>,
  res: FastifyReply,
): Promise<void> => {
  const { keyId } = req.params;

  const existingApiKey = await prisma.apiKeyEntity.findUnique({
    where: { keyId },
  });
  if (!existingApiKey) {
    throw new Errors.notFound();
  }

  const newKey = generateRandomHexToken(32);
  const newKeyHash = await hashPassword(newKey);

  const updatedApiKey = await prisma.apiKeyEntity.update({
    where: { keyId },
    data: {
      keyHash: newKeyHash,
    },
  });

  return res.code(200).send({
    ...updatedApiKey,
    key: newKey, // Return the new plain text key
  });
};
