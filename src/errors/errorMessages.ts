const errorMessages = {
  general: {
    400: "The server can't process the request sent by the client due to invalid syntax",
    401: "No authorization header was found",
    403: "You don't have permissions to perform this action",
    404: "Requested resource could not be found",
    409: "Conflict with existing resource",
    429: "Too many requests",
    500: "The server can't process the request",
  },
  public: {
    401: "Invalid or expired API key",
    403: "Access denied from this IP or domain",
  },
  auth: {
    401: "Invalid or expired token",
  },
} as const;

export default errorMessages;
