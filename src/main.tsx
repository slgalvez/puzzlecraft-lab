import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { SplashScreen } from "@capacitor/splash-screen";
import { isNativeApp } from "./lib/appMode";
import ErrorBoundary from "./components/ErrorBoundary";
import App from "./App.tsx";
import "./index.css";

// Hide Capacitor splash screen once the app is mounted (native only)
if (isNativeApp()) {
  SplashScreen.hide();
}

// Register service worker with periodic update checks.
// skipWaiting + clientsClaim in workbox config ensure the new SW activates immediately.
// This callback reloads only when a genuinely new SW has taken over.
const updateSW = registerSW({
  onNeedRefresh() {
    // New build detected and already activated — reload to use fresh assets
    window.location.reload();
  },
  onOfflineReady() {
    // silently ready for offline use
  },
});

// Re-check for updates when the app regains visibility (e.g. reopening PWA)
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    updateSW(true); // true = check for SW update
  }
});

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
