import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { isHashRouterMode } from "@/lib/router-mode";

const normalizeLegacyUrl = () => {
  const appBaseUrl = new URL(import.meta.env.BASE_URL, window.location.origin);
  const normalizedBase = appBaseUrl.toString().replace(/\/$/, "");
  const expectedPathname = appBaseUrl.pathname.replace(/\/$/, "") || "/";
  const { pathname, search, hash } = window.location;

  if (isHashRouterMode()) {
    if (!hash && pathname !== expectedPathname) {
      const routePath = pathname.startsWith(expectedPathname)
        ? pathname.slice(expectedPathname.length) || "/"
        : pathname;

      window.history.replaceState(
        null,
        "",
        `${normalizedBase}/#${routePath.startsWith("/") ? routePath : `/${routePath}`}${search}`
      );
    }

    return;
  }

  if (!hash.startsWith("#/")) return;

  const legacyRoute = hash.slice(1);
  const [routePath, trailingHash = ""] = legacyRoute.split("#");
  const normalizedHash = trailingHash ? `#${trailingHash}` : "";

  window.history.replaceState(
    null,
    "",
    `${normalizedBase}${routePath}${search}${normalizedHash}`
  );
};

normalizeLegacyUrl();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
