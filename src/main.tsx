import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const normalizeLegacyHashUrl = () => {
  const appBaseUrl = new URL(import.meta.env.BASE_URL, window.location.origin);
  const normalizedBase = appBaseUrl.toString().replace(/\/$/, "");
  const { search, hash } = window.location;

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

normalizeLegacyHashUrl();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
