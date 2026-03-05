import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    const hostname = window.location.hostname;
    const isPreviewHost = hostname.includes("lovableproject.com") || hostname.startsWith("id-preview--");

    if (isPreviewHost) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));

      if ("caches" in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.filter((key) => key.startsWith("confeiteiro-")).map((key) => caches.delete(key)));
      }
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

