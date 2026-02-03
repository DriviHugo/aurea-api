import { getApp } from "../../setup/fastify";
import { prisma } from "../../setup/prisma";
import { expectForbidden } from "../../helpers/errorTools";
import { loginAndSetCookie } from "../../helpers/authTools";
import { createUser } from "../../fixtures/users";
import { createApiKey } from "../../fixtures/apiKeys";
import { validatePasswordHash } from "../../../src/utils/crypto";

let app;
let apiKey;

beforeAll(async () => {
  await createUser(prisma, {
    email: "testrotateapikey@auth.com",
    isAdmin: true,
  });
  await createUser(prisma, {
    email: "testrotateapikey2@auth.com",
    isAdmin: false,
  });
  apiKey = await createApiKey(prisma);
  app = await getApp();
});

describe("/api/private/apikeys/rotate [PATCH]", () => {
  it("should create an API key for an admin user", async () => {
    const { accessToken } = await loginAndSetCookie(app, {
      email: "testrotateapikey@auth.com",
    });

    const res = await app.inject({
      method: "PATCH",
      url: `/api/private/apikeys/${apiKey.keyId}/rotate`,
      cookies: {
        access_token: accessToken,
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.key).toBeDefined(); // The new key should be returned
    expect(body.keyId).toBe(apiKey.keyId); // The keyId should remain the same
    expect(body.createdAt).toBeDefined();
    expect(body.updatedAt).toBeDefined();
    expect(body.lastUsedAt).toBeNull(); // Last used should be null after rotation
    const newKey = await prisma.apiKeyEntity.findUnique({
      where: { keyId: apiKey.keyId },
    });
    expect(newKey).toBeDefined();
    expect(await validatePasswordHash(body.key, newKey!.keyHash)).toBe(true);
  });

  it("should return 403 for non-admin users", async () => {
    const { accessToken } = await loginAndSetCookie(app, {
      email: "testrotateapikey2@auth.com",
    });
    await expectForbidden(app, {
      method: "PATCH",
      url: `/api/private/apikeys/${apiKey.keyId}/rotate`,
      cookies: {
        access_token: accessToken,
      },
    });
  });
});
