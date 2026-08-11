"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Smartphone, WifiOff, X, CheckCircle2 } from "lucide-react";
import { toast } from "@/components/ui";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    // Service Worker sofort registrieren, auch ohne User-Interaktion
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => {
        console.log("[PWA] Service Worker registriert:", registration.scope);
        // Sofortige Aktivierung erzwingen
        if (registration.waiting) {
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
        }
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed") {
              if (navigator.serviceWorker.controller) {
                toast("Neue App-Version verfügbar – beim nächsten Start aktiv.");
              } else {
                console.log("[PWA] Service Worker installiert und aktiv");
              }
            }
          });
        });
      })
      .catch((err) => {
        console.warn("[PWA] Service Worker Registrierung fehlgeschlagen:", err);
      });
  }, []);

  useEffect(() => {
    const onOnline = () => toast("Wieder online");
    const onOffline = () => toast("Offline: gespeicherte Seiten bleiben verfügbar", "err");
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  return null;
}

export function PwaInstallButton({ compact = false }: { compact?: boolean }) {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setInstalled(isStandalone());
    setOnline(navigator.onLine);

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
      setDismissed(localStorage.getItem("pg-pwa-dismissed") === "1");
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
      localStorage.removeItem("pg-pwa-dismissed");
      toast("Punktgenau wurde als App installiert");
    };
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const canInstall = useMemo(() => Boolean(promptEvent) && !installed, [promptEvent, installed]);

  const install = async () => {
    if (!promptEvent) {
      toast("Android: Chrome-Menü öffnen und „App installieren“ wählen.");
      return;
    }
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === "accepted") {
      setInstalled(true);
    } else {
      toast("Installation abgebrochen");
    }
    setPromptEvent(null);
  };

  if (installed) {
    return compact ? (
      <span className="hidden items-center gap-1.5 rounded-lg border border-line bg-panel px-2.5 py-1.5 text-xs text-sage sm:inline-flex">
        <CheckCircle2 className="size-3.5" />
        App
      </span>
    ) : null;
  }

  if (compact) {
    return (
      <button
        className="btn btn-ghost hidden !px-3 !py-2 !text-xs sm:inline-flex"
        onClick={install}
        title="Als Android-App installieren"
      >
        <Smartphone className="size-4" />
        App
      </button>
    );
  }

  return (
    <>
      {canInstall && !dismissed && (
        <div className="fixed inset-x-4 bottom-4 z-[80] mx-auto max-w-md rounded-2xl border border-line-2 bg-panel/95 p-4 shadow-2xl backdrop-blur-md sm:bottom-6">
          <div className="flex gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber text-ink">
              <Download className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-paper">Punktgenau als Android-App nutzen</p>
              <p className="mt-1 text-xs leading-relaxed text-mute">
                Installiere die App auf dem Startbildschirm: schneller Start, Vollbild-Modus und
                Offline-Fallback für gespeicherte Seiten.
              </p>
              <div className="mt-3 flex gap-2">
                <button className="btn btn-amber !py-2 !text-xs" onClick={install}>
                  <Smartphone className="size-3.5" />
                  Installieren
                </button>
                <button
                  className="btn btn-ghost !py-2 !text-xs"
                  onClick={() => {
                    localStorage.setItem("pg-pwa-dismissed", "1");
                    setDismissed(true);
                  }}
                >
                  Später
                </button>
              </div>
            </div>
            <button
              className="text-dim hover:text-paper"
              onClick={() => {
                localStorage.setItem("pg-pwa-dismissed", "1");
                setDismissed(true);
              }}
              aria-label="Installationshinweis schließen"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      {!online && !compact && (
        <div className="fixed left-1/2 top-20 z-[75] flex -translate-x-1/2 items-center gap-2 rounded-full border border-clay/40 bg-clay/15 px-4 py-2 text-xs text-clay backdrop-blur-md">
          <WifiOff className="size-3.5" />
          Offline-Modus aktiv
        </div>
      )}
    </>
  );
}
