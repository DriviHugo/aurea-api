import type { JSONSchemaType } from "ajv";

export interface FindApiKeyQuery {
  name?: string;
  ip?: string;
  domain?: string;
  page: number;
  limit: number;
}

export interface ApiKeyId {
  keyId: string;
}

export interface ApiKeyResponse {
  keyId: string;
  name: string;
  scopes: string[];
  isActive: boolean;
  allowedIps?: string[];
  allowedDomains?: string[];
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateApiKeyBody {
  name: string;
  scopes: string[];
  allowedIps?: string[];
  allowedDomains?: string[];
  isActive?: boolean;
}

export interface UpdateApiKeyBody {
  name?: string;
  scopes?: string[];
  allowedIps?: string[];
  allowedDomains?: string[];
  isActive?: boolean;
}

export interface CreateApiKeyResponse extends ApiKeyResponse {
  key: string; // The actual API key in plain text format
}

export const findApiKeyQuerySchema: JSONSchemaType<FindApiKeyQuery> = {
  description: "Schema for finding API keys with optional filters",
  type: "object",
  properties: {
    name: {
      type: "string",
      description: "Filter API keys by name",
      minLength: 2,
      maxLength: 100,
      examples: ["My API Key", "Test Key"],
      nullable: true,
    },
    ip: {
      type: "string",
      description: "Filter API keys by IP address",
      format: "ipOrCidr",
      nullable: true,
    },
    domain: {
      type: "string",
      description: "Filter API keys by domain",
      nullable: true,
    },
    page: {
      type: "number",
      description: "Pagination page number",
      default: 0,
    },
    limit: {
      type: "number",
      description: "Pagination page size",
      default: 10,
    },
  },
  required: [],
};

export const apiKeyResponseSchema: JSONSchemaType<ApiKeyResponse> = {
  description: "Schema for API key response",
  type: "object",
  properties: {
    keyId: {
      type: "string",
      description: "Unique identifier of the API key",
      minLength: 24,
      maxLength: 24,
      examples: ["60c72b2f9b1e8b001c8e4d3a"],
    },
    name: {
      type: "string",
      description: "Name of the API key",
      minLength: 2,
      maxLength: 100,
      examples: ["My API Key", "Test Key"],
    },
    scopes: {
      type: "array",
      description: "Scopes associated with the API key",
      items: {
        type: "string",
        examples: ["read", "write", "admin"],
      },
    },
    isActive: {
      type: "boolean",
      description: "Indicates if the API key is active",
      examples: [true, false],
    },
    allowedIps: {
      type: "array",
      description: "List of allowed IP addresses for the API key",
      items: {
        type: "string",
        format: "ip-or-cidr",
        examples: ["192.168.1.1", "127.0.0.1"],
      },
      nullable: true,
    },
    allowedDomains: {
      type: "array",
      description: "List of allowed domains for the API key",
      items: {
        type: "string",
        examples: ["example.com", "api.example.com"],
      },
      nullable: true,
    },
    lastUsedAt: {
      type: "string",
      description: "Timestamp of the last usage of the API key",
      format: "date-time",
      nullable: true,
    },
    createdAt: {
      type: "string",
      description: "Timestamp when the API key was created",
      format: "date-time",
    },
    updatedAt: {
      type: "string",
      description: "Timestamp when the API key was last updated",
      format: "date-time",
    },
  },
  required: ["keyId", "name", "scopes", "isActive", "createdAt", "updatedAt"],
  additionalProperties: false,
};

export const createApiKeyBodySchema: JSONSchemaType<CreateApiKeyBody> = {
  description: "Schema for creating a new API key",
  type: "object",
  properties: {
    name: {
      type: "string",
      description: "Name of the API key",
      minLength: 2,
      maxLength: 100,
      examples: ["My API Key", "Test Key"],
    },
    scopes: {
      type: "array",
      description: "Scopes associated with the API key",
      items: {
        type: "string",
        examples: ["read", "write", "admin"],
      },
      minItems: 1,
      uniqueItems: true,
    },
    allowedIps: {
      type: "array",
      description: "List of allowed IP addresses for the API key",
      items: {
        type: "string",
        format: "ipOrCidr",
        examples: ["192.168.1.1", "10.0.0.1"],
      },
      nullable: true,
    },
    allowedDomains: {
      type: "array",
      description: "List of allowed domains for the API key",
      items: {
        type: "string",
        examples: ["https://example.com", "api.example.com"],
      },
      nullable: true,
    },
    isActive: {
      type: "boolean",
      description: "Indicates if the API key should be active upon creation",
      default: true,
      examples: [true, false],
      nullable: true,
    },
  },
  required: ["name", "scopes"],
  additionalProperties: false,
};

// @ts-ignore
export const createApiKeyResponseSchema: JSONSchemaType<CreateApiKeyResponse> =
  {
    ...apiKeyResponseSchema,
    description: "Schema for the response when creating a new API key",
    properties: {
      ...apiKeyResponseSchema.properties,
      key: {
        type: "string",
        description: "The actual API key in plain text format",
        examples: ["sk_test_xxxxxxxxxxxxxxxxxxxx"],
      },
    },
    required: [...apiKeyResponseSchema.required, "key"],
    additionalProperties: false,
  };

export const updateApiKeyBodySchema: JSONSchemaType<UpdateApiKeyBody> = {
  description: "Schema for updating an existing API key",
  type: "object",
  properties: {
    name: {
      type: "string",
      description: "Name of the API key",
      minLength: 2,
      maxLength: 100,
      examples: ["My API Key", "Test Key"],
      nullable: true,
    },
    scopes: {
      type: "array",
      description: "Scopes associated with the API key",
      items: {
        type: "string",
        examples: ["read", "write", "admin"],
      },
      minItems: 1,
      uniqueItems: true,
      nullable: true,
    },
    allowedIps: {
      type: "array",
      description: "List of allowed IP addresses for the API key",
      items: {
        type: "string",
        format: "ipOrCidr",
        examples: ["192.168.1.1", "10.0.0.1"],
      },
      nullable: true,
    },
    allowedDomains: {
      type: "array",
      description: "List of allowed domains for the API key",
      items: {
        type: "string",
        examples: ["https://example.com", "api.example.com"],
      },
      nullable: true,
    },
    isActive: {
      type: "boolean",
      description: "Indicates if the API key should be active",
      default: true,
      examples: [true, false],
      nullable: true,
    },
  },
  required: [],
  additionalProperties: false,
};

export const apiKeyIdSchema: JSONSchemaType<ApiKeyId> = {
  description: "Schema for identifying an API key by its ID",
  type: "object",
  properties: {
    keyId: {
      type: "string",
      description: "Unique identifier of the API key",
      minLength: 24,
      maxLength: 24,
      examples: ["60c72b2f9b1e8b001c8e4d3a"],
    },
  },
  required: ["keyId"],
  additionalProperties: false,
};
