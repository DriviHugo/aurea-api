import type { FastifyInstance, HTTPMethods } from "fastify";
import { expect } from "@jest/globals";

interface InjectOptions {
  url: string;
  method?: HTTPMethods;
  payload?: object;
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
}

interface InjectBadRequestOptions extends InjectOptions {
  missingFields: string[];
}

interface InjectTooManyRequestsOptions extends InjectOptions {
  numberOfRequests: number;
}

interface FastifyInjectResponse {
  statusCode: number;
  json: () => any;
  cookies?: Array<{
    name: string;
    value: string;
    httpOnly: boolean;
    sameSite: string;
    path: string;
  }>;
}

export async function expectForbidden(
  app: FastifyInstance,
  options: InjectOptions,
) {
  // @ts-ignore
  const res: FastifyInjectResponse = await app.inject({
    // @ts-ignore
    method: options.method ?? "GET",
    url: options.url,
    payload: options.payload,
    headers: options.headers,
    cookies: options.cookies,
  });
  expect(res.statusCode).toBe(403);
  const body = res.json() as { message?: string };
  expect(body.message).toMatch(
    /You don't have permissions to perform this action/i,
  );
}

export async function expectUnauthorized(
  app: FastifyInstance,
  options: InjectOptions,
) {
  // @ts-ignore
  const res: FastifyInjectResponse = await app.inject({
    // @ts-ignore
    method: options.method ?? "GET",
    url: options.url,
    payload: options.payload,
    headers: options.headers,
    cookies: options.cookies,
  });
  expect(res.statusCode).toBe(401);
  const body = res.json() as { message?: string };
  // Unauthorized or Invalid or expired token
  expect(body.message).toMatch(
    /Unauthorized|Invalid or expired token|Invalid or expired API key/i,
  );
}

export async function expectBadRequest(
  app: FastifyInstance,
  options: InjectBadRequestOptions,
) {
  // @ts-ignore
  const res: FastifyInjectResponse = await app.inject({
    // @ts-ignore
    method: options.method ?? "GET",
    url: options.url,
    payload: options.payload,
    headers: options.headers,
    cookies: options.cookies,
  });
  expect(res.statusCode).toBe(400);
  if (options.missingFields) {
    for (const field of options.missingFields) {
      expect(res.json().message).toContain(field);
    }
  }
}

export async function expectNotFound(
  app: FastifyInstance,
  options: InjectOptions,
) {
  // @ts-ignore
  const res: FastifyInjectResponse = await app.inject({
    // @ts-ignore
    method: options.method ?? "GET",
    url: options.url,
    payload: options.payload,
    headers: options.headers,
    cookies: options.cookies,
  });
  expect(res.statusCode).toBe(404);
  const body = res.json() as { message?: string };
  expect(body.message).toMatch(/Requested resource could not be found/i);
}

export async function expectTooManyRequests(
  app: FastifyInstance,
  options: InjectTooManyRequestsOptions,
) {
  let res;
  for (let i = 0; i < options.numberOfRequests; i++) {
    // @ts-ignore
    rest = await app.inject({
      // @ts-ignore
      method: options.method ?? "GET",
      url: options.url,
      payload: options.payload,
      headers: options.headers,
      cookies: options.cookies,
    });
    if (res && res.statusCode === 429) {
      expect(res.statusCode).toBe(429);
      const body = res.json() as { message?: string };
      expect(body.message).toMatch(/Too many requests/i);
      expect(res.headers["retry-after"]).toBeDefined();
      expect(res.headers["retry-after"]).toMatch(/^\d+$/);
      return;
    }
  }
}
