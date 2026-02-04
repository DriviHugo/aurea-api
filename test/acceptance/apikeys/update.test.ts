import { getApp } from "../../setup/fastify";
import { prisma } from "../../setup/prisma";
import {
  expectBadRequest,
  expectForbidden,
  expectNotFound,
} from "../../helpers/errorTools";
import { loginAndSetCookie } from "../../helpers/authTools";
import { createUser } from "../../fixtures/users";
import { createApiKey } from "../../fixtures/apiKeys";

let app;
let apiKey;

beforeAll(async () => {
  await createUser(prisma, {
    email: "testupdateapikeys@auth.com",
    isAdmin: true,
  });
  await createUser(prisma, {
    email: "testupdateapikeys2@auth.com",
    isAdmin: false,
  });
  apiKey = await createApiKey(prisma);
  app = await getApp();
});

describe("/api/private/apikeys/:id [PATCH]", () => {
  it("should update an API key for an admin user", async () => {
    const { accessToken } = await loginAndSetCookie(app, {
      email: "testupdateapikeys@auth.com",
    });
    const res = await app.inject({
      method: "PATCH",
      url: `/api/private/apikeys/${apiKey.keyId}`,
      cookies: {
        access_token: accessToken,
      },
      payload: {
        name: "Updated API Key",
        scopes: ["read", "write"],
        allowedIps: ["192.168.1.1"],
        allowedDomains: ["example.com"],
        isActive: false,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.name).toBe("Updated API Key");
    expect(body.allowedIps).toEqual(["192.168.1.1"]);
    expect(body.allowedDomains).toEqual(["example.com"]);
    expect(body.isActive).toBe(false);
  });
  it("should return 403 for non-admin users", async () => {
    const { accessToken } = await loginAndSetCookie(app, {
      email: "testupdateapikeys2@auth.com",
    });
    await expectForbidden(app, {
      method: "PATCH",
      url: `/api/private/apikeys/${apiKey.keyId}`,
      cookies: {
        access_token: accessToken,
      },
      payload: {
        name: "Updated API Key",
        scopes: ["read", "write"],
        allowedIps: ["192.168.1.1"],
        allowedDomains: ["example.com"],
        isActive: false,
      },
    });
  });
  it("should return 404 for non-existent API key", async () => {
    const { accessToken } = await loginAndSetCookie(app, {
      email: "testupdateapikeys@auth.com",
    });
    await expectNotFound(app, {
      method: "PATCH",
      url: `/api/private/apikeys/uv2p0bu35ntsi72qjstytng1`,
      cookies: {
        access_token: accessToken,
      },
      payload: {
        name: "Updated API Key",
        scopes: ["read", "write"],
        allowedIps: ["192.168.1.1"],
        allowedDomains: ["example.com"],
        isActive: false,
      },
    });
  });
  it("should return 400 for invalid payload", async () => {
    const { accessToken } = await loginAndSetCookie(app, {
      email: "testupdateapikeys@auth.com",
    });
    await expectBadRequest(app, {
      method: "PATCH",
      url: `/api/private/apikeys/${apiKey.keyId}`,
      cookies: {
        access_token: accessToken,
      },
      payload: {
        name: "",
        scopes: ["read", "write"],
        allowedIps: ["192.168.1.1"],
        allowedDomains: ["example.com"],
        isActive: false,
      },
      missingFields: ["name"],
    });
  });
});
