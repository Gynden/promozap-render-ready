import { hc } from "hono/client";
import type { AppType } from "../../api";
import { getStoredToken } from "./auth";

const client = hc<AppType>("/", {
  fetch: (input: RequestInfo | URL, init?: RequestInit) => {
    const token = getStoredToken();
    return fetch(input, {
      ...init,
      credentials: "include",
      headers: {
        ...(init?.headers ?? {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  },
});

export const api = client.api;
