import { type FastifyInstance } from "fastify";

export async function loginAndSetCookie(
  app: FastifyInstance,
  overrides = {},
): Promise<{
  refreshToken: string;
  accessToken: string;
}> {
  const response = await app.inject({
    method: "POST",
    url: "/api/private/auth/login",
    payload: {
      email: "test@auth.com",
      password: "password",
      fingerprint: "test-fingerprint",
      agent: "test-user-agent",
      ip: "127.0.0.1",
      ...overrides,
    },
  });

  expect(response.statusCode).toBe(200);
  expect(response.cookies).toHaveLength(2);

  const refreshToken = response.cookies.find(
    (cookie) => cookie.name === "refresh_token",
  )?.value;

  const accessToken = response.cookies.find(
    (cookie) => cookie.name === "access_token",
  )?.value;

  expect(refreshToken).toBeDefined();
  expect(accessToken).toBeDefined();

  return { refreshToken: refreshToken!, accessToken: accessToken! };
}
