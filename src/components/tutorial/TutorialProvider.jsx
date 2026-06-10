import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import Joyride, { ACTIONS, EVENTS, STATUS } from "react-joyride";
import { useLocation, useNavigate } from "react-router-dom";
import { HelpCircle, ShoppingBag, Tag, UtensilsCrossed } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

const TutorialContext = createContext(null);

const STORAGE_KEY = "of_tutorial_progress";

export function useTutorial() {
  return useContext(TutorialContext);
}

const buildMenuTour = () => [
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
    target: '[data-tour="menu-search"]',
    content: "Puoi cercare velocemente categorie e prodotti.",
    placement: "bottom",
    route: "/MenuManagement",
  },
  {
    target: '[data-tour="public-menu-link"]',
    content: "Qui trovi la pagina pubblica del menu da condividere ai clienti.",
    placement: "right",
  },
];

const buildOrdersTour = () => [
  {
    target: '[data-tour="nav-orders"]',
    content: "Qui visualizzi e gestisci gli ordini in arrivo.",
    placement: "right",
    route: "/Orders",
  },
  {
    target: '[data-tour="orders-view-toggle"]',
    content: "Puoi scegliere la vista Lista o Kanban.",
    placement: "bottom",
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

const buildMarketingTour = (includeAdmin) => {
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

  if (!includeAdmin) return base;

  return [
    ...base,
    {
      target: '[data-tour="nav-discount-codes"]',
      content: "Da qui puoi gestire i codici sconto (solo admin).",
      placement: "right",
      route: "/DiscountCodes",
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

  const value = useMemo(() => {
    return {
      openSelector: () => setSelectorOpen(true),
    };
  }, []);

  const getStepsForKind = (kind) => {
    if (kind === "menu") return buildMenuTour();
    if (kind === "orders") return buildOrdersTour();
    if (kind === "marketing") return buildMarketingTour(includeAdminTours);
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
    return { title: "Tour", description: "", icon: HelpCircle };
  };

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
      if (!kind || !Number.isFinite(Number(idx))) {
        setSavedProgress(null);
        return;
      }
      setSavedProgress({ kind, stepIndex: Number(idx) });
    } catch {
      setSavedProgress(null);
    }
  }, [includeAdminTours]);

  const persistProgress = (nextKind, nextIndex) => {
    try {
      if (!nextKind || !Number.isFinite(Number(nextIndex))) return;
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ kind: nextKind, stepIndex: Number(nextIndex) }));
      setSavedProgress({ kind: nextKind, stepIndex: Number(nextIndex) });
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
    persistProgress(kind, 0);

    const firstRoute = nextSteps?.[0]?.route;
    if (firstRoute && location.pathname !== firstRoute) {
      navigate(firstRoute);
    }
  };

  const resumeTour = () => {
    const kind = savedProgress?.kind;
    const idx = savedProgress?.stepIndex ?? 0;
    if (!kind) return;

    const nextSteps = getStepsForKind(kind);

    const maxIndex = Math.max((nextSteps?.length ?? 1) - 1, 0);
    const safeIndex = Math.max(0, Math.min(Number(idx) || 0, maxIndex));

    setSelectorOpen(false);
    setCurrentKind(kind);
    setSteps(nextSteps);
    setStepIndex(safeIndex);
    setRun(true);
    persistProgress(kind, safeIndex);

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
    persistProgress(currentKind, stepIndex);
  }, [run, currentKind, stepIndex]);

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
            primaryColor: "#e74c3c",
            backgroundColor: "hsl(var(--background))",
            textColor: "hsl(var(--foreground))",
            arrowColor: "hsl(var(--background))",
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
            backgroundColor: "#e74c3c",
          },
          buttonBack: {
            color: "hsl(var(--foreground))",
          },
        }}
      />

      <Dialog open={selectorOpen} onOpenChange={setSelectorOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Guida
            </DialogTitle>
            <DialogDescription>
              Scegli un tour per imparare le funzioni principali. Puoi interrompere e riprendere quando vuoi.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {savedProgress?.kind && (() => {
              const meta = getKindMeta(savedProgress.kind);
              const total = getStepsForKind(savedProgress.kind)?.length ?? 0;
              const current = Math.min((savedProgress.stepIndex ?? 0) + 1, Math.max(total, 1));
              const Icon = meta.icon;

              return (
                <Button type="button" variant="outline" className="w-full justify-start h-auto py-3" onClick={resumeTour}>
                  <div className="flex items-start gap-3">
                    <Icon className="h-5 w-5 mt-0.5 text-red-600" />
                    <div className="text-left">
                      <div className="font-semibold">Riprendi</div>
                      <div className="text-xs text-muted-foreground">
                        {meta.title}{total ? ` • step ${current}/${total}` : ""}
                      </div>
                    </div>
                  </div>
                </Button>
              );
            })()}

            {(["menu", "orders", "marketing"]).map((kind) => {
              const meta = getKindMeta(kind);
              const Icon = meta.icon;

              return (
                <Button
                  key={kind}
                  type="button"
                  variant="default"
                  className="w-full justify-start h-auto py-3"
                  onClick={() => startTour(kind)}
                >
                  <div className="flex items-start gap-3">
                    <Icon className="h-5 w-5 mt-0.5" />
                    <div className="text-left">
                      <div className="font-semibold">{meta.title}</div>
                      <div className="text-xs text-white/80">{meta.description}</div>
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <Button
        type="button"
        className="fixed bottom-4 right-20 md:bottom-6 md:right-24 z-50 h-12 w-12 md:w-auto md:px-4 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 shadow-2xl"
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
