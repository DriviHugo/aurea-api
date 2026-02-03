import {
  beforeAll,
  beforeEach,
  afterAll,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { getApp } from "../../setup/fastify";
import logger from "../../../src/config/logger";

let app: any;

const warnSpy = jest
  .spyOn(logger as any, "warn")
  .mockImplementation(() => undefined);

const errorSpy = jest
  .spyOn(logger as any, "error")
  .mockImplementation(() => undefined);

const infoSpy = jest
  .spyOn(logger as any, "info")
  .mockImplementation(() => undefined);

beforeAll(async () => {
  app = await getApp();
});

beforeEach(() => {
  warnSpy.mockClear();
  errorSpy.mockClear();
  infoSpy.mockClear();
});

afterAll(() => {
  warnSpy.mockRestore();
  errorSpy.mockRestore();
  infoSpy.mockRestore();
});

describe("Centralized error logging", () => {
  it("Logs 404 once", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/__this_route_does_not_exist__",
      headers: {
        "x-origin-request-id": "orig-123",
      },
    });

    expect(res.statusCode).toBe(404);
    expect(res.json().message).toMatch(
      /Requested resource could not be found/i,
    );

    expect(errorSpy).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]?.[0]).toBe(res.json().message);
    expect(warnSpy.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        originRequestId: "orig-123",
        statusCode: 404,
        method: "GET",
        url: "/api/__this_route_does_not_exist__",
      }),
    );
  });

  it("Logs 401 once", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/private/auth/sessions",
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().message).toMatch(
      /Unauthorized|Invalid or expired token|Invalid or expired API key/i,
    );

    expect(errorSpy).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]?.[0]).toBe(res.json().message);
    expect(warnSpy.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        statusCode: 401,
        method: "GET",
        url: "/api/private/auth/sessions",
      }),
    );
  });
});
