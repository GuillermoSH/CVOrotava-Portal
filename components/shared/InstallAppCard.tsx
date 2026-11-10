"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/club/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/club/Card";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const noopSubscribe = () => () => {};

/** Instalar el Portal como app: botón donde el navegador lo permite, instrucciones en iOS. */
export function InstallAppCard() {
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [justInstalled, setJustInstalled] = useState(false);
  const isIOS = useSyncExternalStore(
    noopSubscribe,
    () => /iPad|iPhone|iPod/.test(navigator.userAgent),
    () => false,
  );
  const isStandalone = useSyncExternalStore(
    noopSubscribe,
    () => window.matchMedia("(display-mode: standalone)").matches,
    () => false,
  );
  const installed = justInstalled || isStandalone;

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as InstallPromptEvent);
    };
    const onInstalled = () => {
      setJustInstalled(true);
      setInstallEvent(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;
  if (!installEvent && !isIOS) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Instalar la app</CardTitle>
        <CardDescription>
          {isIOS && !installEvent
            ? "En Safari pulsa Compartir y después «Añadir a pantalla de inicio»."
            : "Ábrela desde el escritorio o la pantalla de inicio, como una app."}
        </CardDescription>
      </CardHeader>
      {installEvent ? (
        <div className="px-6 pb-6">
          <Button
            type="button"
            onClick={async () => {
              await installEvent.prompt();
              await installEvent.userChoice;
              setInstallEvent(null);
            }}
          >
            Instalar
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
