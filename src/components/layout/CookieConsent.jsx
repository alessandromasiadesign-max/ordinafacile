import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createPageUrl } from "@/utils";

const STORAGE_KEY = "of_cookie_consent_v1";
const COOKIE_NAME = "cookie_consent";
const CONSENT_VERSION = 1;

function readStoredConsent() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.version !== CONSENT_VERSION) return null;
    return {
      version: CONSENT_VERSION,
      necessary: true,
      analytics: !!parsed.analytics,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function persistConsent(next) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
  }

  try {
    const maxAge = 60 * 60 * 24 * 365;
    document.cookie = `${COOKIE_NAME}=1; path=/; max-age=${maxAge}; samesite=lax`;
  } catch {
  }
}

export default function CookieConsent() {
  const [consent, setConsent] = useState(null);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);

  const canShowFloatingButton = useMemo(() => !!consent, [consent]);

  useEffect(() => {
    const stored = readStoredConsent();
    setConsent(stored);
    setAnalyticsEnabled(!!stored?.analytics);
    setBannerVisible(!stored);

    const onOpenPrefs = () => {
      const latest = readStoredConsent();
      setConsent(latest);
      setAnalyticsEnabled(!!latest?.analytics);
      setDialogOpen(true);
    };

    window.addEventListener("of:cookie-preferences-open", onOpenPrefs);
    return () => window.removeEventListener("of:cookie-preferences-open", onOpenPrefs);
  }, []);

  const applyConsent = (next) => {
    const normalized = {
      version: CONSENT_VERSION,
      necessary: true,
      analytics: !!next.analytics,
      updatedAt: new Date().toISOString(),
    };

    persistConsent(normalized);
    setConsent(normalized);
    setAnalyticsEnabled(!!normalized.analytics);
    setBannerVisible(false);
    setDialogOpen(false);
  };

  const acceptAll = () => applyConsent({ analytics: true });
  const rejectNonNecessary = () => applyConsent({ analytics: false });

  return (
    <>
      {bannerVisible && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 backdrop-blur">
          <div className="mx-auto max-w-5xl px-4 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground">Preferenze Cookie</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Usiamo cookie tecnici necessari al funzionamento. Puoi accettare anche cookie analitici per migliorare l’esperienza.
                  <Link
                    to={createPageUrl("Cookies")}
                    className="ml-1 text-red-600 hover:underline"
                  >
                    Leggi la Cookie Policy
                  </Link>
                  .
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                <Button type="button" variant="outline" onClick={rejectNonNecessary}>
                  Rifiuta non necessari
                </Button>
                <Button type="button" variant="secondary" onClick={() => setDialogOpen(true)}>
                  Personalizza
                </Button>
                <Button type="button" onClick={acceptAll}>
                  Accetta tutti
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {canShowFloatingButton && (
        <div className="fixed bottom-20 right-4 z-20">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setDialogOpen(true)}
            aria-label="Apri preferenze cookie"
          >
            Preferenze cookie
          </Button>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Preferenze Cookie</DialogTitle>
            <DialogDescription>
              Puoi modificare in qualsiasi momento quali categorie di cookie consentire.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">Cookie tecnici (necessari)</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Essenziali per il funzionamento del sito e per la sicurezza. Sempre attivi.
                  </div>
                </div>
                <Switch checked disabled aria-label="Cookie tecnici sempre attivi" />
              </div>
            </div>

            <div className="rounded-lg border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">Cookie analitici</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Ci aiutano a capire come viene utilizzata la piattaforma per migliorare le funzionalità.
                  </div>
                </div>
                <Switch
                  checked={analyticsEnabled}
                  onCheckedChange={setAnalyticsEnabled}
                  aria-label="Abilita cookie analitici"
                />
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              <Link
                to={createPageUrl("Cookies")}
                className="text-red-600 hover:underline"
              >
                Consulta la Cookie Policy
              </Link>
              .
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Annulla
            </Button>
            <Button
              type="button"
              onClick={() => applyConsent({ analytics: analyticsEnabled })}
            >
              Salva preferenze
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
