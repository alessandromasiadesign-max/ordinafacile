import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import Joyride, { ACTIONS, EVENTS, STATUS } from "react-joyride";
import { useLocation, useNavigate } from "react-router-dom";
import { HelpCircle, ShoppingBag, Tag, UtensilsCrossed } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

const TutorialContext = createContext(null);

const STORAGE_KEY = "of_tutorial_progress";
const PREFS_KEY = "of_tutorial_prefs";

export function useTutorial() {
  return useContext(TutorialContext);
}

const buildMenuTour = ({ advanced }) => {
  const base = [
    {
      target: '[data-tour="nav-menu"]',
      content: "Da qui gestisci le categorie e i prodotti del menu.",
      placement: "right",
      route: "/MenuManagement",
    },
    {
      target: '[data-tour="menu-add-category"]',
      content: "Inizia creando una categoria (es. Pizze, Bevande).",
      placement: "bottom",
      route: "/MenuManagement",
    },
    {
      target: '[data-tour="public-menu-link"]',
      content: "Qui trovi la pagina pubblica del menu da condividere ai clienti.",
      placement: "right",
    },
  ];

  if (!advanced) return base;

  return [
    ...base,
    {
      target: '[data-tour="menu-search"]',
      content: "Puoi cercare velocemente categorie e prodotti. Tip: quando il menu cresce ti fa risparmiare molto tempo.",
      placement: "bottom",
      route: "/MenuManagement",
    },
  ];
};

const buildQuickControlsTour = ({ advanced }) => {
  const base = [
    {
      target: '[data-tour="quick-open-close"]',
      content: "Apre/chiude velocemente la sede. Utile se vuoi mettere gli ordini in pausa in pochi secondi.",
      placement: "bottom",
    },
    {
      target: '[data-tour="quick-delivery"]',
      content: "Attiva/disattiva la modalità Consegna al volo.",
      placement: "bottom",
    },
    {
      target: '[data-tour="quick-pickup"]',
      content: "Attiva/disattiva la modalità Asporto al volo.",
      placement: "bottom",
    },
  ];

  if (!advanced) return base;

  return [
    ...base,
    {
      target: '[data-tour="pending-orders"]',
      content: "Tip: tieni d’occhio gli ordini in attesa per rispondere rapidamente ai clienti.",
      placement: "bottom",
    },
  ];
};

const buildOrdersTour = ({ advanced }) => {
  const base = [
    {
      target: '[data-tour="pending-orders"]',
      content: "Qui vedi quanti ordini sono in attesa. Clicca per aprire subito la lista filtrata.",
      placement: "bottom",
    },
    {
      target: '[data-tour="nav-orders"]',
      content: "Qui visualizzi e gestisci gli ordini in arrivo.",
      placement: "right",
      route: "/Orders",
    },
    {
      target: '[data-tour="orders-search"]',
      content: "Cerca rapidamente un ordine per numero o cliente.",
      placement: "bottom",
      route: "/Orders",
    },
    {
      target: '[data-tour="orders-filter"]',
      content: "Filtra gli ordini per stato.",
      placement: "bottom",
      route: "/Orders",
    },
  ];

  if (!advanced) return base;

  return [
    ...base,
    {
      target: '[data-tour="orders-view-toggle"]',
      content: "Puoi scegliere la vista Lista o Kanban. Tip: Kanban è ottima nei momenti di punta per spostare gli ordini per stato.",
      placement: "bottom",
      route: "/Orders",
    },
  ];
};

const buildMarketingTour = (includeAdmin, { advanced }) => {
  const base = [
    {
      target: '[data-tour="nav-events"]',
      content: "Crea eventi con menu dedicati (feste, matrimoni, ecc.).",
      placement: "right",
      route: "/Events",
    },
    {
      target: '[data-tour="events-add"]',
      content: "Crea un nuovo evento e poi gestisci il suo menu.",
      placement: "bottom",
      route: "/Events",
    },
    {
      target: '[data-tour="nav-promotions"]',
      content: "Crea promozioni e offerte per aumentare gli ordini.",
      placement: "right",
      route: "/Promotions",
    },
    {
      target: '[data-tour="promotions-create"]',
      content: "Da qui puoi creare una nuova promozione.",
      placement: "bottom",
      route: "/Promotions",
    },
  ];

  const withAdmin = includeAdmin
    ? [
        ...base,
        {
          target: '[data-tour="nav-discount-codes"]',
          content: "Da qui puoi gestire i codici sconto (solo admin).",
          placement: "right",
          route: "/DiscountCodes",
        },
      ]
    : base;

  if (!advanced) return withAdmin;

  return [
    ...withAdmin,
    {
      target: '[data-tour="nav-promotions"]',
      content: "Tip: usa promozioni semplici (es. -10% sopra 30€) per aumentare lo scontrino medio.",
      placement: "right",
      route: "/Promotions",
    },
  ];
};

export default function TutorialProvider({ includeAdminTours = false }) {
  const location = useLocation();
  const navigate = useNavigate();

  const [selectorOpen, setSelectorOpen] = useState(false);
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [steps, setSteps] = useState([]);
  const [currentKind, setCurrentKind] = useState(null);
  const [savedProgress, setSavedProgress] = useState(null);
  const [includeAdvanced, setIncludeAdvanced] = useState(false);

  const recommendedKind = useMemo(() => {
    const p = String(location.pathname ?? "");

    if (p === "/Orders" || p.startsWith("/Orders")) return "orders";
    if (p === "/MenuManagement" || p.startsWith("/MenuManagement")) return "menu";
    if (p === "/Events" || p.startsWith("/Events")) return "marketing";
    if (p === "/Promotions" || p.startsWith("/Promotions")) return "marketing";
    if (p === "/DiscountCodes" || p.startsWith("/DiscountCodes")) return "marketing";
    if (p === "/Dashboard" || p.startsWith("/Dashboard")) return "quick";
    return "quick";
  }, [location.pathname]);

  const kindsForDialog = useMemo(() => {
    const base = ["quick", "menu", "orders", "marketing"];
    if (!recommendedKind) return base;
    return [recommendedKind, ...base.filter((k) => k !== recommendedKind)];
  }, [recommendedKind]);

  const value = useMemo(() => {
    return {
      openSelector: () => setSelectorOpen(true),
    };
  }, []);

  const getStepsForKind = (kind, options = {}) => {
    const advanced =
      typeof options.advancedOverride === "boolean" ? options.advancedOverride : includeAdvanced;
    const cfg = { advanced };

    if (kind === "menu") return buildMenuTour(cfg);
    if (kind === "orders") return buildOrdersTour(cfg);
    if (kind === "marketing") return buildMarketingTour(includeAdminTours, cfg);
    if (kind === "quick") return buildQuickControlsTour(cfg);
    return [];
  };

  const getKindMeta = (kind) => {
    if (kind === "menu") {
      return {
        title: "Tour Menu",
        description: "Categorie, prodotti e link pubblico",
        icon: UtensilsCrossed,
      };
    }
    if (kind === "orders") {
      return {
        title: "Tour Ordini",
        description: "Ricerca, filtri e vista lista/kanban",
        icon: ShoppingBag,
      };
    }
    if (kind === "marketing") {
      return {
        title: "Tour Marketing",
        description: "Eventi e promozioni",
        icon: Tag,
      };
    }
    if (kind === "quick") {
      return {
        title: "Comandi Rapidi",
        description: "Apertura/chiusura e modalità ordine",
        icon: HelpCircle,
      };
    }
    return { title: "Tour", description: "", icon: HelpCircle };
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && typeof parsed.includeAdvanced === "boolean") {
        setIncludeAdvanced(parsed.includeAdvanced);
      }
    } catch {
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({ includeAdvanced }));
    } catch {
    }
  }, [includeAdvanced]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setSavedProgress(null);
        return;
      }
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") {
        setSavedProgress(null);
        return;
      }
      const kind = parsed.kind;
      const idx = parsed.stepIndex;
      const advanced = typeof parsed.advanced === "boolean" ? parsed.advanced : false;
      if (!kind || !Number.isFinite(Number(idx))) {
        setSavedProgress(null);
        return;
      }
      setSavedProgress({ kind, stepIndex: Number(idx), advanced });
    } catch {
      setSavedProgress(null);
    }
  }, [includeAdminTours]);

  const persistProgress = (nextKind, nextIndex, advancedFlag = includeAdvanced) => {
    try {
      if (!nextKind || !Number.isFinite(Number(nextIndex))) return;
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ kind: nextKind, stepIndex: Number(nextIndex), advanced: !!advancedFlag })
      );
      setSavedProgress({ kind: nextKind, stepIndex: Number(nextIndex), advanced: !!advancedFlag });
    } catch {
    }
  };

  const clearProgress = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
    }
    setSavedProgress(null);
  };

  const startTour = (kind) => {
    const nextSteps = getStepsForKind(kind);

    setSelectorOpen(false);
    setCurrentKind(kind);
    setSteps(nextSteps);
    setStepIndex(0);
    setRun(true);
    persistProgress(kind, 0, includeAdvanced);

    const firstRoute = nextSteps?.[0]?.route;
    if (firstRoute && location.pathname !== firstRoute) {
      navigate(firstRoute);
    }
  };

  const resumeTour = () => {
    const kind = savedProgress?.kind;
    const idx = savedProgress?.stepIndex ?? 0;
    const advancedFlag = savedProgress?.advanced ?? false;
    if (!kind) return;

    setIncludeAdvanced(advancedFlag);
    const nextSteps = getStepsForKind(kind, { advancedOverride: advancedFlag });

    const maxIndex = Math.max((nextSteps?.length ?? 1) - 1, 0);
    const safeIndex = Math.max(0, Math.min(Number(idx) || 0, maxIndex));

    setSelectorOpen(false);
    setCurrentKind(kind);
    setSteps(nextSteps);
    setStepIndex(safeIndex);
    setRun(true);
    persistProgress(kind, safeIndex, advancedFlag);

    const route = nextSteps?.[safeIndex]?.route ?? nextSteps?.[0]?.route;
    if (route && location.pathname !== route) {
      navigate(route);
    }
  };

  useEffect(() => {
    if (!run) return;
    const s = steps?.[stepIndex];
    const route = s?.route;
    if (!route) return;
    if (location.pathname === route) return;
    navigate(route);
  }, [run, stepIndex, steps, location.pathname, navigate]);

  useEffect(() => {
    if (!run) return;
    if (!currentKind) return;
    persistProgress(currentKind, stepIndex, includeAdvanced);
  }, [run, currentKind, stepIndex, includeAdvanced]);

  const handleJoyrideCallback = (data) => {
    const { action, index, status, type } = data;

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRun(false);
      setSteps([]);
      setStepIndex(0);
      setCurrentKind(null);
      clearProgress();
      return;
    }

    if (type === EVENTS.TARGET_NOT_FOUND) {
      setStepIndex((prev) => Math.min(prev + 1, (steps?.length ?? 1) - 1));
      return;
    }

    if (type === EVENTS.STEP_AFTER) {
      if (action === ACTIONS.PREV) {
        setStepIndex((prev) => Math.max(prev - 1, 0));
        return;
      }
      setStepIndex((prev) => Math.min(prev + 1, (steps?.length ?? 1) - 1));
    }

    if (type === EVENTS.TOUR_END) {
      setRun(false);
      setSteps([]);
      setStepIndex(0);
      setCurrentKind(null);
      clearProgress();
    }
  };

  return (
    <TutorialContext.Provider value={value}>
      <Joyride
        steps={steps}
        run={run}
        stepIndex={stepIndex}
        callback={handleJoyrideCallback}
        continuous
        showSkipButton
        hideCloseButton
        disableOverlayClose
        scrollToFirstStep
        spotlightPadding={12}
        locale={{
          back: "Indietro",
          close: "Chiudi",
          last: "Fine",
          next: "Avanti",
          skip: "Salta",
        }}
        styles={{
          options: {
            zIndex: 10000,
            primaryColor: "#111827",
            backgroundColor: "#FEF3C7",
            textColor: "#111827",
            arrowColor: "#FEF3C7",
          },
          overlay: {
            backgroundColor: "rgba(0,0,0,0.55)",
          },
          tooltipContainer: {
            borderRadius: 12,
            padding: 14,
            boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
          },
          buttonNext: {
            backgroundColor: "#111827",
            color: "#ffffff",
          },
          buttonBack: {
            color: "#111827",
          },
        }}
      />

      <Dialog open={selectorOpen} onOpenChange={setSelectorOpen}>
        <DialogContent className="sm:max-w-md overflow-hidden border-amber-200/80 dark:border-amber-400/30 bg-gradient-to-br from-amber-50 to-background dark:from-amber-950/30 dark:to-background">
          <DialogHeader className="-mx-6 -mt-6 px-6 pt-5 pb-4 bg-gradient-to-r from-amber-200 to-amber-100 text-slate-900 dark:from-amber-300/40 dark:to-amber-200/20">
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Guida
            </DialogTitle>
            <DialogDescription className="text-slate-900/80">
              Scegli un tour per imparare le funzioni principali. Puoi interrompere e riprendere quando vuoi.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-200/80 bg-white/60 px-3 py-2 text-slate-900 dark:border-amber-400/20 dark:bg-amber-950/10 dark:text-amber-50">
              <div className="min-w-0">
                <div className="text-sm font-semibold">Mostra anche avanzati</div>
                <div className="text-xs opacity-80">Aggiunge tip e passaggi extra (puoi sempre saltare).</div>
              </div>
              <Switch checked={includeAdvanced} onCheckedChange={setIncludeAdvanced} />
            </div>

            <div className="text-xs text-slate-700/80 dark:text-amber-50/70">
              Consigliato per questa pagina: <span className="font-semibold">{getKindMeta(recommendedKind).title}</span>
            </div>

            {savedProgress?.kind && (() => {
              const meta = getKindMeta(savedProgress.kind);
              const total = getStepsForKind(savedProgress.kind, { advancedOverride: savedProgress.advanced })?.length ?? 0;
              const current = Math.min((savedProgress.stepIndex ?? 0) + 1, Math.max(total, 1));
              const Icon = meta.icon;

              return (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start h-auto py-3 border-amber-300 bg-amber-50 hover:bg-amber-100 text-slate-900 dark:bg-amber-950/30 dark:hover:bg-amber-950/50 dark:text-amber-50 dark:border-amber-500/50"
                  onClick={resumeTour}
                >
                  <div className="flex items-start gap-3">
                    <Icon className="h-5 w-5 mt-0.5 text-amber-700 dark:text-amber-300" />
                    <div className="text-left">
                      <div className="font-semibold">Riprendi</div>
                      <div className="text-xs text-slate-700/80 dark:text-amber-50/80">
                        {meta.title}{total ? ` • step ${current}/${total}` : ""}{savedProgress.advanced ? " • avanzato" : " • base"}
                      </div>
                    </div>
                  </div>
                </Button>
              );
            })()}

            {kindsForDialog.map((kind) => {
              const meta = getKindMeta(kind);
              const Icon = meta.icon;
              const isRecommended = kind === recommendedKind;

              return (
                <Button
                  key={kind}
                  type="button"
                  variant="default"
                  className={`w-full justify-start h-auto py-3 bg-amber-200 hover:bg-amber-300 text-slate-900 dark:bg-amber-300/30 dark:hover:bg-amber-300/40 dark:text-amber-50 ${isRecommended ? "ring-2 ring-amber-400/60 dark:ring-amber-200/30" : ""}`}
                  onClick={() => startTour(kind)}
                >
                  <div className="flex items-start gap-3 w-full">
                    <Icon className="h-5 w-5 mt-0.5" />
                    <div className="text-left">
                      <div className="font-semibold">{meta.title}</div>
                      <div className="text-xs text-slate-900/70 dark:text-amber-50/70">{meta.description}</div>
                    </div>
                    {isRecommended && (
                      <span className="ml-auto mt-0.5 inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-900 ring-1 ring-amber-200 dark:bg-amber-200/10 dark:text-amber-100 dark:ring-amber-200/20">
                        Consigliato
                      </span>
                    )}
                  </div>
                </Button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <Button
        type="button"
        className="fixed bottom-20 right-4 md:bottom-24 md:right-6 z-50 h-12 w-12 md:w-auto md:px-4 rounded-full bg-gradient-to-br from-amber-200 to-amber-300 hover:from-amber-100 hover:to-amber-200 text-slate-900 shadow-2xl ring-1 ring-black/10 dark:ring-amber-200/10"
        onClick={() => setSelectorOpen(true)}
        aria-label="Apri guida"
        title="Guida"
      >
        <HelpCircle className="h-5 w-5 md:mr-2" />
        <span className="hidden md:inline">Guida</span>
      </Button>
    </TutorialContext.Provider>
  );
}
