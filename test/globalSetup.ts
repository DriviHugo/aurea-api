import { DockerComposeEnvironment, Wait } from "testcontainers";
import * as path from "path";
import { execSync } from "child_process";

export default async (): Promise<void> => {
  const composeFile = path.join(
    __dirname,
    "..",
    "docker",
    "docker-compose.test.yml",
  );

  require("dotenv").config({
    path: path.join(__dirname, "..", ".env.testing"),
  });

  let databaseProvider: string | undefined = process.env.DATABASE_PROVIDER;
  if (!databaseProvider || !["postgres", "mongo"].includes(databaseProvider)) {
    throw new Error("DATABASE_PROVIDER must be set to 'postgres' or 'mongo'");
  }

  const dockerEnvironment = await new DockerComposeEnvironment(".", composeFile)
    .withWaitStrategy(
      databaseProvider,
      Wait.forHealthCheck().withStartupTimeout(120_000),
    )
    .withWaitStrategy(
      "redis",
      Wait.forHealthCheck().withStartupTimeout(120_000),
    )
    .up();

  const containerNames = Object.keys(
    // @ts-ignore
    dockerEnvironment.startedGenericContainers,
  );

  const dbContainer = dockerEnvironment.getContainer(
    containerNames.find((name) => name.includes(databaseProvider)) ??
      "postgres", // Default to postgres if not found
  );

  if (databaseProvider === "postgres") {
    process.env.PGSQL_HOST = dbContainer.getHost();
    process.env.PGSQL_PORT = dbContainer.getMappedPort(5432).toString();
    process.env.DATABASE_URL = `postgresql://${process.env.PGSQL_USER}:${process.env.PGSQL_PASS}@${process.env.PGSQL_HOST}:${process.env.PGSQL_PORT}/${process.env.PGSQL_NAME}${process.env.PGSQL_QUERY}`;
  } else if (databaseProvider === "mongo") {
    process.env.MONGO_HOST = dbContainer.getHost();
    process.env.MONGO_PORT = dbContainer.getMappedPort(27017).toString();
    process.env.DATABASE_URL = `mongodb://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/${process.env.MONGO_NAME}${process.env.MONGO_QUERY}`;
  }

  execSync(`npx prisma db push --schema=./prisma/schema.prisma`, {
    stdio: "inherit",
    env: { ...process.env },
  });

  const redisContainer = dockerEnvironment.getContainer(
    containerNames.find((name) => name.includes("redis")) ?? "redis", // Default to redis if not found
  );

  process.env.REDIS_PORT = redisContainer.getMappedPort(6379).toString();

  global.dockerEnvironment = dockerEnvironment;
};
