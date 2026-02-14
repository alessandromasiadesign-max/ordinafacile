import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
  const queryClient = useQueryClient();

  const { data: plans = [] } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: () => base44.entities.SubscriptionPlan.filter({ attivo: true }, "ordine"),
    initialData: [],
  });

  const { data: platformSettings = [] } = useQuery({
    queryKey: ['platform-settings'],
    queryFn: () => base44.entities.PlatformSettings.list(),
    initialData: [],
  });

  useEffect(() => {
    loadRestaurant();
  }, []);

  const loadRestaurant = async () => {
    try {
      const user = await base44.auth.me();
      const restaurants = await base44.entities.Restaurant.filter({
        user_id: user.id
      });
      if (restaurants.length > 0) {
        setRestaurant(restaurants[0]);
        // Pre-seleziona il piano corrente se esiste
        const currentPlan = plans.find(p => p.nome === restaurants[0].abbonamento_tipo);
        if (currentPlan) {
          setSelectedPlan(currentPlan);
        }
      }
    } catch (error) {
      console.error("Errore:", error);
    }
  };

  const renewMutation = useMutation({
    mutationFn: async (data) => {
      const transaction = await base44.entities.SubscriptionTransaction.create(data);
      
      // Aggiorna il ristorante con la nuova scadenza
      const newExpiry = billingPeriod === "mensile" 
        ? addMonths(new Date(), 1)
        : addYears(new Date(), 1);
      
      await base44.entities.Restaurant.update(restaurant.id, {
        abbonamento_tipo: selectedPlan.nome,
        abbonamento_scadenza: format(newExpiry, 'yyyy-MM-dd'),
        abbonamento_attivo: true
      });

      // Invia email di conferma
      const paymentInfo = platformSettings[0]?.payment_info || {};
      await base44.integrations.Core.SendEmail({
        to: (await base44.auth.me()).email,
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
          <br>
          <p>Il tuo abbonamento sarà attivo non appena riceveremo il pagamento.</p>
        `
      });

      return transaction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurants'] });
      alert("✅ Richiesta di rinnovo inviata! Riceverai una conferma via email.");
      window.location.reload();
    },
  });

  const handleRenew = () => {
    if (!selectedPlan) {
      alert("Seleziona un piano");
      return;
    }

    const importo = billingPeriod === "mensile" 
      ? selectedPlan.prezzo_mensile
      : selectedPlan.prezzo_annuale;

    const dataInizio = new Date();
    const dataScadenza = billingPeriod === "mensile"
      ? addMonths(dataInizio, 1)
      : addYears(dataInizio, 1);

    renewMutation.mutate({
      restaurant_id: restaurant.id,
      piano: selectedPlan.nome,
      tipo: billingPeriod,
      importo: importo,
      metodo_pagamento: paymentMethod,
      stato: "pending",
      data_inizio: format(dataInizio, 'yyyy-MM-dd'),
      data_scadenza: format(dataScadenza, 'yyyy-MM-dd'),
      rinnovo_automatico: false
    });
  };

  const paymentInfo = platformSettings[0]?.payment_info || {};
  const selectedPrice = selectedPlan && (billingPeriod === "mensile" 
    ? selectedPlan.prezzo_mensile 
    : selectedPlan.prezzo_annuale);

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Rinnova il tuo Abbonamento</h1>
          <p className="text-gray-500 mt-1">Scegli il piano più adatto alle tue esigenze</p>
          {restaurant && (
            <Badge className="mt-2 bg-yellow-500">
              Scadenza: {restaurant.abbonamento_scadenza 
                ? format(new Date(restaurant.abbonamento_scadenza), 'dd/MM/yyyy', { locale: it })
                : 'Non impostata'}
            </Badge>
          )}
        </div>

        {/* Selettore Periodo */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
            <button
              className={`px-6 py-2 rounded-md transition-all ${
                billingPeriod === "mensile" 
                  ? "bg-red-600 text-white" 
                  : "text-gray-600 hover:text-gray-900"
              }`}
              onClick={() => setBillingPeriod("mensile")}
            >
              Mensile
            </button>
            <button
              className={`px-6 py-2 rounded-md transition-all ${
                billingPeriod === "annuale" 
                  ? "bg-red-600 text-white" 
                  : "text-gray-600 hover:text-gray-900"
              }`}
              onClick={() => setBillingPeriod("annuale")}
            >
              Annuale
              <Badge variant="outline" className="ml-2">Risparmia fino al 20%</Badge>
            </button>
          </div>
        </div>

        {/* Piani */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {plans.map(plan => {
            const price = billingPeriod === "mensile" ? plan.prezzo_mensile : plan.prezzo_annuale;
            const isSelected = selectedPlan?.id === plan.id;
            
            return (
              <Card 
                key={plan.id}
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  isSelected ? 'border-4 border-red-600' : ''
                }`}
                onClick={() => setSelectedPlan(plan)}
              >
                <CardContent className="p-6">
                  <div className="text-center mb-4">
                    <h3 className="text-2xl font-bold mb-2">{plan.nome}</h3>
                    <div className="text-4xl font-bold text-red-600 mb-1">
                      €{price}
                    </div>
                    <div className="text-sm text-gray-500">
                      /{billingPeriod === "mensile" ? "mese" : "anno"}
                    </div>
                    {billingPeriod === "annuale" && plan.prezzo_annuale > 0 && (
                      <Badge variant="outline" className="mt-2">
                        Risparmi €{(plan.prezzo_mensile * 12 - plan.prezzo_annuale).toFixed(2)}
                      </Badge>
                    )}
                  </div>

                  <p className="text-gray-600 text-sm text-center mb-4">
                    {plan.descrizione}
                  </p>

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
                      <Badge className="bg-red-600">Piano Selezionato</Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Pagamento */}
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
                    <SelectItem value="bonifico">Bonifico Bancario</SelectItem>
                    <SelectItem value="paypal">PayPal</SelectItem>
                    <SelectItem value="carta">Carta di Credito</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {paymentMethod === "bonifico" && paymentInfo.iban && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                  <h4 className="font-semibold text-blue-900">Dati per il Bonifico</h4>
                  <div className="text-sm space-y-1">
                    <p><strong>IBAN:</strong> {paymentInfo.iban}</p>
                    <p><strong>Intestatario:</strong> {paymentInfo.intestatario}</p>
                    <p><strong>Banca:</strong> {paymentInfo.banca}</p>
                    <p><strong>Causale:</strong> Rinnovo Abbonamento {restaurant?.nome}</p>
                    <p className="text-red-600 font-semibold mt-2">
                      Importo: €{selectedPrice?.toFixed(2)}
                    </p>
                  </div>
                </div>
              )}

              {paymentMethod === "paypal" && paymentInfo.paypal_email && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm">
                    <strong>Email PayPal:</strong> {paymentInfo.paypal_email}
                  </p>
                  <p className="text-sm mt-2 text-red-600 font-semibold">
                    Importo: €{selectedPrice?.toFixed(2)}
                  </p>
                </div>
              )}

              <div className="bg-gray-50 rounded-lg p-4">
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
                    <span className="text-red-600">€{selectedPrice?.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <Button
                className="w-full bg-red-600 hover:bg-red-700"
                size="lg"
                onClick={handleRenew}
                disabled={renewMutation.isPending}
              >
                <Calendar className="w-5 h-5 mr-2" />
                {renewMutation.isPending ? "Invio in corso..." : "Conferma Rinnovo"}
              </Button>

              <p className="text-xs text-gray-500 text-center">
                Dopo la conferma riceverai un'email con i dettagli del pagamento. 
                Il tuo abbonamento sarà attivo non appena riceveremo il pagamento.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}