import ipaddr from "ipaddr.js";
import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import AjvImport from "ajv";
import addFormatsImport from "ajv-formats";
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
const Ajv = AjvImport.default ?? AjvImport;
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
const addFormats = addFormatsImport.default ?? addFormatsImport;

// Custom format to validate IP addresses (v4 or v6) or CIDR notation
const isValidIpOrCidr = (input: string): boolean => {
  if (ipaddr.isValid(input)) return true;
  const parts = input.split("/");
  const baseIp = parts[0] ?? "";
  if (parts.length === 2 && ipaddr.isValid(baseIp)) {
    const prefix = Number(parts[1]);
    const kind = ipaddr.parse(baseIp).kind();
    if (
      (kind === "ipv4" && prefix >= 0 && prefix <= 32) ||
      (kind === "ipv6" && prefix >= 0 && prefix <= 128)
    ) {
      return true;
    }
  }
  return false;
};

const customFormatsPlugin: FastifyPluginAsync = async (fastify) => {
  const ajv = new Ajv({
    // @ts-ignore
    ...fastify.initialConfig.ajvOptions,
    allErrors: true,
    strict: true,
    useDefaults: "empty", // Use empty defaults for missing properties
    coerceTypes: true, // Automatically convert types based on schema
  });

  // Add basic formats
  addFormats(ajv);

  // Add custom formats
  ajv.addFormat("ipOrCidr", {
    type: "string",
    validate: isValidIpOrCidr,
  });

  // Set the custom Ajv instance to Fastify
  fastify.setValidatorCompiler(({ schema }) => ajv.compile(schema));
};

export default fp(customFormatsPlugin, {
  name: "custom-formats",
});
