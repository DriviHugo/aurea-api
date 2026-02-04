// setup/fastify.ts
import type { FastifyInstance } from "fastify";
import buildApp from "../../src/app";

let appInstance: FastifyInstance;

export async function getApp(): Promise<FastifyInstance> {
  if (!appInstance) {
    appInstance = buildApp;
    await appInstance.ready();
  }
  return appInstance;
}

export async function closeApp(): Promise<void> {
  if (appInstance) {
    await appInstance.close();
    appInstance = undefined as any; // Reset the instance
  }
}
