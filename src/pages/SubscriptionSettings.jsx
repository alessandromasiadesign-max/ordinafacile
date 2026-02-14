import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Save, CreditCard } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function SubscriptionSettings() {
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [platformSettings, setPlatformSettings] = useState({
    payment_info: {
      iban: "",
      intestatario: "",
      banca: "",
      paypal_email: "",
      stripe_account_id: ""
    },
    notification_settings: {
      admin_email: "",
      giorni_preavviso_scadenza: 15,
      email_template_scadenza: ""
    }
  });
  
  const queryClient = useQueryClient();

  const { data: plans = [] } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: () => base44.entities.SubscriptionPlan.list("ordine"),
    initialData: [],
  });

  const { data: settings = [] } = useQuery({
    queryKey: ['platform-settings'],
    queryFn: () => base44.entities.PlatformSettings.list(),
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
        return base44.entities.PlatformSettings.update(settings[0].id, data);
      } else {
        return base44.entities.PlatformSettings.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
      alert("✅ Impostazioni salvate!");
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: (id) => base44.entities.SubscriptionPlan.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
    },
  });

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Gestione Abbonamenti</h1>
          <p className="text-gray-500 mt-1">Configura piani e impostazioni di pagamento</p>
        </div>

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
              className="bg-red-600 hover:bg-red-700"
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
                className="bg-red-600 hover:bg-red-700"
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
                        <Badge className={plan.attivo ? "bg-green-500" : "bg-gray-500"}>
                          {plan.attivo ? "Attivo" : "Disattivato"}
                        </Badge>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setEditingPlan(plan)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            if (confirm("Eliminare questo piano?")) {
                              deletePlanMutation.mutate(plan.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>

                    <p className="text-gray-600 text-sm mb-4">{plan.descrizione}</p>

                    <div className="space-y-2 mb-4">
                      <div className="text-3xl font-bold text-red-600">
                        €{plan.prezzo_mensile}
                        <span className="text-sm text-gray-500">/mese</span>
                      </div>
                      {plan.prezzo_annuale > 0 && (
                        <div className="text-lg text-gray-600">
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
      </div>
    </div>
  );
}

function PlanDialog({ open, onClose, plan }) {
  const [formData, setFormData] = useState({
    nome: "",
    descrizione: "",
    prezzo_mensile: 0,
    prezzo_annuale: 0,
    features: [],
    max_ordini_mese: 0,
    max_prodotti: 0,
    commissione_percentuale: 0,
    attivo: true,
    ordine: 0
  });
  const [newFeature, setNewFeature] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    if (plan) {
      setFormData(plan);
    }
  }, [plan]);

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (plan) {
        return base44.entities.SubscriptionPlan.update(plan.id, data);
      }
      return base44.entities.SubscriptionPlan.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
      onClose();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
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
                  value={formData.ordine}
                  onChange={(e) => setFormData(prev => ({ ...prev, ordine: parseInt(e.target.value) }))}
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
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                />
                <Button type="button" onClick={addFeature}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-1 mt-2">
                {formData.features?.map((feature, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <span>{feature}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setFormData(prev => ({
                        ...prev,
                        features: prev.features.filter((_, index) => index !== i)
                      }))}
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
            <Button type="submit" className="bg-red-600 hover:bg-red-700">
              Salva Piano
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}