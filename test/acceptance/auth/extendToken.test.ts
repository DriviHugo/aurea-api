import { getApp } from "../../setup/fastify";
import { createUser } from "../../fixtures/users";
import { loginAndSetCookie } from "../../helpers/authTools";
import { prisma } from "../../setup/prisma";

let app;
let user;

beforeAll(async () => {
  user = await createUser(prisma, { email: "test@auth.com" });
  app = await getApp();
});

describe("/api/private/auth/refresh/extend [POST]", () => {
  it("should extend the refresh token and return new cookies", async () => {
    const { accessToken, refreshToken } = await loginAndSetCookie(app, {
      email: "test@auth.com",
      password: "password",
      fingerprint: "test-fingerprint",
    });

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const oldSession = await prisma.sessionEntity.findFirst({
      where: { userId: user.id, fingerprint: "test-fingerprint" },
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/private/auth/refresh/extend",
      cookies: {
        access_token: accessToken,
        refresh_token: refreshToken,
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.cookies).toHaveLength(1);

    const newCookieRefresh = res.cookies.find(
      (cookie) => cookie.name === "refresh_token",
    );
    expect(newCookieRefresh).toBeDefined();
    expect(newCookieRefresh.name).toBe("refresh_token");
    expect(newCookieRefresh.value).toBeDefined();
    expect(newCookieRefresh.httpOnly).toBe(true);
    expect(newCookieRefresh.sameSite).toBe("Lax");
    expect(newCookieRefresh.path).toBe("/api/private/auth/refresh");
    expect(newCookieRefresh.value).not.toBe(refreshToken);

    const newSession = await prisma.sessionEntity.findFirst({
      where: { userId: user.id, fingerprint: "test-fingerprint" },
    });
    expect(newSession).toBeDefined();
    expect(newSession!.refreshToken).not.toBe(oldSession!.refreshToken);
    expect(newSession!.expiresAt.getTime()).toBeGreaterThan(
      oldSession!.expiresAt.getTime(),
    );
  });
});
