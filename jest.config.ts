export default {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: "./test",
  globalSetup: "./globalSetup.ts",
  globalTeardown: "./globalTeardown.ts",
  setupFilesAfterEnv: ["./setup/global.ts"],
  testTimeout: 60_000,
  extensionsToTreatAsEsm: [".ts"],
  transform: {
    "^.+\\.ts$": ["ts-jest", { useESM: true, tsconfig: "tsconfig.test.json" }],
  },
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
};
