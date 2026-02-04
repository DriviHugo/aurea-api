import { getApp } from "../../setup/fastify";
import { createUser } from "../../fixtures/users";
import { loginAndSetCookie } from "../../helpers/authTools";
import { expectUnauthorized } from "../../helpers/errorTools";
import { prisma } from "../../setup/prisma";

let app;

beforeAll(async () => {
  await createUser(prisma, { email: "testrefreshtoken@auth.com" });
  app = await getApp();
});

describe("/api/private/auth/refresh [POST]", () => {
  it("should refresh access token using refresh token", async () => {
    const { accessToken, refreshToken } = await loginAndSetCookie(app, {
      email: "testrefreshtoken@auth.com",
      password: "password",
    });
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const res = await app.inject({
      method: "POST",
      url: "/api/private/auth/refresh",
      cookies: {
        refresh_token: refreshToken,
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.cookies).toHaveLength(1);

    const newAccessCookie = res.cookies.find(
      (cookie) => cookie.name === "access_token",
    );
    expect(newAccessCookie).toBeDefined();
    expect(newAccessCookie.name).toBe("access_token");
    expect(newAccessCookie.value).toBeDefined();
    expect(newAccessCookie.httpOnly).toBe(true);
    expect(newAccessCookie.sameSite).toBe("Lax");
    expect(newAccessCookie.path).toBe("/api/private");
    expect(newAccessCookie.value).not.toBe(accessToken);
  });

  it("should return 401 for refresh without valid tokens", async () => {
    await expectUnauthorized(app, {
      url: "/api/private/auth/refresh",
      method: "POST",
      cookies: {
        refresh_token: "invalid_refresh_token",
      },
    });
  });
});
