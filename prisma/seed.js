import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import path from "path";
import fs from "fs";
import { fileURLToPath, pathToFileURL } from "url";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const env = process.env.SEED_ENV || process.env.NODE_ENV || "dev";
  const seedsDir = path.join(__dirname, "seeds", env);

  if (!fs.existsSync(seedsDir)) {
    console.error(`Seeds directory not found: ${seedsDir}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(seedsDir)
    .filter((f) => f.endsWith(".cjs") || f.endsWith(".js"));
  for (const file of files) {
    const seedPath = path.join(seedsDir, file);
    const seedModule = await import(pathToFileURL(seedPath).href);
    const { modelName, data } = seedModule.default;
    if (Array.isArray(data) && data.length > 0) {
      // eslint-disable-next-line
      const model = prisma[modelName];
      if (model && typeof model.createMany === "function") {
        await model.createMany({ data, skipDuplicates: true });
        // eslint-disable-next-line no-console
        console.log(`Seeded ${modelName}`);
      } else {
        console.error(
          `Model not found or createMany not available for: ${modelName}`,
        );
      }
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
