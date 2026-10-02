import { createStart } from "@tanstack/react-start";

export const startInstance = createStart(() => ({
  serverFns: {
    // iOS Safari does not attach the session cookie to this fetch unless
    // credentials are requested explicitly. /api/auth already does that.
    fetch: (input: RequestInfo | URL, init?: RequestInit) =>
      fetch(input, { ...init, credentials: "include" }),
  },
}));
