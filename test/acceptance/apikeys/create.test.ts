import { getApp } from "../../setup/fastify";
import { prisma } from "../../setup/prisma";
import { expectBadRequest, expectForbidden } from "../../helpers/errorTools";
import { loginAndSetCookie } from "../../helpers/authTools";
import { createUser } from "../../fixtures/users";

let app;

beforeAll(async () => {
  await createUser(prisma, {
    email: "testcreateapikey@auth.com",
    isAdmin: true,
  });
  await createUser(prisma, {
    email: "testcreateapikey2@auth.com",
    isAdmin: false,
  });
  app = await getApp();
});

describe("/api/private/apikeys [POST]", () => {
  it("should create an API key for an admin user", async () => {
    const { accessToken } = await loginAndSetCookie(app, {
      email: "testcreateapikey@auth.com",
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/private/apikeys",
      cookies: {
        access_token: accessToken,
      },
      payload: {
        name: "Test API Key",
        scopes: ["read", "write"],
        allowedIps: ["127.0.0.1"],
        allowedDomains: ["localhost"],
        isActive: true,
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.name).toBe("Test API Key");
    expect(body.allowedIps).toEqual(["127.0.0.1"]);
    expect(body.allowedDomains).toEqual(["localhost"]);
    expect(body.isActive).toBe(true);
    expect(body.scopes).toEqual(["read", "write"]);
    expect(body.keyId).toBeDefined();
    expect(body.createdAt).toBeDefined();
    expect(body.updatedAt).toBeDefined();
    expect(body.lastUsedAt).toBeNull();
    expect(body.key).toBeDefined(); // The plain text key should be returned
  });

  it("should return 401 for non-admin users", async () => {
    const { accessToken } = await loginAndSetCookie(app, {
      email: "testcreateapikey2@auth.com",
    });
    await expectForbidden(app, {
      method: "POST",
      url: "/api/private/apikeys",
      cookies: {
        access_token: accessToken,
      },
      payload: {
        name: "Test API Key",
        scopes: ["read", "write"],
        allowedIps: ["127.0.0.1"],
        allowedDomains: ["localhost"],
        isActive: true,
      },
    });
  });
  it("should return 400 for invalid payload", async () => {
    const { accessToken } = await loginAndSetCookie(app, {
      email: "testcreateapikey@auth.com",
    });
    await expectBadRequest(app, {
      method: "POST",
      url: "/api/private/apikeys",
      cookies: {
        access_token: accessToken,
      },
      payload: {
        name: "", // Invalid name
        scopes: ["read", "write"],
        allowedIps: ["127.0.0.1"],
        allowedDomains: ["localhost"],
        isActive: true,
      },
      missingFields: ["name"],
    });
  });
});
