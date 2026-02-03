import { getApp } from "../../setup/fastify";
import { prisma } from "../../setup/prisma";
import { expectUnauthorized } from "../../helpers/errorTools";
import { createApiKey } from "../../fixtures/apiKeys";
import { generateRandomHexToken } from "../../../src/utils/crypto";

let app;
let apiKey;
let key = generateRandomHexToken(32);

beforeAll(async () => {
  apiKey = await createApiKey(prisma, key);
  app = await getApp();
});

describe("/api/public/example [GET]", () => {
  it("should return 200 for public access", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/public/example",
      headers: {
        authorization: `API-KEY ${apiKey.keyId}:${key}`,
      },
    });
    expect(res.statusCode).toBe(200);
  });

  it("should return 403 for invalid API key", async () => {
    await expectUnauthorized(app, {
      method: "GET",
      url: "/api/public/example",
      headers: {
        authorization: `API-KEY ${apiKey.keyId}:invalid_key`,
      },
    });
  });
  it("should return 401 for missing API key", async () => {
    await expectUnauthorized(app, {
      method: "GET",
      url: "/api/public/example",
      headers: {
        authorization: "API-KEY invalid_key",
      },
    });
  });
});
