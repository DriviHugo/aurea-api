import { getApp } from "../../setup/fastify";
import { createUser } from "../../fixtures/users";
import { prisma } from "../../setup/prisma";
import { loginAndSetCookie } from "../../helpers/authTools";
import { expectUnauthorized } from "../../helpers/errorTools";

let app;

beforeAll(async () => {
  await createUser(prisma, { email: "testlistsessions@auth.com" });
  app = await getApp();
});

describe("/api/private/auth/sessions [GET]", () => {
  it("should list all sessions for a user", async () => {
    const { accessToken } = await loginAndSetCookie(app, {
      email: "testlistsessions@auth.com",
      password: "password",
      fingerprint: "test-fingerprint",
    });

    const res = await app.inject({
      method: "GET",
      url: "/api/private/auth/sessions",
      cookies: {
        access_token: accessToken,
      },
    });

    expect(res.statusCode).toBe(200);
    const sessions = res.json().sessions;
    expect(sessions).toBeDefined();
    expect(sessions).toBeInstanceOf(Array);
    expect(sessions.length).toBeGreaterThan(0);
    sessions.forEach((session) => {
      expect(session).toHaveProperty("sessionId");
      expect(session).toHaveProperty("ip");
      expect(session).toHaveProperty("agent");
      expect(session).toHaveProperty("createdAt");
      expect(session).toHaveProperty("updatedAt");
      expect(new Date(session.createdAt)).toBeInstanceOf(Date);
      expect(new Date(session.updatedAt)).toBeInstanceOf(Date);
    });
  });

  it("should return 401 for unauthorized access", async () => {
    await expectUnauthorized(app, {
      url: "/api/private/auth/sessions",
      method: "GET",
      cookies: {
        access_token: "invalid_access_token",
      },
    });
  });
});
