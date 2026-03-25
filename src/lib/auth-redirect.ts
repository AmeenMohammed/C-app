import { isHashRouterMode } from "@/lib/router-mode";

export const getAuthCallbackUrl = () => {
  const appBaseUrl = new URL(import.meta.env.BASE_URL, window.location.origin);
  const normalizedBase = appBaseUrl.toString().replace(/\/$/, "");

  return isHashRouterMode()
    ? `${normalizedBase}/#/auth/callback`
    : `${normalizedBase}/auth/callback`;
};
