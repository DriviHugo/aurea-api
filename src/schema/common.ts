import type { JSONSchemaType } from "ajv";

export interface basicResponse {
  message: string;
}

export const basicResponseSchema: JSONSchemaType<basicResponse> = {
  type: "object",
  properties: {
    message: {
      type: "string",
      description: "Response message",
      examples: ["Request was successful"],
    },
  },
  required: ["message"],
  additionalProperties: false,
};
