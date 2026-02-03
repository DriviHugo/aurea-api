const data = [
  {
    keyId: "ja8i81xwpn5fk2fopr4v4isd",
    name: "Development API Key",
    keyHash: "$2b$12$VY2L93fazicmEdT0sS8iiuTFkHFJBHtz5O2k63FXn0WNtdKklNOgS",
    scopes: ["read", "write"],
    isActive: true,
    allowedDomains: ["localhost"],
    allowedIps: ["127.0.0.1", "::1"],
  },
];

export default {
  modelName: "apiKeyEntity",
  data,
};
