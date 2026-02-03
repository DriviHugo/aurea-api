import { getApp } from "../../setup/fastify";
import { createUser } from "../../fixtures/users";
import { prisma } from "../../setup/prisma";
import {
  expectBadRequest,
  expectForbidden,
  expectTooManyRequests,
} from "../../helpers/errorTools";

let app;
let user;

beforeAll(async () => {
  user = await createUser(prisma, { email: "testlogin@auth.com" });
  app = await getApp();
});

describe("/api/private/auth/login [POST]", () => {
  it("should login a user and set cookies", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/private/auth/login",
      payload: {
        email: "testlogin@auth.com",
        password: "password",
        fingerprint: "test-fingerprint",
        agent: "test-user-agent",
        ip: "127.0.0.1",
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.cookies).toHaveLength(2);

    const cookieAccess = res.cookies.find(
      (cookie) => cookie.name === "access_token",
    );
    expect(cookieAccess).toBeDefined();
    expect(cookieAccess.name).toBe("access_token");
    expect(cookieAccess.value).toBeDefined();
    expect(cookieAccess.httpOnly).toBe(true);
    expect(cookieAccess.sameSite).toBe("Lax");
    expect(cookieAccess.path).toBe("/api/private");

    const cookieRefresh = res.cookies.find(
      (cookie) => cookie.name === "refresh_token",
    );
    expect(cookieRefresh).toBeDefined();
    expect(cookieRefresh.name).toBe("refresh_token");
    expect(cookieRefresh.value).toBeDefined();
    expect(cookieRefresh.httpOnly).toBe(true);
    expect(cookieRefresh.sameSite).toBe("Lax");
    expect(cookieRefresh.path).toBe("/api/private/auth/refresh");

    const session = await prisma.sessionEntity.findFirst({
      where: { userId: user!.id, fingerprint: "test-fingerprint" },
    });
    expect(session).toBeDefined();
    expect(session!.userAgent).toBe("test-user-agent");
    expect(session!.ip).toBe("127.0.0.1");
  });

  it("should return 403 for login with wrong password", async () => {
    await expectForbidden(app, {
      url: "/api/private/auth/login",
      method: "POST",
      payload: {
        email: "testlogin@auth.com",
        password: "wrong-password",
        fingerprint: "test-fingerprint",
        agent: "test-user-agent",
        ip: "test-ip",
      },
    });
  });

  it("should return 400 for login with missing password", async () => {
    await expectBadRequest(app, {
      url: "/api/private/auth/login",
      method: "POST",
      payload: { email: "testlogin@auth.com" },
      missingFields: ["password"],
    });
  });

  it("should return 429 for too many login attempts", async () => {
    await expectTooManyRequests(app, {
      url: "/api/private/auth/login",
      method: "POST",
      payload: {
        email: "testlogin@auth.com",
        password: "bad-password",
        fingerprint: "test-fingerprint",
        agent: "test-user-agent",
        ip: "test-ip",
      },
      numberOfRequests: 5,
    });
  });
});
