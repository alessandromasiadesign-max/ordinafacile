import { SubscriptionPlan, PlatformSettings, Restaurant, SubscriptionTransaction } from '@/api/entities';
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Save, CreditCard } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function SubscriptionSettings() {
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [planToDelete, setPlanToDelete] = useState(null);

  const [platformSettings, setPlatformSettings] = useState({
    payment_info: {
      iban: "",
      intestatario: "",
      banca: "",
      paypal_email: "",
      paypal_client_id: "",
      stripe_account_id: "",
      stripe_prices: {}
    },
    notification_settings: {
      admin_email: "",
      giorni_preavviso_scadenza: 15,
      email_template_scadenza: ""
    }
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: plans = [] } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: () => SubscriptionPlan.list("ordine"),
    initialData: [],
  });

  const { data: settings = [] } = useQuery({
    queryKey: ['platform-settings'],
    queryFn: () => PlatformSettings.list(),
    initialData: [],
  });

  const { data: restaurants = [] } = useQuery({
    queryKey: ['admin-restaurants'],
    queryFn: () => Restaurant.list('-created_at', 500),
    initialData: [],
  });

  const { data: pendingTransactions = [] } = useQuery({
    queryKey: ['subscription-transactions-pending'],
    queryFn: () => SubscriptionTransaction.filter({ stato: 'pending' }, '-created_at', 200),
    initialData: [],
  });

  useEffect(() => {
    if (settings.length > 0) {
      setPlatformSettings(settings[0]);
    }
  }, [settings]);

  const saveSettingsMutation = useMutation({
    mutationFn: async (data) => {
      if (settings.length > 0) {
        return PlatformSettings.update(settings[0].id, data);
      } else {
        return PlatformSettings.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
      toast({
        title: 'Impostazioni salvate',
        type: 'success',
      });
    },
    onError: (error) => {
      console.error('Errore salvataggio impostazioni:', error);
      toast({
        title: 'Errore salvataggio impostazioni',
        description: error?.message || 'Impossibile salvare le impostazioni',
        type: 'error',
      });
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: (id) => SubscriptionPlan.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
    },
  });

  const approveTransactionMutation = useMutation({
    mutationFn: async (tx) => {
      if (!tx?.id) throw new Error('Transazione non valida');
      if (!tx?.restaurant_id) throw new Error('Ristorante non valido');

      await SubscriptionTransaction.update(tx.id, {
        stato: 'paid',
      });

      await Restaurant.update(tx.restaurant_id, {
        abbonamento_tipo: tx.piano,
        abbonamento_scadenza: tx.data_scadenza,
        abbonamento_attivo: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-transactions-pending'] });
      queryClient.invalidateQueries({ queryKey: ['restaurants'] });
      toast({
        title: 'Transazione approvata',
        description: 'Abbonamento attivato.',
        type: 'success',
      });
    },
    onError: (error) => {
      console.error('Errore approvazione transazione:', error);
      toast({
        title: 'Errore approvazione',
        description: error?.message || 'Errore durante l’approvazione',
        type: 'error',
      });
    },
  });

  const rejectTransactionMutation = useMutation({
    mutationFn: async (tx) => {
      if (!tx?.id) throw new Error('Transazione non valida');
      await SubscriptionTransaction.update(tx.id, {
        stato: 'rejected',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-transactions-pending'] });
      toast({
        title: 'Transazione rifiutata',
        type: 'success',
      });
    },
    onError: (error) => {
      console.error('Errore rifiuto transazione:', error);
      toast({
        title: 'Errore rifiuto',
        description: error?.message || 'Errore durante il rifiuto',
        type: 'error',
      });
    },
  });

  const restaurantsById = new Map((restaurants || []).map((r) => [r.id, r]));
  const stripePrices = (
    platformSettings?.payment_info?.stripe_prices && typeof platformSettings.payment_info.stripe_prices === 'object'
      ? platformSettings.payment_info.stripe_prices
      : {}
  );

  const paymentInfo = platformSettings.payment_info;

  return (
    <div className="p-4 md:p-8 bg-background min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Gestione <span className="gradient-text">Abbonamenti</span></h1>
          <p className="text-muted-foreground mt-1">Configura piani e impostazioni di pagamento</p>
        </div>

        {/* Richieste in Attesa */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Richieste di rinnovo in attesa</CardTitle>
          </CardHeader>
          <CardContent>
            {pendingTransactions.length === 0 ? (
              <div className="text-sm text-muted-foreground">Nessuna richiesta in attesa.</div>
            ) : (
              <div className="space-y-3">
                {pendingTransactions.map((tx) => {
                  const rest = restaurantsById.get(tx.restaurant_id);
                  const restLabel = rest?.nome ?? rest?.name ?? tx.restaurant_id;
                  const approveBusy = approveTransactionMutation.isPending;
                  const rejectBusy = rejectTransactionMutation.isPending;

                  return (
                    <div key={tx.id} className="rounded-lg border border-border p-4">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold truncate">{restLabel}</div>
                          <div className="text-sm text-muted-foreground">
                            Piano: <strong>{tx.piano}</strong> • Periodo: <strong>{tx.tipo}</strong> • Metodo: <strong>{tx.metodo_pagamento}</strong> • Importo: <strong>€{Number(tx.importo || 0).toFixed(2)}</strong>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Validità: {tx.data_inizio} → {tx.data_scadenza}
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button
                            type="button"
                            className="bg-green-600 hover:bg-green-700"
                            disabled={approveBusy || rejectBusy}
                            onClick={() => approveTransactionMutation.mutate(tx)}
                          >
                            Approva
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            disabled={approveBusy || rejectBusy}
                            onClick={() => rejectTransactionMutation.mutate(tx)}
                          >
                            Rifiuta
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Impostazioni Pagamento */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Dati per Ricevere Pagamenti
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>IBAN</Label>
                <Input
                  value={platformSettings.payment_info?.iban || ""}
                  onChange={(e) => setPlatformSettings(prev => ({
                    ...prev,
                    payment_info: { ...prev.payment_info, iban: e.target.value }
                  }))}
                  placeholder="IT00X0000000000000000000000"
                />
              </div>
              <div className="space-y-2">
                <Label>Intestatario</Label>
                <Input
                  value={platformSettings.payment_info?.intestatario || ""}
                  onChange={(e) => setPlatformSettings(prev => ({
                    ...prev,
                    payment_info: { ...prev.payment_info, intestatario: e.target.value }
                  }))}
                  placeholder="Nome Azienda"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Banca</Label>
                <Input
                  value={platformSettings.payment_info?.banca || ""}
                  onChange={(e) => setPlatformSettings(prev => ({
                    ...prev,
                    payment_info: { ...prev.payment_info, banca: e.target.value }
                  }))}
                  placeholder="Nome Banca"
                />
              </div>
              <div className="space-y-2">
                <Label>Email PayPal</Label>
                <Input
                  type="email"
                  value={platformSettings.payment_info?.paypal_email || ""}
                  onChange={(e) => setPlatformSettings(prev => ({
                    ...prev,
                    payment_info: { ...prev.payment_info, paypal_email: e.target.value }
                  }))}
                  placeholder="pagamenti@tuaemail.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>PayPal Client ID (checkout automatico)</Label>
              <Input
                value={platformSettings.payment_info?.paypal_client_id || ""}
                onChange={(e) => setPlatformSettings(prev => ({
                  ...prev,
                  payment_info: { ...prev.payment_info, paypal_client_id: e.target.value }
                }))}
                placeholder="AQ..."
              />
            </div>

            <div className="space-y-2">
              <Label>Stripe Account ID (opzionale)</Label>
              <Input
                value={platformSettings.payment_info?.stripe_account_id || ""}
                onChange={(e) => setPlatformSettings(prev => ({
                  ...prev,
                  payment_info: { ...prev.payment_info, stripe_account_id: e.target.value }
                }))}
                placeholder="acct_xxxxxxxxxxxx"
              />
            </div>

            <div className="pt-4">
              <h4 className="font-semibold mb-3">Stripe Price IDs (per piano)</h4>
              {!paymentInfo.stripe_account_id ? (
                <div className="text-sm text-muted-foreground">
                  Configura prima lo <strong>Stripe Account ID</strong> per abilitare il pagamento con carta. I Price ID servono solo a Stripe.
                </div>
              ) : (
                <div className="space-y-3">
                  {plans.map((plan) => {
                    const planPrices = stripePrices?.[plan.id] && typeof stripePrices[plan.id] === 'object' ? stripePrices[plan.id] : {};
                    const monthly = planPrices?.mensile ?? '';
                    const yearly = planPrices?.annuale ?? '';

                    return (
                      <div key={plan.id} className="rounded-lg border border-border p-4">
                        <div className="font-semibold">{plan.nome}</div>
                        <div className="grid md:grid-cols-2 gap-3 mt-3">
                          <div className="space-y-2">
                            <Label>Price ID Mensile</Label>
                            <Input
                              value={monthly}
                              onChange={(e) => {
                                const next = e.target.value;
                                setPlatformSettings((prev) => ({
                                  ...prev,
                                  payment_info: {
                                    ...prev.payment_info,
                                    stripe_prices: {
                                      ...(stripePrices || {}),
                                      [plan.id]: {
                                        ...(planPrices || {}),
                                        mensile: next,
                                      },
                                    },
                                  },
                                }));
                              }}
                              placeholder="price_..."
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Price ID Annuale</Label>
                            <Input
                              value={yearly}
                              onChange={(e) => {
                                const next = e.target.value;
                                setPlatformSettings((prev) => ({
                                  ...prev,
                                  payment_info: {
                                    ...prev.payment_info,
                                    stripe_prices: {
                                      ...(stripePrices || {}),
                                      [plan.id]: {
                                        ...(planPrices || {}),
                                        annuale: next,
                                      },
                                    },
                                  },
                                }));
                              }}
                              placeholder="price_..."
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-4">
              <h4 className="font-semibold mb-3">Impostazioni Notifiche</h4>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email Admin per Notifiche</Label>
                  <Input
                    type="email"
                    value={platformSettings.notification_settings?.admin_email || ""}
                    onChange={(e) => setPlatformSettings(prev => ({
                      ...prev,
                      notification_settings: { ...prev.notification_settings, admin_email: e.target.value }
                    }))}
                    placeholder="admin@tuodominio.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Giorni Preavviso Scadenza</Label>
                  <Input
                    type="number"
                    value={platformSettings.notification_settings?.giorni_preavviso_scadenza || 15}
                    onChange={(e) => setPlatformSettings(prev => ({
                      ...prev,
                      notification_settings: { ...prev.notification_settings, giorni_preavviso_scadenza: parseInt(e.target.value) }
                    }))}
                  />
                </div>
              </div>
            </div>

            <Button
              onClick={() => saveSettingsMutation.mutate(platformSettings)}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/20"
            >
              <Save className="w-4 h-4 mr-2" />
              Salva Impostazioni Pagamento
            </Button>
          </CardContent>
        </Card>

        {/* Piani Abbonamento */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Piani Abbonamento</CardTitle>
              <Button
                onClick={() => setShowAddPlan(true)}
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/20"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nuovo Piano
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {plans.map(plan => (
                <Card key={plan.id} className="relative">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold">{plan.nome}</h3>
                        <Badge className={plan.attivo ? "bg-green-500" : "bg-muted text-muted-foreground"}>
                          {plan.attivo ? "Attivo" : "Disattivato"}
                        </Badge>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setEditingPlan(plan)}
                          aria-label="Modifica piano"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setPlanToDelete(plan)}
                          disabled={deletePlanMutation.isPending}
                          aria-label="Elimina piano"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>

                    <p className="text-muted-foreground text-sm mb-4">{plan.descrizione}</p>

                    <div className="space-y-2 mb-4">
                      <div className="text-3xl font-bold text-orange-600">
                        €{plan.prezzo_mensile}
                        <span className="text-sm text-muted-foreground">/mese</span>
                      </div>
                      {plan.prezzo_annuale > 0 && (
                        <div className="text-lg text-muted-foreground">
                          €{plan.prezzo_annuale}/anno
                          <Badge variant="outline" className="ml-2">
                            Risparmia {Math.round((1 - plan.prezzo_annuale / (plan.prezzo_mensile * 12)) * 100)}%
                          </Badge>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 text-sm">
                      {plan.max_ordini_mese > 0 && (
                        <div>📦 Max {plan.max_ordini_mese} ordini/mese</div>
                      )}
                      {plan.max_prodotti > 0 && (
                        <div>🍕 Max {plan.max_prodotti} prodotti</div>
                      )}
                      {plan.commissione_percentuale > 0 && (
                        <div>💳 {plan.commissione_percentuale}% commissione</div>
                      )}
                      {plan.features?.map((feature, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-green-600">✓</span>
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        <PlanDialog
          open={showAddPlan || !!editingPlan}
          onClose={() => {
            setShowAddPlan(false);
            setEditingPlan(null);
          }}
          plan={editingPlan}
        />

        <AlertDialog open={!!planToDelete} onOpenChange={(open) => !open && setPlanToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminare piano?</AlertDialogTitle>
              <AlertDialogDescription>
                Vuoi eliminare il piano "{planToDelete?.nome ?? ''}"? L'operazione è definitiva.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deletePlanMutation.isPending}>Annulla</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                disabled={deletePlanMutation.isPending}
                onClick={() => {
                  const id = planToDelete?.id;
                  setPlanToDelete(null);
                  if (!id) return;
                  deletePlanMutation.mutate(id);
                }}
              >
                Elimina
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

const DEFAULT_PLAN_FORM_DATA = {
  nome: "",
  descrizione: "",
  prezzo_mensile: 0,
  prezzo_annuale: 0,
  features: [],
  max_ordini_mese: 0,
  max_prodotti: 0,
  commissione_percentuale: 0,
  attivo: true,
  sort_order: 0,
};

function PlanDialog({ open, onClose, plan }) {
  const [formData, setFormData] = useState(DEFAULT_PLAN_FORM_DATA);
  const [newFeature, setNewFeature] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;

    if (plan) {
      setFormData({
        ...DEFAULT_PLAN_FORM_DATA,
        ...plan,
        features: Array.isArray(plan.features) ? plan.features : [],
      });
      setNewFeature("");
      return;
    }

    setFormData(DEFAULT_PLAN_FORM_DATA);
    setNewFeature("");
  }, [open, plan]);

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (plan) {
        return SubscriptionPlan.update(plan.id, data);
      }
      return SubscriptionPlan.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
      toast({
        title: plan ? 'Piano aggiornato' : 'Piano creato',
        type: 'success',
      });
      onClose();
    },
    onError: (error) => {
      console.error('Errore salvataggio piano:', error);
      toast({
        title: 'Errore salvataggio piano',
        description: error?.message || 'Errore durante il salvataggio del piano',
        type: 'error',
      });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    const safeNumber = (value, fallback = 0) => {
      const n = Number(value);
      return Number.isFinite(n) ? n : fallback;
    };

    const safeInt = (value, fallback = 0) => {
      const n = parseInt(String(value), 10);
      return Number.isFinite(n) ? n : fallback;
    };

    const normalized = {
      ...formData,
      prezzo_mensile: safeNumber(formData.prezzo_mensile, 0),
      prezzo_annuale: safeNumber(formData.prezzo_annuale, 0),
      max_ordini_mese: safeInt(formData.max_ordini_mese, 0),
      max_prodotti: safeInt(formData.max_prodotti, 0),
      commissione_percentuale: safeNumber(formData.commissione_percentuale, 0),
      sort_order: safeInt(formData.sort_order, 0),
      attivo: !!formData.attivo,
      features: (Array.isArray(formData.features) ? formData.features : [])
        .map((f) => String(f).trim())
        .filter(Boolean),
    };

    const { id, created_at, updated_at, ...payload } = normalized;
    saveMutation.mutate(payload);
  };

  const addFeature = () => {
    if (!newFeature.trim()) return;
    setFormData(prev => ({
      ...prev,
      features: [...(prev.features || []), newFeature]
    }));
    setNewFeature("");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{plan ? "Modifica Piano" : "Nuovo Piano"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome Piano *</Label>
                <Input
                  value={formData.nome}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="Basic, Premium..."
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Ordine Visualizzazione</Label>
                <Input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrizione</Label>
              <Textarea
                value={formData.descrizione}
                onChange={(e) => setFormData(prev => ({ ...prev, descrizione: e.target.value }))}
                placeholder="Descrizione del piano..."
                rows={2}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prezzo Mensile (€) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.prezzo_mensile}
                  onChange={(e) => setFormData(prev => ({ ...prev, prezzo_mensile: parseFloat(e.target.value) }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Prezzo Annuale (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.prezzo_annuale}
                  onChange={(e) => setFormData(prev => ({ ...prev, prezzo_annuale: parseFloat(e.target.value) }))}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Max Ordini/Mese (0 = illimitato)</Label>
                <Input
                  type="number"
                  value={formData.max_ordini_mese}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_ordini_mese: parseInt(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Max Prodotti (0 = illimitato)</Label>
                <Input
                  type="number"
                  value={formData.max_prodotti}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_prodotti: parseInt(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Commissione %</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.commissione_percentuale}
                  onChange={(e) => setFormData(prev => ({ ...prev, commissione_percentuale: parseFloat(e.target.value) }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Funzionalità Incluse</Label>
              <div className="flex gap-2">
                <Input
                  value={newFeature}
                  onChange={(e) => setNewFeature(e.target.value)}
                  placeholder="es: Menu Illimitato"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addFeature();
                    }
                  }}
                />
                <Button type="button" onClick={addFeature}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-1 mt-2">
                {formData.features?.map((feature, i) => (
                  <div key={i} className="flex items-center justify-between bg-muted p-2 rounded">
                    <span>{feature}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setFormData(prev => ({
                        ...prev,
                        features: prev.features.filter((_, index) => index !== i)
                      }))}
                      aria-label="Rimuovi funzionalità"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annulla
            </Button>
            <Button type="submit" className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/20" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Salvataggio...' : 'Salva Piano'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}