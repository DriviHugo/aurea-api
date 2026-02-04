import { getApp } from "../../setup/fastify";
import { prisma } from "../../setup/prisma";
import { expectForbidden } from "../../helpers/errorTools";
import { loginAndSetCookie } from "../../helpers/authTools";
import { createApiKey } from "../../fixtures/apiKeys";
import { generateRandomHexToken } from "../../../src/utils/crypto";
import { createUser } from "../../fixtures/users";

let app;
let key;
let apiKey;

beforeAll(async () => {
  key = generateRandomHexToken(32);
  await createUser(prisma, {
    email: "testlistapikeys@auth.com",
    isAdmin: true,
  });
  await createUser(prisma, {
    email: "testlistapikeys2@auth.com",
    isAdmin: false,
  });
  apiKey = await createApiKey(prisma, key);
  app = await getApp();
});

describe("/api/private/apikeys [GET]", () => {
  it("should list API keys for an admin user", async () => {
    const { accessToken } = await loginAndSetCookie(app, {
      email: "testlistapikeys@auth.com",
    });

    const res = await app.inject({
      method: "GET",
      url: "/api/private/apikeys",
      cookies: {
        access_token: accessToken,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.apiKeys).toBeDefined();
    expect(body.apiKeys.length).toBeGreaterThanOrEqual(1);
    expect(body.apiKeys[0].name).toBe(apiKey.name);
    expect(body.apiKeys[0].allowedIps).toEqual(apiKey.allowedIps);
    expect(body.apiKeys[0].allowedDomains).toEqual(apiKey.allowedDomains);
    expect(body.apiKeys[0].isActive).toBe(apiKey.isActive);
    expect(body.apiKeys[0].scopes).toEqual(apiKey.scopes);
    expect(body.apiKeys[0].keyId).toEqual(apiKey.keyId);
    expect(body.apiKeys[0].createdAt).toBeDefined();
    expect(body.apiKeys[0].updatedAt).toBeDefined();
    expect(body.apiKeys[0].lastUsedAt).toBeNull();
  });

  it("should return 403 for non-admin users", async () => {
    const { accessToken } = await loginAndSetCookie(app, {
      email: "testlistapikeys2@auth.com",
    });
    await expectForbidden(app, {
      url: "/api/private/apikeys",
      method: "GET",
      cookies: {
        access_token: accessToken,
      },
    });
  });
});
