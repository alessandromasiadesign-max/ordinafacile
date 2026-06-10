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

  const value = useMemo(() => {
    return {
      openSelector: () => setSelectorOpen(true),
    };
  }, []);

  const startTour = (kind) => {
    const nextSteps = (() => {
      if (kind === "menu") return buildMenuTour();
      if (kind === "orders") return buildOrdersTour();
      if (kind === "marketing") return buildMarketingTour(includeAdminTours);
      return [];
    })();

    setSelectorOpen(false);
    setSteps(nextSteps);
    setStepIndex(0);
    setRun(true);

    const firstRoute = nextSteps?.[0]?.route;
    if (firstRoute && location.pathname !== firstRoute) {
      navigate(firstRoute);
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

  const handleJoyrideCallback = (data) => {
    const { action, index, status, type } = data;

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRun(false);
      setSteps([]);
      setStepIndex(0);
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
