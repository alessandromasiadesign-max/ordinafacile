import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import Joyride, { ACTIONS, EVENTS, STATUS } from "react-joyride";
import { useLocation, useNavigate } from "react-router-dom";
import { HelpCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
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
    const nextSteps = (() => {
      if (kind === "menu") return buildMenuTour();
      if (kind === "orders") return buildOrdersTour();
      if (kind === "marketing") return buildMarketingTour(includeAdminTours);
      return [];
    })();

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

    const nextSteps = (() => {
      if (kind === "menu") return buildMenuTour();
      if (kind === "orders") return buildOrdersTour();
      if (kind === "marketing") return buildMarketingTour(includeAdminTours);
      return [];
    })();

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
        spotlightPadding={8}
        styles={{
          options: {
            zIndex: 10000,
            primaryColor: "#e74c3c",
          },
        }}
      />

      <Dialog open={selectorOpen} onOpenChange={setSelectorOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Guida</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {savedProgress?.kind && (
              <Button type="button" variant="outline" className="w-full" onClick={resumeTour}>
                Riprendi tour
              </Button>
            )}
            <Button type="button" className="w-full" onClick={() => startTour("menu")}>
              Tour Menu
            </Button>
            <Button type="button" className="w-full" onClick={() => startTour("orders")}>
              Tour Ordini
            </Button>
            <Button type="button" className="w-full" onClick={() => startTour("marketing")}>
              Tour Marketing
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Button
        type="button"
        className="fixed bottom-5 right-5 z-[9999] h-12 w-12 rounded-full bg-red-600 hover:bg-red-700 shadow-lg"
        onClick={() => setSelectorOpen(true)}
        aria-label="Apri guida"
        title="Guida"
      >
        <HelpCircle className="h-5 w-5" />
      </Button>
    </TutorialContext.Provider>
  );
}
