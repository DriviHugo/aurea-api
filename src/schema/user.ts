import type { JSONSchemaType } from "ajv";

export interface FindUserQuery {
  email?: string;
  name?: string;
  page: number;
  limit: number;
}

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  isAdmin: boolean;
  validatedAt?: string; // ISO date string or null
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

export interface UserID {
  userId: string;
}

export interface UpdateUserBody {
  isActive?: boolean;
  isAdmin?: boolean;
  validatedAt?: string;
}

export const findUserQuerySchema: JSONSchemaType<FindUserQuery> = {
  description: "Schema for finding users with optional filters",
  type: "object",
  properties: {
    email: {
      type: "string",
      description: "Filter users by email",
      minLength: 3,
      maxLength: 255,
      examples: ["user@example.com", "admin@example.com"],
      nullable: true,
    },
    name: {
      type: "string",
      description: "Filter users by name",
      minLength: 2,
      maxLength: 100,
      examples: ["John Doe", "Jane Smith"],
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

export const userResponseSchema: JSONSchemaType<UserResponse> = {
  description: "Schema for user response",
  type: "object",
  properties: {
    id: {
      type: "string",
      description: "Unique identifier of the user",
      minLength: 24,
      maxLength: 24,
      examples: ["60c72b2f9b1e8b001c8e4d3a"],
    },
    email: {
      type: "string",
      description: "Email address of the user",
      format: "email",
      examples: ["user@example.com", "admin@example.com"],
    },
    name: {
      type: "string",
      description: "Name of the user",
      minLength: 2,
      maxLength: 100,
      examples: ["John Doe", "Jane Smith"],
    },
    isActive: {
      type: "boolean",
      description: "Indicates if the user account is active",
      examples: [true, false],
    },
    isAdmin: {
      type: "boolean",
      description: "Indicates if the user is an admin",
      examples: [true, false],
    },
    validatedAt: {
      type: "string",
      description:
        "ISO date string when the user's email was validated, or null if not validated",
      nullable: true,
      examples: ["2023-10-01T12:00:00Z", null],
    },
    createdAt: {
      type: "string",
      description: "ISO date string when the user was created",
      examples: ["2023-10-01T12:00:00Z"],
    },
    updatedAt: {
      type: "string",
      description: "ISO date string when the user was last updated",
      examples: ["2023-10-01T12:00:00Z"],
    },
  },
  required: ["id", "email", "name", "isAdmin", "createdAt", "updatedAt"],
};

export const userIDSchema: JSONSchemaType<UserID> = {
  description: "Schema for user ID",
  type: "object",
  properties: {
    userId: {
      type: "string",
      description: "Unique identifier of the user",
      minLength: 24,
      maxLength: 24,
      examples: ["60c72b2f9b1e8b001c8e4d3a"],
    },
  },
  required: ["userId"],
};

export const updateUserBodySchema: JSONSchemaType<UpdateUserBody> = {
  description: "Schema for updating user information",
  type: "object",
  properties: {
    isActive: {
      type: "boolean",
      description: "Indicates if the user account is active",
      nullable: true,
    },
    isAdmin: {
      type: "boolean",
      description: "Indicates if the user is an admin",
      nullable: true,
    },
    validatedAt: {
      type: "string",
      description:
        "ISO date string when the user's email was validated, or null if not validated",
      format: "date-time",
      nullable: true,
    },
  },
  required: [],
};
