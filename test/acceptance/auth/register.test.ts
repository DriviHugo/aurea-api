import { getApp } from "../../setup/fastify";
import { createUser } from "../../fixtures/users";
import { prisma } from "../../setup/prisma";
import {
  expectBadRequest,
  expectTooManyRequests,
} from "../../helpers/errorTools";

let app;

beforeAll(async () => {
  await createUser(prisma, { email: "testregister@auth.com" });
  app = await getApp();
});

describe("/api/private/auth/register [POST]", () => {
  it("should register a new user", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/private/auth/register",
      payload: {
        email: "newuser@auth.com",
        name: "New User",
        password: "password",
      },
    });

    expect(res.statusCode).toBe(201);
    const user = await prisma.userEntity.findUnique({
      where: { email: "newuser@auth.com" },
    });
    expect(user).toBeDefined();
    expect(user!.email).toBe("newuser@auth.com");
    expect(user!.name).toBe("New User");
    expect(user!.validatedAt).toBeNull();
    expect(user!.isActive).toBe(false);
  });

  it("should return 400 for missing fields", async () => {
    await expectBadRequest(app, {
      url: "/api/private/auth/register",
      method: "POST",
      payload: {
        email: "newuser@auth.com",
        name: "New User",
      },
      missingFields: ["password"],
    });
  });

  it("should return 400 for invalid email format", async () => {
    await expectBadRequest(app, {
      url: "/api/private/auth/register",
      method: "POST",
      payload: {
        email: "invalid-email",
        name: "New User",
        password: "password",
      },
      missingFields: ["email"],
    });
  });
  it("should return 400 for weak password", async () => {
    await expectBadRequest(app, {
      url: "/api/private/auth/register",
      method: "POST",
      payload: {
        email: "newuser@auth.com",
        name: "New User",
        password: "123",
      },
      missingFields: ["password"],
    });
  });
  it("should return 429 for too many requests", async () => {
    await expectTooManyRequests(app, {
      url: "/api/private/auth/register",
      method: "POST",
      payload: {
        email: "newuser@auth.com",
        name: "New User",
        password: "password",
      },
      numberOfRequests: 5,
    });
  });
});
