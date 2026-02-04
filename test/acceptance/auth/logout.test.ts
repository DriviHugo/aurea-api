import { getApp } from "../../setup/fastify";
import { createUser } from "../../fixtures/users";
import { prisma } from "../../setup/prisma";
import { loginAndSetCookie } from "../../helpers/authTools";
import { expectUnauthorized } from "../../helpers/errorTools";

let app;

beforeAll(async () => {
  await createUser(prisma, { email: "testlogout@auth.com" });
  app = await getApp();
});

describe("/api/private/auth/logout [POST]", () => {
  it("should logout a user and clear cookies", async () => {
    const { accessToken, refreshToken } = await loginAndSetCookie(app, {
      email: "testlogout@auth.com",
      password: "password",
    });

    const loginRes = await app.inject({
      method: "POST",
      url: "/api/private/auth/logout",
      cookies: {
        access_token: accessToken,
        refresh_token: refreshToken,
      },
    });

    expect(loginRes.statusCode).toBe(204);
    expect(loginRes.headers["set-cookie"]).toHaveLength(2);
    const accessCookie = loginRes.headers["set-cookie"].find((cookie) =>
      cookie.startsWith("access_token"),
    );
    expect(accessCookie).toContain("Max-Age=0");
    const refreshCookie = loginRes.headers["set-cookie"].find((cookie) =>
      cookie.startsWith("refresh_token"),
    );
    expect(refreshCookie).toContain("Max-Age=0");
  });

  it("should return 401 for logout without valid tokens", async () => {
    await expectUnauthorized(app, {
      url: "/api/private/auth/logout",
      method: "POST",
      cookies: {
        access_token: "invalid_access_token",
        refresh_token: "invalid_refresh_token",
      },
    });
  });
});
