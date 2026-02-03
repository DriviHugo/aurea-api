import { type JSONSchemaType } from "ajv";

export interface LoginBody {
  email: string;
  password: string;
  fingerprint: string;
  ip: string;
  agent: string;
}

export interface RegisterBody {
  email: string;
  name: string;
  password: string;
}

export interface ForgotPasswordBody {
  email: string;
}

export interface ResetPasswordBody {
  newPassword: string;
  token: string;
}

export interface DeleteSessionParams {
  sessionId: string;
}

export interface ListSessionsResponse {
  sessions: Array<{
    sessionId: string;
    ip: string;
    agent: string;
    createdAt: string; // ISO date string
    updatedAt: string; // ISO date string
  }>;
}

export interface UpdateMeBody {
  name?: string;
  email?: string;
  password?: string;
  imageUrl?: string | null;
}

export interface GetMeResponse {
  email: string;
  name: string;
  imageUrl?: string | null;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  validatedAt?: string | null; // ISO date string or null
}

export const loginBodySchema: JSONSchemaType<LoginBody> = {
  description: "Schema for user login request",
  type: "object",
  properties: {
    email: {
      type: "string",
      description: "User's email address",
      minLength: 5,
      format: "email",
      examples: ["john.doe@example.com"],
    },
    password: {
      type: "string",
      description: "User's password",
      minLength: 8,
      examples: ["password"],
    },
    fingerprint: {
      type: "string",
      description: "Unique fingerprint for the device",
      examples: ["c0f73c1f2c2a1506bc4e35f9e6e0dbc5"],
    },
    ip: {
      type: "string",
      description: "IP address of the user",
      examples: ["192.168.1.1"],
    },
    agent: {
      type: "string",
      description: "User's device user agent",
      examples: [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      ],
    },
  },
  required: ["email", "password", "fingerprint", "ip", "agent"],
  additionalProperties: false,
};

export const registerBodySchema: JSONSchemaType<RegisterBody> = {
  description: "Schema for user registration request",
  type: "object",
  properties: {
    email: {
      type: "string",
      description: "User's email address",
      minLength: 5,
      format: "email",
      examples: ["john.doe@example.com"],
    },
    name: {
      type: "string",
      description: "User's name",
      minLength: 2,
      examples: ["John Doe"],
    },
    password: {
      type: "string",
      description: "User's password",
      minLength: 8,
      examples: ["password"],
    },
  },
  required: ["email", "name", "password"],
  additionalProperties: false,
};

export const validateQuerySchema = {
  querystring: {
    type: "object",
    properties: {
      token: { type: "string" },
    },
    required: ["token"],
  },
};

export const forgotPasswordBodySchema: JSONSchemaType<ForgotPasswordBody> = {
  description: "Schema for forgot password request",
  type: "object",
  properties: {
    email: {
      type: "string",
      description: "User's email address",
      minLength: 5,
      examples: ["john.doe@example.com"],
    },
  },
  required: ["email"],
  additionalProperties: false,
};

export const resetPasswordBodySchema: JSONSchemaType<ResetPasswordBody> = {
  description: "Schema for reset password request",
  type: "object",
  properties: {
    newPassword: {
      type: "string",
      description: "New password for the user",
      minLength: 8,
      examples: ["newpassword123"],
    },
    token: {
      type: "string",
      description: "Token for resetting the password",
      examples: ["eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."],
    },
  },
  required: ["newPassword", "token"],
  additionalProperties: false,
};

export const deleteSessionParamsSchema: JSONSchemaType<DeleteSessionParams> = {
  description: "Schema for deleting a user session",
  type: "object",
  properties: {
    sessionId: {
      type: "string",
      description: "ID of the session to be deleted",
      examples: [
        "02ad043d610a668a96ddaecf7c8b89122397d493f98ae0cc44f99e58c0f62560",
      ],
      minLength: 64,
      maxLength: 64,
    },
  },
  required: ["sessionId"],
  additionalProperties: false,
};

export const listSessionsResponseSchema: JSONSchemaType<ListSessionsResponse> =
  {
    description: "Schema for listing user sessions",
    type: "object",
    properties: {
      sessions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            sessionId: { type: "string", description: "ID of the session" },
            ip: { type: "string", description: "IP address of the session" },
            agent: { type: "string", description: "User agent of the session" },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Creation date of the session",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              description: "Last update date of the session",
            },
          },
          required: ["ip", "agent", "createdAt", "updatedAt"],
          additionalProperties: false,
        },
      },
    },
    required: ["sessions"],
    additionalProperties: false,
  };

export const sendEmailVerificationBodySchema = {
  body: {
    type: "object",
    properties: {
      email: { type: "string" },
    },
    required: ["email"],
  },
};

export const updateMeBodySchema: JSONSchemaType<UpdateMeBody> = {
  description: "Schema for updating user information",
  type: "object",
  properties: {
    name: {
      type: "string",
      description: "Name of the user",
      minLength: 2,
      maxLength: 100,
      nullable: true,
    },
    email: {
      type: "string",
      description: "Email address of the user",
      format: "email",
      minLength: 3,
      maxLength: 255,
      nullable: true,
    },
    password: {
      type: "string",
      description: "New password for the user",
      minLength: 8,
      nullable: true,
    },
    imageUrl: {
      type: "string",
      description: "URL of the user's profile image",
      format: "uri",
      nullable: true,
    },
  },
  required: [],
};

export const getMeResponseSchema: JSONSchemaType<GetMeResponse> = {
  description: "Schema for the response of getting user information",
  type: "object",
  properties: {
    email: {
      type: "string",
      description: "Email address of the user",
      format: "email",
    },
    name: {
      type: "string",
      description: "Name of the user",
    },
    imageUrl: {
      type: "string",
      description: "URL of the user's profile image",
      nullable: true,
    },
    createdAt: {
      type: "string",
      format: "date-time",
      description: "Creation date of the user account",
    },
    updatedAt: {
      type: "string",
      format: "date-time",
      description: "Last update date of the user account",
    },
    validatedAt: {
      type: "string",
      format: "date-time",
      description:
        "Date when the user's email was validated, or null if not validated",
      nullable: true,
    },
  },
  required: ["email", "name", "createdAt", "updatedAt"],
};
