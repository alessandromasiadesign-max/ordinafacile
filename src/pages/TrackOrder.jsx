import React, { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/api/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";

const POLL_MS = 5_000;

const getStatusFromRecord = (order) => {
  const rawStato = String(order?.stato ?? "").trim();
  const rawStatus = String(order?.status ?? "").trim();

  const toIt = (raw) => {
    const v = String(raw ?? "").trim().toLowerCase();
    if (!v) return "";
    if (v === "pending") return "nuovo";
    if (v === "confirmed") return "confermato";
    if (v === "preparing") return "in_preparazione";
    if (v === "ready") return "pronto";
    if (v === "delivered") return "completato";
    if (v === "cancelled") return "annullato";
    return v;
  };

  const statoIt = toIt(rawStato);
  const statusIt = toIt(rawStatus);
  const knownIt = new Set([
    "nuovo",
    "confermato",
    "in_preparazione",
    "pronto",
    "in_consegna",
    "completato",
    "annullato",
  ]);

  if (knownIt.has(statoIt) && statoIt !== "nuovo") return statoIt;
  if (knownIt.has(statusIt) && statusIt !== "nuovo") return statusIt;
  if (knownIt.has(statoIt)) return statoIt;
  return statusIt || rawStatus || rawStato;
};

const getTypeFromRecord = (order) => order?.tipo_consegna ?? order?.delivery_type ?? "";

const getTotalFromRecord = (order) => {
  const raw = order?.totale ?? order?.total;
  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
};

const statusUi = (raw) => {
  const status = String(raw ?? "").toLowerCase();
  if (status === "nuovo") return { label: "Inviato", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-100" };
  if (status === "confermato") return { label: "Confermato", className: "bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-100" };
  if (status === "in_preparazione") return { label: "In preparazione", className: "bg-purple-100 text-purple-800 dark:bg-purple-950/30 dark:text-purple-100" };
  if (status === "pronto") return { label: "Pronto", className: "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-100" };
  if (status === "in_consegna") return { label: "In consegna", className: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-100" };
  if (status === "completato") return { label: "Completato", className: "bg-slate-100 text-slate-800 dark:bg-slate-900/40 dark:text-slate-100" };
  if (status === "annullato") return { label: "Annullato", className: "bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-100" };
  if (status === "pending") return { label: "Inviato", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-100" };
  if (status === "confirmed") return { label: "Confermato", className: "bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-100" };
  if (status === "preparing") return { label: "In preparazione", className: "bg-purple-100 text-purple-800 dark:bg-purple-950/30 dark:text-purple-100" };
  if (status === "ready") return { label: "Pronto", className: "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-100" };
  if (status === "delivered") return { label: "Completato", className: "bg-slate-100 text-slate-800 dark:bg-slate-900/40 dark:text-slate-100" };
  if (status === "cancelled") return { label: "Annullato", className: "bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-100" };
  return { label: status || "—", className: "bg-muted text-muted-foreground" };
};

const typeLabel = (raw) => {
  const t = String(raw ?? "").toLowerCase();
  if (t === "consegna" || t === "delivery") return "Consegna";
  if (t === "asporto" || t === "pickup") return "Asporto";
  return t || "—";
};

export default function TrackOrder() {
  const [searchParams] = useSearchParams();
  const orderNumber = (searchParams.get("order") || "").trim();
  const orderId = (searchParams.get("oid") || "").trim();

  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState(null);
  const [order, setOrder] = useState(null);

  const pollRef = useRef(null);
  const lastStatusRef = useRef(null);
  const lastOrderIdRef = useRef(null);

  const fetchOrderViaEdge = async () => {
    const { data, error } = await supabase.functions.invoke('track-order', {
      body: {
        orderId: orderId || null,
        orderNumber: orderNumber || null,
      },
    });

    if (error) throw error;

    if (data?.order) return data.order;

    const apiError = typeof data?.error === 'string' ? data.error : '';
    if (apiError && apiError.toLowerCase().includes('not found')) return null;
    if (apiError) throw new Error(apiError);

    return null;
  };

  const fetchOrderViaDirect = async () => {
    let query = supabase
      .from("orders")
      .select("*")
      .limit(1);

    if (orderId) {
      query = query.eq('id', orderId);
    } else {
      query = query.or(`numero_ordine.eq.${orderNumber},order_number.eq.${orderNumber}`);
    }

    const { data, error: fetchError } = await query.maybeSingle();

    if (fetchError) {
      throw fetchError;
    }

    return data ?? null;
  };

  const fetchOrder = async () => {
    if (!orderNumber && !orderId) return null;

    let edgeError = null;
    try {
      return await fetchOrderViaEdge();
    } catch (e) {
      edgeError = e;
    }

    const directRow = await fetchOrderViaDirect();
    if (directRow) return directRow;

    if (edgeError) {
      const msg = typeof edgeError?.message === 'string' ? edgeError.message : '';
      throw new Error(
        "Tracking momentaneamente non disponibile. Riprova tra qualche secondo." +
          (msg ? ` (${msg})` : "")
      );
    }

    return null;
  };

  const verifyAndLoad = async () => {
    if (!orderNumber && !orderId) return;
    setLoading(true);
    setError(null);

    try {
      const row = await fetchOrder();
      if (!row) {
        if (verified) {
          setError("Aggiornamento non disponibile in questo momento. Riprova tra qualche secondo.");
        } else {
          setVerified(false);
          setOrder(null);
          setError("Ordine non trovato. Controlla il numero ordine.");
        }
        return;
      }

      setVerified(true);
      setOrder(row);
    } catch (e) {
      console.error("[TrackOrder] fetch error", e);
      setVerified(false);
      setOrder(null);
      const code = typeof e?.code === "string" ? e.code : "";
      const message = typeof e?.message === "string" ? e.message : "";
      if (code === "42501") {
        setError("Accesso negato all'ordine. Contatta il ristorante.");
      } else {
        setError("Errore nel recupero dell'ordine. Riprova." + (code || message ? ` (${[code, message].filter(Boolean).join(' - ')})` : ""));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!orderNumber && !orderId) return;
    verifyAndLoad();
  }, [orderNumber, orderId]);

  useEffect(() => {
    if (!verified || !order?.id) return;

    const channel = supabase
      .channel(`track-order-${order.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${order.id}`,
        },
        (payload) => {
          if (payload?.new) setOrder(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [verified, order?.id]);

  useEffect(() => {
    if (!verified || !order?.id) return;

    const currentStatus = getStatusFromRecord(order);

    const confirmedToastKey = `track-order-confirmed-toast:${order.id}`;
    const isConfirmed = currentStatus === "confermato";
    const canUseSessionStorage = typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
    const confirmedToastAlreadyShown = (() => {
      if (!canUseSessionStorage) return false;
      try {
        return window.sessionStorage.getItem(confirmedToastKey) === "1";
      } catch {
        return false;
      }
    })();

    const markConfirmedToastShown = () => {
      if (!canUseSessionStorage) return;
      try {
        window.sessionStorage.setItem(confirmedToastKey, "1");
      } catch {
        // ignore
      }
    };

    if (lastOrderIdRef.current !== order.id) {
      lastOrderIdRef.current = order.id;
      lastStatusRef.current = currentStatus;

      if (isConfirmed && !confirmedToastAlreadyShown) {
        toast({
          title: "Ordine confermato",
          description: "Il ristorante ha confermato il tuo ordine.",
          type: "success",
          duration: 4000,
        });
        markConfirmedToastShown();
      }
      return;
    }

    const prevStatus = lastStatusRef.current;
    if (prevStatus && currentStatus && prevStatus !== currentStatus) {
      const prevUi = statusUi(prevStatus);
      const nextUi = statusUi(currentStatus);
      const type = currentStatus === "annullato" ? "error" : "success";

      if (isConfirmed && !confirmedToastAlreadyShown) {
        toast({
          title: "Ordine confermato",
          description: "Il ristorante ha confermato il tuo ordine.",
          type: "success",
          duration: 4000,
        });
        markConfirmedToastShown();
      } else {
        toast({
          title: "Stato ordine aggiornato",
          description: `${prevUi.label} → ${nextUi.label}`,
          type,
          duration: 4000,
        });
      }
    }

    lastStatusRef.current = currentStatus;
  }, [verified, order?.id, order?.stato, order?.status]);

  useEffect(() => {
    if (!verified) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    if (pollRef.current) return;

    pollRef.current = setInterval(async () => {
      try {
        const row = await fetchOrder();
        if (row) setOrder(row);
      } catch (e) {
        const code = typeof e?.code === "string" ? e.code : "";
        if (code === "42501") {
          setError("Aggiornamenti non disponibili: accesso negato all'ordine.");
        }
      }
    }, POLL_MS);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [verified, orderNumber, orderId]);

  const ui = statusUi(getStatusFromRecord(order));

  return (
    <div className="min-h-screen bg-background text-foreground p-4">
      <div className="max-w-xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Segui il tuo ordine</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!orderNumber && !orderId ? (
              <div className="text-sm text-muted-foreground">
                Link non valido: manca il numero d'ordine.
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Numero ordine</div>
                  <div className="font-semibold">{orderNumber ? `#${orderNumber}` : `ID: ${orderId}`}</div>
                </div>

                {!verified ? (
                  <>
                    {error && <div className="text-sm text-red-600">{error}</div>}

                    <Button
                      className="w-full bg-red-600 hover:bg-red-700"
                      onClick={verifyAndLoad}
                      disabled={loading}
                    >
                      {loading ? "Caricamento..." : "Riprova"}
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm text-muted-foreground">Stato</div>
                      <Badge className={ui.className}>{ui.label}</Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg border border-border bg-card p-3">
                        <div className="text-xs text-muted-foreground">Tipo</div>
                        <div className="font-medium">{typeLabel(getTypeFromRecord(order))}</div>
                      </div>
                      <div className="rounded-lg border border-border bg-card p-3">
                        <div className="text-xs text-muted-foreground">Totale</div>
                        <div className="font-medium">
                          {(() => {
                            const total = getTotalFromRecord(order);
                            return total === null ? "—" : `€${total.toFixed(2)}`;
                          })()}
                        </div>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      Aggiornamento automatico in tempo reale.
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setVerified(false);
                        setOrder(null);
                        setError(null);
                      }}
                    >
                      Esci
                    </Button>
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
