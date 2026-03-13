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

    const registration = await navigator.serviceWorker.register("/sw.js").catch(() => null);

    if (registration) {
      // Check for updates every 60 seconds
      setInterval(() => registration.update(), 60 * 1000);

      // When a new SW is waiting, tell it to activate immediately
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            // New version available — reload only if not editing
            if (!(window as any).__editingInProgress) {
              window.location.reload();
            }
          }
        });
      });
    }

    // If the controller changes (another tab activated a new SW), reload only if not editing
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!(window as any).__editingInProgress) {
        window.location.reload();
      }
    });
  });
}
