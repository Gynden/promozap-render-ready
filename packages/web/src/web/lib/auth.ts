import { createAuthClient } from "better-auth/react";

const TOKEN_KEY = "promozap_bearer_token";

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY) ?? "";
}

export const authClient = createAuthClient({
  baseURL: window.location.origin,
  basePath: "/api/auth",
  fetchOptions: {
    credentials: "include",
    onResponse: (context) => {
      const token = context.response.headers.get("set-auth-token");
      if (token) localStorage.setItem(TOKEN_KEY, token);
    },
    onError: (context) => {
      if (context.response?.status === 401) localStorage.removeItem(TOKEN_KEY);
    },
  },
});

export async function signOut() {
  await authClient.signOut();
  localStorage.removeItem(TOKEN_KEY);
}
