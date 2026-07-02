import { Core } from '@/api/integrations';
import { Restaurant, SubscriptionPlan, SubscriptionTransaction, PlatformSettings, SubscriptionDiscountCode } from '@/api/entities';
import React, { useState, useEffect } from "react";
import { supabase } from '@/api/supabaseClient';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { Check, CreditCard, Calendar } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, addMonths, addYears } from "date-fns";
import { it } from "date-fns/locale";

export default function RenewSubscription() {
  const [restaurant, setRestaurant] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingPeriod, setBillingPeriod] = useState("mensile");
  const [paymentMethod, setPaymentMethod] = useState("bonifico");
  const [stripeReturnStatus, setStripeReturnStatus] = useState(null);
  const [paypalSdkStatus, setPaypalSdkStatus] = useState('idle');
  const [paypalRenderNonce, setPaypalRenderNonce] = useState(0);
  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const isRestaurantBlocked = (() => {
    if (!restaurant) return false;
    if (restaurant.abbonamento_attivo !== true) return true;
    if (!restaurant.abbonamento_scadenza) return false;
    const expiry = new Date(restaurant.abbonamento_scadenza);
    expiry.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return expiry < today;
  })();

  const {
    data: plans = [],
    isLoading: isLoadingPlans,
    error: plansError,
  } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: () => SubscriptionPlan.filter({ attivo: true }, "ordine"),
    initialData: [],
  });

  const {
    data: platformSettings = [],
    isLoading: isLoadingPlatformSettings,
    error: platformSettingsError,
  } = useQuery({
    queryKey: ['platform-settings'],
    queryFn: () => PlatformSettings.list(),
    initialData: [],
  });

  const paymentInfo = platformSettings[0]?.payment_info || {};
  const paypalClientId = paymentInfo?.paypal_client_id;

  const paymentMethodOptions = [
    {
      value: 'bonifico',
      label: 'Bonifico Bancario',
      enabled: true,
    },
    {
      value: 'paypal',
      label: 'PayPal',
      enabled: !!paymentInfo.paypal_client_id || !!paymentInfo.paypal_email,
    },
    {
      value: 'carta',
      label: 'Carta di Credito',
      enabled: !!paymentInfo.stripe_account_id,
    },
  ].filter((m) => m.enabled);

  useEffect(() => {
    if (paymentMethod !== 'paypal') return;
    if (!paypalClientId) return;

    if (typeof window !== 'undefined' && window.paypal) {
      if (paypalSdkStatus !== 'ready') setPaypalSdkStatus('ready');
      return;
    }

    const existing = document.getElementById('paypal-js-sdk');
    if (existing) {
      if (paypalSdkStatus === 'idle') setPaypalSdkStatus('loading');
      return;
    }

    setPaypalSdkStatus('loading');

    const script = document.createElement('script');
    script.id = 'paypal-js-sdk';
    script.async = true;
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(paypalClientId)}&currency=EUR&intent=capture`;
    script.onload = () => {
      setPaypalSdkStatus('ready');
      setPaypalRenderNonce((n) => n + 1);
    };
    script.onerror = () => {
      setPaypalSdkStatus('error');
    };
    document.body.appendChild(script);
  }, [paymentMethod, paypalClientId, paypalSdkStatus]);

  useEffect(() => {
    if (paymentMethodOptions.length === 0) return;
    const stillValid = paymentMethodOptions.some((m) => m.value === paymentMethod);
    if (!stillValid) setPaymentMethod(paymentMethodOptions[0].value);
  }, [paymentMethodOptions, paymentMethod]);

  useEffect(() => {
    loadRestaurant();
  }, []);

  useEffect(() => {
    if (!restaurant) return;
    if (!Array.isArray(plans) || plans.length === 0) return;

    const currentPlan = plans.find((p) => p?.nome === restaurant?.abbonamento_tipo);
    if (currentPlan?.id) {
      if (!selectedPlan || selectedPlan.id !== currentPlan.id) {
        setSelectedPlan(currentPlan);
      }
      return;
    }

    if (!selectedPlan) {
      setSelectedPlan(plans[0]);
    }
  }, [plans, restaurant, selectedPlan]);

  const normalizeDiscountCode = (c) => String(c ?? '').trim().toUpperCase();

  const applyDiscountMutation = useMutation({
    mutationFn: async ({ code, planName, basePrice }) => {
      const normalized = normalizeDiscountCode(code);
      if (!normalized) throw new Error('Inserisci un codice sconto');
      if (!planName) throw new Error('Seleziona un piano');
      if (!Number.isFinite(basePrice)) throw new Error('Prezzo non valido');

      const rows = await SubscriptionDiscountCode.filter({ codice: normalized }, '-created_at', 5);
      const found = (rows || [])[0];
      if (!found) throw new Error('Codice sconto non valido');

      const isActive = found?.attivo ?? found?.is_active;
      if (isActive !== true) throw new Error('Codice sconto non attivo');

      if (Array.isArray(found?.piani_applicabili) && found.piani_applicabili.length > 0) {
        if (!found.piani_applicabili.includes(planName)) {
          throw new Error('Codice sconto non applicabile a questo piano');
        }
      }

      const today = new Date();
      const start = found?.data_inizio ? new Date(found.data_inizio) : null;
      const end = found?.data_scadenza ? new Date(found.data_scadenza) : null;
      if (start && !Number.isNaN(start.getTime()) && start > today) throw new Error('Codice sconto non ancora valido');
      if (end && !Number.isNaN(end.getTime()) && end < today) throw new Error('Codice sconto scaduto');

      const tipo = found?.tipo_sconto;
      const valore = Number(found?.valore_sconto ?? 0);
      let discountedPrice = basePrice;

      if (tipo === 'percentuale') {
        discountedPrice = basePrice * (1 - Math.max(0, Math.min(100, valore)) / 100);
      } else if (tipo === 'fisso') {
        discountedPrice = Math.max(0, basePrice - Math.max(0, valore));
      } else if (tipo === 'gratis_completo') {
        discountedPrice = 0;
      }

      return {
        code: normalized,
        tipo_sconto: tipo,
        valore_sconto: valore,
        discountedPrice,
      };
    },
    onSuccess: (d) => {
      setAppliedDiscount(d);
      toast({
        title: 'Codice sconto applicato',
        description: d?.code,
        type: 'success',
      });
    },
    onError: (error) => {
      setAppliedDiscount(null);
      toast({
        title: 'Codice sconto non valido',
        description: error?.message || 'Impossibile applicare il codice sconto',
        type: 'error',
      });
    },
  });

  const stripeCheckoutMutation = useMutation({
    mutationFn: async ({ discount_code } = {}) => {
      if (!restaurant?.id) throw new Error('Ristorante non caricato');
      if (!selectedPlan?.id) throw new Error('Seleziona un piano');

      const { data, error } = await supabase.functions.invoke('stripe-create-checkout-session', {
        body: {
          restaurant_id: restaurant.id,
          plan_id: selectedPlan.id,
          billing_period: billingPeriod,
          discount_code: discount_code || null,
        },
      });
      if (error) throw error;
      const url = data?.url;
      if (!url) throw new Error('URL Stripe non disponibile');
      window.location.href = url;
    },
    onError: (error) => {
      console.error('Errore Stripe checkout:', error);
      alert(error?.message || 'Errore durante l’avvio del pagamento con carta');
    },
  });

  const paypalCaptureMutation = useMutation({
    mutationFn: async ({ orderId }) => {
      if (!restaurant?.id) throw new Error('Ristorante non caricato');
      if (!selectedPlan?.id) throw new Error('Seleziona un piano');

      const { data, error } = await supabase.functions.invoke('paypal-capture-order', {
        body: {
          order_id: orderId || null,
          restaurant_id: restaurant.id,
          plan_id: selectedPlan.id,
          billing_period: billingPeriod,
          discount_code: normalizeDiscountCode(discountCode) || null,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurants'] });
      toast({
        title: 'Pagamento completato',
        description: 'Abbonamento attivato.',
        type: 'success',
      });
      loadRestaurant();
    },
    onError: (error) => {
      console.error('Errore PayPal capture:', error);
      toast({
        title: 'Errore PayPal',
        description: error?.message || 'Impossibile completare il pagamento',
        type: 'error',
      });
    },
  });

  const renewMutation = useMutation({
    mutationFn: async (data) => {
      const transaction = await SubscriptionTransaction.create(data);

      const newExpiry = data?.data_scadenza
        ? new Date(data.data_scadenza)
        : (billingPeriod === "mensile" ? addMonths(new Date(), 1) : addYears(new Date(), 1));

      // Invia email di conferma
      await Core.SendEmail({
        to: ((await supabase.auth.getUser()).data.user).email,
        subject: "Conferma Rinnovo Abbonamento",
        body: `
          <h2>Rinnovo Abbonamento Ricevuto!</h2>
          <p>Grazie per aver rinnovato il tuo abbonamento.</p>

          <br>
          <p><strong>Piano:</strong> ${selectedPlan.nome}</p>
          <p><strong>Periodo:</strong> ${billingPeriod === 'mensile' ? 'Mensile' : 'Annuale'}</p>
          <p><strong>Importo:</strong> €${data.importo.toFixed(2)}</p>
          <p><strong>Nuova Scadenza:</strong> ${format(newExpiry, 'dd/MM/yyyy')}</p>
          <br>
          ${paymentMethod === 'bonifico' ? `
            <p><strong>Dati per il Bonifico:</strong></p>
            <p>IBAN: ${paymentInfo.iban || 'N/A'}</p>
            <p>Intestatario: ${paymentInfo.intestatario || 'N/A'}</p>
            <p>Causale: Rinnovo Abbonamento ${restaurant.nome}</p>
          ` : ''}
          ${paymentMethod === 'paypal' ? `
            <p><strong>Dati PayPal:</strong></p>
            <p>Email PayPal: ${paymentInfo.paypal_email || 'N/A'}</p>
            <p>Causale: Rinnovo Abbonamento ${restaurant.nome}</p>
          ` : ''}
          <br>
          <p>Il tuo abbonamento sarà attivo non appena riceveremo il pagamento.</p>
        `
      });

      return transaction;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurants'] });
      alert("Richiesta di rinnovo inviata! Riceverai una conferma via email.");
      window.location.reload();
    },
  });

  const handleRenew = async () => {
    if (!selectedPlan) {
      alert("Seleziona un piano");
      return;
    }

    const basePrice = Number(billingPeriod === "mensile"
      ? selectedPlan.prezzo_mensile
      : selectedPlan.prezzo_annuale);

    const currentCode = normalizeDiscountCode(discountCode);

    if (paymentMethod === 'carta') {
      stripeCheckoutMutation.mutate({
        discount_code: currentCode || null,
      });
      return;
    }

    let discountToUse = appliedDiscount;
    if (currentCode) {
      if (!discountToUse || discountToUse.code !== currentCode) {
        try {
          discountToUse = await applyDiscountMutation.mutateAsync({
            code: currentCode,
            planName: selectedPlan.nome,
            basePrice,
          });
        } catch {
          discountToUse = null;
        }
      }
    } else {
      discountToUse = null;
    }

    const importo = Number(discountToUse?.discountedPrice ?? basePrice);

    const dataInizio = new Date();
    let dataScadenza = billingPeriod === "mensile"
      ? addMonths(dataInizio, 1)
      : addYears(dataInizio, 1);

    if (discountToUse?.tipo_sconto === 'mesi_gratis' && Number.isFinite(discountToUse?.valore_sconto) && discountToUse.valore_sconto > 0) {
      dataScadenza = addMonths(dataScadenza, Math.round(discountToUse.valore_sconto));
    }

    renewMutation.mutate({
      restaurant_id: restaurant.id,
      piano: selectedPlan.nome,
      tipo: billingPeriod,
      importo: importo,
      metodo_pagamento: paymentMethod,
      codice_sconto: currentCode || null,
      stato: "pending",
      data_inizio: format(dataInizio, 'yyyy-MM-dd'),
      data_scadenza: format(dataScadenza, 'yyyy-MM-dd'),
      rinnovo_automatico: false
    });
  };

  const selectedPrice = selectedPlan && Number(
    billingPeriod === "mensile"
      ? selectedPlan.prezzo_mensile
      : selectedPlan.prezzo_annuale
  );

  const finalPrice = Number(
    appliedDiscount?.code && normalizeDiscountCode(discountCode) === appliedDiscount.code
      ? appliedDiscount.discountedPrice
      : selectedPrice
  );

  useEffect(() => {
    if (paymentMethod !== 'paypal') return;
    if (!paypalClientId) return;
    if (paypalSdkStatus !== 'ready') return;
    if (!restaurant?.id) return;
    if (!selectedPlan?.id) return;
    if (!Number.isFinite(finalPrice)) return;
    if (finalPrice <= 0) return;

    const container = document.getElementById('paypal-button-container');
    if (!container) return;
    if (!window.paypal?.Buttons) return;

    container.innerHTML = '';

    const buttons = window.paypal.Buttons({
      createOrder: async () => {
        const { data, error } = await supabase.functions.invoke('paypal-create-order', {
          body: {
            restaurant_id: restaurant.id,
            plan_id: selectedPlan.id,
            billing_period: billingPeriod,
            discount_code: normalizeDiscountCode(discountCode) || null,
          },
        });
        if (error) throw error;
        if (!data?.id) throw new Error('Ordine PayPal non disponibile');
        return data.id;
      },
      onApprove: async (data) => {
        const orderId = data?.orderID;
        if (!orderId) throw new Error('Order ID mancante');
        await paypalCaptureMutation.mutateAsync({ orderId });
      },
      onError: (err) => {
        console.error('Errore PayPal Buttons:', err);
        toast({
          title: 'Errore PayPal',
          description: 'Errore durante il checkout. Riprova.',
          type: 'error',
        });
      },
    });

    buttons.render('#paypal-button-container');

    return () => {
      try {
        container.innerHTML = '';
      } catch {
        // ignore
      }
    };
  }, [paymentMethod, paypalClientId, paypalSdkStatus, paypalRenderNonce, restaurant?.id, selectedPlan?.id, billingPeriod, discountCode, finalPrice, toast, paypalCaptureMutation]);

  const loadRestaurant = async () => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user?.id) return;

      const isAdmin = user?.app_metadata?.role === 'admin' || user?.user_metadata?.role === 'admin';
      const storedId = localStorage.getItem('selected_restaurant_id');

      const restaurants = isAdmin
        ? await Restaurant.list('-created_at')
        : await Restaurant.filter({ user_id: user.id });

      if (restaurants.length > 0) {
        const selected = restaurants.find((r) => r.id === storedId) || restaurants[0];
        if (selected?.id) {
          localStorage.setItem('selected_restaurant_id', selected.id);
        }
        setRestaurant(selected);
        // Pre-seleziona il piano corrente se esiste
        const currentPlan = plans.find(p => p.nome === selected.abbonamento_tipo);
        if (currentPlan) {
          setSelectedPlan(currentPlan);
        }
        return selected;
      }
    } catch (error) {
      console.error("Errore:", error);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stripeStatus = params.get('stripe');

    if (stripeStatus !== 'success' && stripeStatus !== 'cancel') return;

    setStripeReturnStatus(stripeStatus);
    window.history.replaceState({}, '', window.location.pathname);

    if (stripeStatus === 'success') {
      toast({
        title: 'Pagamento completato',
        description: 'Stiamo aggiornando il tuo abbonamento. Se non vedi subito la modifica, attendi qualche secondo e riprova.',
        type: 'success',
      });

      queryClient.invalidateQueries({ queryKey: ['restaurants'] });

      const isSubscriptionReady = (r) => {
        if (!r) return false;
        if (r.abbonamento_attivo !== true) return false;
        if (!r.abbonamento_scadenza) return true;
        const expiry = new Date(r.abbonamento_scadenza);
        expiry.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return expiry >= today;
      };

      // Poll intelligente: si ferma appena il webhook ha aggiornato il DB
      let attempts = 0;
      let running = false;
      const intervalId = window.setInterval(async () => {
        if (running) return;
        running = true;
        attempts += 1;
        const updatedRestaurant = await loadRestaurant();
        queryClient.invalidateQueries({ queryKey: ['restaurants'] });
        if (isSubscriptionReady(updatedRestaurant)) {
          window.clearInterval(intervalId);
          toast({
            title: 'Abbonamento aggiornato',
            description: 'Il tuo abbonamento risulta ora attivo.',
            type: 'success',
          });
        } else if (attempts >= 5) {
          window.clearInterval(intervalId);
        }
        running = false;
      }, 3000);
      return () => window.clearInterval(intervalId);
    }

    toast({
      title: 'Pagamento annullato',
      description: 'Il pagamento con carta è stato annullato. Puoi riprovare quando vuoi.',
      type: 'error',
    });
  }, [queryClient, toast]);

  return (
    <div className="p-4 md:p-8 bg-background text-foreground min-h-screen">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Rinnova il tuo <span className="gradient-text">Abbonamento</span></h1>
          <p className="text-muted-foreground mt-1">Scegli il piano più adatto alle tue esigenze</p>
          {restaurant && (
            <Badge className="mt-2 bg-yellow-500">
              Scadenza: {restaurant.abbonamento_scadenza
                ? format(new Date(restaurant.abbonamento_scadenza), 'dd/MM/yyyy', { locale: it })
                : 'Non impostata'}
            </Badge>
          )}
        </div>

        {isRestaurantBlocked && (
          <div className="mb-6 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-4 text-sm text-red-900 dark:text-red-100">
            Il tuo ristorante <strong>non può ricevere ordini</strong> perché l’abbonamento non risulta attivo o è scaduto.
            <div className="mt-2">Rinnova per riattivare la ricezione degli ordini.</div>
          </div>
        )}

        {stripeReturnStatus === 'success' && (
          <div className="mb-6 rounded-lg border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/30 p-4 text-sm text-green-900 dark:text-green-100 flex items-start justify-between gap-4">
            <div>
              <div className="font-semibold">Pagamento completato</div>
              <div className="mt-1">Stiamo aggiornando il tuo abbonamento. Se non vedi subito la modifica, attendi qualche secondo e riprova.</div>
            </div>
            <Button type="button" variant="outline" onClick={() => loadRestaurant()}>
              Aggiorna
            </Button>
          </div>
        )}

        {stripeReturnStatus === 'cancel' && (
          <div className="mb-6 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-4 text-sm text-red-900 dark:text-red-100 flex items-start justify-between gap-4">
            <div>
              <div className="font-semibold">Pagamento annullato</div>
              <div className="mt-1">Non è stato effettuato nessun addebito. Puoi riprovare quando vuoi.</div>
            </div>
            <Button type="button" variant="outline" onClick={() => setStripeReturnStatus(null)}>
              Chiudi
            </Button>
          </div>
        )}

        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-lg border border-border bg-background p-1">
            <button
              className={`px-6 py-2 rounded-md transition-all ${
                billingPeriod === "mensile"
                  ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md shadow-orange-500/20"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setBillingPeriod("mensile")}
            >
              Mensile
            </button>
            <button
              className={`px-6 py-2 rounded-md transition-all ${
                billingPeriod === "annuale"
                  ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md shadow-orange-500/20"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setBillingPeriod("annuale")}
            >
              Annuale
              <Badge variant="outline" className="ml-2">Risparmia fino al 20%</Badge>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {isLoadingPlans && plans.length === 0 && (
            <Card className="md:col-span-3">
              <CardContent className="p-6">
                <div className="text-sm text-muted-foreground">Caricamento piani...</div>
              </CardContent>
            </Card>
          )}

          {!isLoadingPlans && (plansError || plans.length === 0) && (
            <Card className="md:col-span-3">
              <CardContent className="p-6">
                <div className="text-sm text-muted-foreground">
                  {plansError
                    ? 'Impossibile caricare i piani in questo momento. Riprova tra poco oppure contatta l’assistenza.'
                    : 'Nessun piano attivo disponibile. Contatta l’assistenza per attivare i piani.'}
                </div>
              </CardContent>
            </Card>
          )}

          {plans.map((plan) => {
            const price = billingPeriod === "mensile" ? plan.prezzo_mensile : plan.prezzo_annuale;
            const isSelected = selectedPlan?.id === plan.id;

            return (
              <Card
                key={plan.id}
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  isSelected ? 'border-4 border-orange-500' : ''
                }`}
                onClick={() => setSelectedPlan(plan)}
              >
                <CardContent className="p-6">
                  <div className="text-center mb-4">
                    <h3 className="text-2xl font-bold mb-2">{plan.nome}</h3>
                    <div className="text-4xl font-bold text-orange-600 mb-1">€{price}</div>
                    <div className="text-sm text-muted-foreground">/{billingPeriod === "mensile" ? "mese" : "anno"}</div>
                    {billingPeriod === "annuale" && plan.prezzo_annuale > 0 && (
                      <Badge variant="outline" className="mt-2">
                        Risparmi €{(plan.prezzo_mensile * 12 - plan.prezzo_annuale).toFixed(2)}
                      </Badge>
                    )}
                  </div>

                  <p className="text-muted-foreground text-sm text-center mb-4">{plan.descrizione}</p>

                  <div className="space-y-2 text-sm">
                    {plan.max_ordini_mese > 0 && (
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-600" />
                        <span>{plan.max_ordini_mese} ordini al mese</span>
                      </div>
                    )}
                    {plan.max_prodotti > 0 && (
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-600" />
                        <span>Fino a {plan.max_prodotti} prodotti</span>
                      </div>
                    )}
                    {plan.commissione_percentuale > 0 && (
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-600" />
                        <span>{plan.commissione_percentuale}% di commissione</span>
                      </div>
                    )}
                    {plan.features?.map((feature, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-600" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  {isSelected && (
                    <div className="mt-4 text-center">
                      <Badge className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">Piano Selezionato</Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {selectedPlan && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Completa il Pagamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Metodo di Pagamento</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethodOptions.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Codice sconto</Label>
                <div className="flex gap-2">
                  <Input
                    value={discountCode}
                    onChange={(e) => {
                      const next = e.target.value;
                      setDiscountCode(next);
                      if (!normalizeDiscountCode(next)) {
                        setAppliedDiscount(null);
                      }
                    }}
                    placeholder="Inserisci un codice (es. SCONTO2026)"
                    autoComplete="off"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!selectedPlan || applyDiscountMutation.isPending || !normalizeDiscountCode(discountCode) || !Number.isFinite(selectedPrice)}
                    onClick={() =>
                      applyDiscountMutation.mutate({
                        code: discountCode,
                        planName: selectedPlan?.nome,
                        basePrice: Number(selectedPrice),
                      })
                    }
                  >
                    {applyDiscountMutation.isPending ? 'Verifica...' : 'Applica'}
                  </Button>
                </div>

                {appliedDiscount?.code && (
                  <div className="text-sm text-muted-foreground">
                    Codice applicato: <strong>{appliedDiscount.code}</strong>
                  </div>
                )}
              </div>

              {paymentMethod === "bonifico" && paymentInfo.iban && (
                <div className="bg-blue-50 border border-blue-200 dark:bg-blue-950/30 dark:border-blue-900 rounded-lg p-4 space-y-2">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100">Dati per il Bonifico</h4>
                  <div className="text-sm space-y-1">
                    <p><strong>IBAN:</strong> {paymentInfo.iban}</p>
                    <p><strong>Intestatario:</strong> {paymentInfo.intestatario}</p>
                    <p><strong>Banca:</strong> {paymentInfo.banca}</p>
                    <p><strong>Causale:</strong> Rinnovo Abbonamento {restaurant?.nome}</p>
                    <p className="text-orange-600 font-semibold mt-2">Importo: €{Number.isFinite(finalPrice) ? finalPrice.toFixed(2) : '0.00'}</p>
                  </div>
                </div>
              )}

              {paymentMethod === "paypal" && paymentInfo.paypal_email && !paypalClientId && (
                <div className="bg-blue-50 border border-blue-200 dark:bg-blue-950/30 dark:border-blue-900 rounded-lg p-4">
                  <p className="text-sm"><strong>Email PayPal:</strong> {paymentInfo.paypal_email}</p>
                  <p className="text-sm mt-2 text-orange-600 font-semibold">Importo: €{Number.isFinite(finalPrice) ? finalPrice.toFixed(2) : '0.00'}</p>
                </div>
              )}

              {paymentMethod === "paypal" && paypalClientId && (
                <div className="bg-muted rounded-lg p-4 space-y-3">
                  <div className="text-sm">
                    Paga con PayPal in modo sicuro. Il tuo abbonamento verrà attivato automaticamente a pagamento completato.
                  </div>
                  {paypalSdkStatus === 'error' && (
                    <div className="text-sm text-red-600">
                      Impossibile caricare PayPal. Controlla la configurazione del Client ID.
                    </div>
                  )}
                  <div id="paypal-button-container" />
                </div>
              )}

              {paymentMethod === "carta" && (
                <div className="bg-blue-50 border border-blue-200 dark:bg-blue-950/30 dark:border-blue-900 rounded-lg p-4 text-sm">
                  Pagamento con carta tramite Stripe. Verrai reindirizzato a Stripe per completare il pagamento in sicurezza.
                </div>
              )}

              <div className="bg-muted rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">Riepilogo</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Piano: {selectedPlan.nome}</span>
                    <span>{billingPeriod === "mensile" ? "Mensile" : "Annuale"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Validità:</span>
                    <span>{billingPeriod === "mensile" ? "1 mese" : "12 mesi"}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 text-lg font-bold">
                    <span>Totale:</span>
                    <span className="text-orange-600">€{Number.isFinite(finalPrice) ? finalPrice.toFixed(2) : '0.00'}</span>
                  </div>
                </div>
              </div>

              {paymentMethod === 'paypal' && paypalClientId && Number.isFinite(finalPrice) && finalPrice <= 0 ? (
                <Button
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/20"
                  size="lg"
                  onClick={() => paypalCaptureMutation.mutate({ orderId: null })}
                  disabled={paypalCaptureMutation.isPending}
                >
                  <Calendar className="w-5 h-5 mr-2" />
                  {paypalCaptureMutation.isPending ? 'Attivazione in corso...' : 'Attiva abbonamento'}
                </Button>
              ) : paymentMethod === 'paypal' && paypalClientId ? null : (
                <Button
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/20"
                  size="lg"
                  onClick={handleRenew}
                  disabled={renewMutation.isPending || stripeCheckoutMutation.isPending}
                >
                  <Calendar className="w-5 h-5 mr-2" />
                  {stripeCheckoutMutation.isPending
                    ? "Reindirizzamento a Stripe..."
                    : renewMutation.isPending
                      ? "Invio in corso..."
                      : paymentMethod === 'carta'
                        ? "Paga con carta"
                        : "Conferma Rinnovo"}
                </Button>
              )}

              <p className="text-xs text-muted-foreground text-center">
                {paymentMethod === 'carta'
                  ? "Dopo il pagamento verrai riportato nell’app. L’abbonamento verrà attivato automaticamente."
                  : paymentMethod === 'paypal' && paypalClientId
                    ? "Dopo il pagamento l’abbonamento verrà attivato automaticamente."
                    : "Dopo la conferma riceverai un'email con i dettagli del pagamento. Il tuo abbonamento sarà attivo non appena riceveremo il pagamento."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}