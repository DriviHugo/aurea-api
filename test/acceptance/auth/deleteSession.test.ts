import { getApp } from "../../setup/fastify";
import { createUser } from "../../fixtures/users";
import { prisma } from "../../setup/prisma";
import { loginAndSetCookie } from "../../helpers/authTools";
import { expectUnauthorized } from "../../helpers/errorTools";

let app;
let user;

beforeAll(async () => {
  user = await createUser(prisma, { email: "testdeletesessions@auth.com" });
  app = await getApp();
});

describe("/api/private/auth/sessions/:sessionId [DELETE]", () => {
  it("should delete a session by sessionId", async () => {
    const { accessToken } = await loginAndSetCookie(app, {
      email: "testdeletesessions@auth.com",
      password: "password",
      fingerprint: "test-fingerprint",
    });

    const session = await prisma.sessionEntity.findFirst({
      where: { userId: user.id, fingerprint: "test-fingerprint" },
    });

    expect(session).toBeDefined();

    const res = await app.inject({
      method: "DELETE",
      url: `/api/private/auth/sessions/${session!.sessionId}`,
      cookies: {
        access_token: accessToken,
      },
    });

    expect(res.statusCode).toBe(204);
  });

  it("should return 404 for non-existent session", async () => {
    const { accessToken } = await loginAndSetCookie(app, {
      email: "testdeletesessions@auth.com",
      password: "password",
      fingerprint: "test-fingerprint",
    });

    const res = await app.inject({
      method: "DELETE",
      url: `/api/private/auth/sessions/02ad043d610a668a96ddaecf7c8b89122397d493f98ae0cc44f99e58c0f62560`,
      cookies: {
        access_token: accessToken,
      },
    });

    expect(res.statusCode).toBe(404);
  });

  it("should return 401 for unauthorized access", async () => {
    await expectUnauthorized(app, {
      url: `/api/private/auth/sessions/02ad043d610a668a96ddaecf7c8b89122397d493f98ae0cc44f99e58c0f62560`,
      method: "DELETE",
      cookies: {
        access_token: "invalid_access_token",
      },
    });
  });
});
