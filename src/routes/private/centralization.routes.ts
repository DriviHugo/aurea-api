import type { FastifyPluginAsync } from "fastify";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load catalog once at module init — it's static data, no need to re-read per request
let catalogData: unknown;
try {
  const catalogPath = join(
    __dirname,
    "../../data/catalogo-centralizacion.json",
  );
  catalogData = JSON.parse(readFileSync(catalogPath, "utf-8"));
} catch (e) {
  catalogData = { meta: { version: "error" }, groups: {}, items_flat: [] };
}

const routes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/",
    {
      preValidation: [fastify.authAccessToken],
      schema: {
        tags: ["Centralizacion"],
        description: "Get the DGRCC centralization catalog",
        response: {
          200: { type: "object", additionalProperties: true },
        },
      },
    },
    async (_request, reply) => {
      return reply.status(200).send(catalogData);
    },
  );
};

export default routes;

// Export catalog data and a helper so ai-analysis.ts can use it without HTTP
export { catalogData };

interface CatalogItem {
  id?: string;
  nombre?: string;
  tipo?: string;
  status?: string;
  descripcion?: string;
}

/**
 * Build a compact catalog summary for AI prompts.
 * Only includes vigente/prorrogado instruments to avoid confusing the model.
 */
export function buildCatalogContext(): string {
  const items = (catalogData as { items_flat?: CatalogItem[] })
    ?.items_flat ?? [];

  const active = items.filter(
    (i) =>
      i.id &&
      i.nombre &&
      (!i.status || i.status === "vigente" || i.status === "prorrogado"),
  );

  // Deduplicate by ID (catalog has some duplicates)
  const seen = new Set<string>();
  const unique = active.filter((i) => {
    if (!i.id || seen.has(i.id)) return false;
    seen.add(i.id);
    return true;
  });

  const lines = unique.map(
    (i) => `- ${i.id}: "${i.nombre}" (${i.tipo ?? "?"})`,
  );

  return (
    `Catálogo DGRCC de instrumentos vigentes (usa exactamente uno de estos IDs en instrumentId, o null si no hay coincidencia):\n` +
    lines.join("\n")
  );
}
