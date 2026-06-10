import { Restaurant, Promotion } from '@/api/entities';
import React, { useState, useEffect } from "react";
import { supabase } from '@/api/supabaseClient';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Tag, Copy } from "lucide-react";

import AddPromotionDialog from "../components/promotions/AddPromotionDialog";
import EditPromotionDialog from "../components/promotions/EditPromotionDialog";
import StatusToggle from "../components/ui/status-toggle";
import { useToast } from "../components/ui/use-toast";

export default function Promotions() {
  const [restaurant, setRestaurant] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState(null);
  const [activeTab, setActiveTab] = useState('mine');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const normalizePromotion = (p) => ({
    ...p,
    nome: p?.nome ?? p?.name,
    descrizione: p?.descrizione ?? p?.description,
    tipo_sconto: p?.tipo_sconto ?? p?.discount_type,
    valore_sconto: p?.valore_sconto ?? p?.discount_value,
    codice: p?.codice ?? p?.code,
    regole: p?.regole ?? {
      ordine_minimo: Number(p?.min_order ?? 0) || 0,
      data_inizio: p?.valid_from ? String(p.valid_from).slice(0, 10) : "",
      data_fine: p?.valid_until ? String(p.valid_until).slice(0, 10) : "",
      giorni_settimana: [],
      orario_inizio: "",
      orario_fine: "",
      solo_primo_ordine: false,
      max_utilizzi_totali: 0,
      max_utilizzi_cliente: 1,
      cumulabile: false,
    },
    attivazione: p?.attivazione ?? ((p?.code ?? p?.codice) ? 'codice' : 'automatica'),
    attiva: p?.attiva ?? p?.is_active,
  });

  const { data: promotions = [], isLoading } = useQuery({
    queryKey: ['promotions', restaurant?.id],
    queryFn: async () => {
      if (!restaurant) return [];
      const rows = await Promotion.filter({ restaurant_id: restaurant.id }, '-created_at');
      return (rows || []).map(normalizePromotion);
    },
    enabled: !!restaurant,
    initialData: [],
  });

  useEffect(() => {
    loadRestaurant();
  }, []);

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
      }
    } catch (error) {
      console.error("Errore:", error);
    }
  };

  const createFromTemplateMutation = useMutation({
    mutationFn: (template) => Promotion.create({
      restaurant_id: restaurant.id,
      name: template?.name ?? template?.nome,
      description: template?.description ?? template?.descrizione ?? null,
      discount_type: (() => {
        const v = String(template?.discount_type ?? template?.tipo_sconto ?? '').trim();
        if (v === 'percentuale') return 'percentage';
        if (v === 'fisso') return 'fixed';
        return v || null;
      })(),
      discount_value: template?.discount_value ?? template?.valore_sconto ?? null,
      code: template?.code ?? template?.codice ?? null,
      min_order: Number(template?.min_order ?? template?.regole?.ordine_minimo ?? 0) || 0,
      is_active: false,
      valid_from: template?.valid_from ?? (template?.regole?.data_inizio ? new Date(template.regole.data_inizio).toISOString() : null),
      valid_until: template?.valid_until ?? (template?.regole?.data_fine ? new Date(template.regole.data_fine).toISOString() : null),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      toast({
        title: "Template applicato",
        description: "Promozione creata (disattivata). Modificala e attivala quando vuoi."
      });
      setActiveTab('mine'); 
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, attiva }) => Promotion.update(id, { is_active: attiva }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
    },
  });

  const promotionTemplates = [
    {
      nome: "Sconto Benvenuto 10%",
      descrizione: "Sconto del 10% sul primo ordine per nuovi clienti",
      tipo_sconto: "percentuale",
      valore_sconto: 10,
      codice: "BENVENUTO10",
      attivazione: "codice",
      regole: {
        ordine_minimo: 15,
        solo_primo_ordine: true,
        max_utilizzi_totali: 0,
        max_utilizzi_cliente: 1,
        cumulabile: false,
        data_inizio: "",
        data_fine: "",
        giorni_settimana: [],
        orario_inizio: "",
        orario_fine: ""
      }
    },
    {
      nome: "20% su Ordini oltre 30€",
      descrizione: "Risparmia il 20% su tutti gli ordini sopra 30€",
      tipo_sconto: "percentuale",
      valore_sconto: 20,
      codice: "PROMO20",
      attivazione: "codice",
      regole: {
        ordine_minimo: 30,
        solo_primo_ordine: false,
        max_utilizzi_totali: 100,
        max_utilizzi_cliente: 3,
        cumulabile: false,
        data_inizio: "",
        data_fine: "",
        giorni_settimana: [],
        orario_inizio: "",
        orario_fine: ""
      }
    },
    {
      nome: "Consegna Gratuita",
      descrizione: "Consegna gratuita per ordini superiori a 20€",
      tipo_sconto: "fisso",
      valore_sconto: 5,
      codice: "FREESHIP",
      attivazione: "codice",
      regole: {
        ordine_minimo: 20,
        solo_primo_ordine: false,
        max_utilizzi_totali: 0,
        max_utilizzi_cliente: 5,
        cumulabile: true,
        data_inizio: "",
        data_fine: "",
        giorni_settimana: [],
        orario_inizio: "",
        orario_fine: ""
      }
    },
    {
      nome: "Sconto Fisso 5€",
      descrizione: "Risparmia 5€ sul tuo ordine",
      tipo_sconto: "fisso",
      valore_sconto: 5,
      codice: "SAVE5",
      attivazione: "codice",
      regole: {
        ordine_minimo: 25,
        solo_primo_ordine: false,
        max_utilizzi_totali: 50,
        max_utilizzi_cliente: 2,
        cumulabile: false,
        data_inizio: "",
        data_fine: "",
        giorni_settimana: [],
        orario_inizio: "",
        orario_fine: ""
      }
    },
    {
      nome: "Happy Hour 15%",
      descrizione: "15% di sconto negli orari di punta (18:00-20:00)",
      tipo_sconto: "percentuale",
      valore_sconto: 15,
      codice: "HAPPY15",
      attivazione: "codice",
      regole: {
        ordine_minimo: 10,
        solo_primo_ordine: false,
        max_utilizzi_totali: 0,
        max_utilizzi_cliente: 0,
        cumulabile: false,
        data_inizio: "",
        data_fine: "",
        giorni_settimana: [],
        orario_inizio: "18:00",
        orario_fine: "20:00"
      }
    },
    {
      nome: "Weekend Special 20%",
      descrizione: "20% di sconto solo nel weekend",
      tipo_sconto: "percentuale",
      valore_sconto: 20,
      codice: "WEEKEND20",
      attivazione: "codice",
      regole: {
        ordine_minimo: 25,
        solo_primo_ordine: false,
        max_utilizzi_totali: 0,
        max_utilizzi_cliente: 3,
        cumulabile: false,
        data_inizio: "",
        data_fine: "",
        giorni_settimana: ["sabato", "domenica"],
        orario_inizio: "",
        orario_fine: ""
      }
    },
    {
      nome: "Pranzo Settimanale 10%",
      descrizione: "10% su ordini a pranzo dal lunedì al venerdì",
      tipo_sconto: "percentuale",
      valore_sconto: 10,
      codice: "PRANZO10",
      attivazione: "codice",
      regole: {
        ordine_minimo: 12,
        solo_primo_ordine: false,
        max_utilizzi_totali: 0,
        max_utilizzi_cliente: 0,
        cumulabile: true,
        data_inizio: "",
        data_fine: "",
        giorni_settimana: ["lunedi", "martedi", "mercoledi", "giovedi", "venerdi"],
        orario_inizio: "12:00",
        orario_fine: "15:00"
      }
    },
    {
      nome: "Cliente Fedele 25%",
      descrizione: "Sconto speciale per i nostri clienti più fedeli",
      tipo_sconto: "percentuale",
      valore_sconto: 25,
      codice: "FEDELE25",
      attivazione: "codice",
      regole: {
        ordine_minimo: 20,
        solo_primo_ordine: false,
        max_utilizzi_totali: 0,
        max_utilizzi_cliente: 0,
        cumulabile: true,
        data_inizio: "",
        data_fine: "",
        giorni_settimana: [],
        orario_inizio: "",
        orario_fine: ""
      }
    }
  ];

  return (
    <div className="p-4 md:p-8 bg-background text-foreground min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 md:mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Gestione Promozioni</h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">Crea e gestisci sconti e offerte speciali</p>
          </div>
          {/* Removed the old Template Pronti and Nuova Promozione buttons */}
        </div>

        {/* Tabs - New UI element for navigation */}
        <div className="flex gap-2 mb-4 md:mb-6 bg-background p-2 rounded-lg shadow-sm border border-border overflow-x-auto">
          <Button
            variant={activeTab === 'mine' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('mine')}
            className={activeTab === 'mine' ? 'bg-red-600 hover:bg-red-700' : ''}
          >
            Le Tue Promo
          </Button>
          <Button
            variant={activeTab === 'templates' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('templates')}
            className={activeTab === 'templates' ? 'bg-red-600 hover:bg-red-700' : ''}
          >
            Predefinite
          </Button>
          <Button
            variant={activeTab === 'create' ? 'default' : 'ghost'}
            data-tour="promotions-create"
            onClick={() => {
              setActiveTab('create');
              setShowAddDialog(true);
            }}
            className={activeTab === 'create' ? 'bg-red-600 hover:bg-red-700' : ''}
          >
            <Plus className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
            Crea Nuova
          </Button>
        </div>

        {/* Le Tue Promo content - conditionally rendered based on activeTab */}
        {activeTab === 'mine' && (
          promotions.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Tag className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">Nessuna promozione attiva</h2>
                <p className="text-muted-foreground mb-6">
                  Crea la tua prima promozione o scegli un template
                </p>
                <div className="flex gap-3 justify-center">
                  <Button 
                    onClick={() => setActiveTab('templates')} // Changed to set activeTab
                    variant="outline"
                    className="border-red-600 text-red-600 hover:bg-red-50"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Usa Template
                  </Button>
                  <Button 
                    onClick={() => setShowAddDialog(true)}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Crea Promozione
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {promotions.map(promo => (
                <Card key={promo.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="flex flex-row items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">{promo.nome}</CardTitle>
                      <div className="flex flex-wrap gap-2">
                        <Badge className={promo.attiva ? "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-100" : "bg-slate-100 text-slate-800 dark:bg-slate-900/40 dark:text-slate-100"}>
                          {promo.attiva ? "Attiva" : "Disattivata"}
                        </Badge>
                        <Badge variant="outline">
                          {promo.attivazione === 'codice' ? `Codice: ${promo.codice}` : 'Automatica'}
                        </Badge>
                        {promo.regole?.cumulabile && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700">
                            Cumulabile
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingPromotion(promo)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {promo.descrizione && (
                      <p className="text-muted-foreground mb-4">{promo.descrizione}</p>
                    )}
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Sconto:</span>
                        <span className="font-bold text-red-600">
                          {promo.tipo_sconto === "percentuale" 
                            ? `${promo.valore_sconto}%`
                            : `€${promo.valore_sconto.toFixed(2)}`
                          }
                        </span>
                      </div>
                      
                      {promo.regole?.ordine_minimo > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Ordine minimo:</span>
                          <span>€{promo.regole.ordine_minimo.toFixed(2)}</span>
                        </div>
                      )}
                      
                      {promo.regole?.solo_primo_ordine && (
                        <div className="text-muted-foreground">
                          ✓ Solo primo ordine
                        </div>
                      )}

                      {promo.regole?.giorni_settimana && promo.regole.giorni_settimana.length > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Giorni:</span>
                          <span className="text-xs">
                            {promo.regole.giorni_settimana.map(g => 
                              g.substring(0, 3).charAt(0).toUpperCase() + g.substring(1, 3)
                            ).join(', ')}
                          </span>
                        </div>
                      )}

                      {(promo.regole?.orario_inizio || promo.regole?.orario_fine) && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Orario:</span>
                          <span className="text-xs">
                            {promo.regole.orario_inizio || "00:00"} - {promo.regole.orario_fine || "23:59"}
                          </span>
                        </div>
                      )}
                      
                      {promo.regole?.max_utilizzi_totali > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Utilizzi:</span>
                          <span>{promo.utilizzi_attuali} / {promo.regole.max_utilizzi_totali}</span>
                        </div>
                      )}
                      
                      {promo.regole?.data_fine && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Valida fino al:</span>
                          <span>{new Date(promo.regole.data_fine).toLocaleDateString('it-IT')}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t">
                      <StatusToggle
                        active={promo.attiva}
                        onToggle={() => toggleActiveMutation.mutate({
                          id: promo.id,
                          attiva: !promo.attiva
                        })}
                        label="Promozione"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        )}

        {/* Template Predefiniti - conditionally rendered based on activeTab */}
        {activeTab === 'templates' && (
          // The outer Card wrapper for templates has been removed as per the outline
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {promotionTemplates.map((template, idx) => (
              <Card key={idx} className="hover:shadow-lg transition-shadow bg-background">
                <CardContent className="p-4">
                  <h3 className="font-bold text-lg mb-2">{template.nome}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{template.descrizione}</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sconto:</span>
                      <span className="font-bold text-red-600">
                        {template.tipo_sconto === "percentuale" 
                          ? `${template.valore_sconto}%`
                          : `€${template.valore_sconto.toFixed(2)}`
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Codice:</span>
                      <Badge variant="outline">{template.codice}</Badge>
                    </div>
                    {template.regole.ordine_minimo > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Minimo:</span>
                        <span>€{template.regole.ordine_minimo.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                  <Button 
                    onClick={() => createFromTemplateMutation.mutate(template)}
                    className="w-full mt-4 bg-red-600 hover:bg-red-700"
                    disabled={createFromTemplateMutation.isPending}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Usa Template
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <AddPromotionDialog
          open={showAddDialog}
          onClose={() => {
            setShowAddDialog(false);
            // After closing add dialog, switch to 'mine' tab
            setActiveTab('mine');
          }}
          restaurantId={restaurant?.id}
        />

        <EditPromotionDialog
          open={!!editingPromotion}
          onClose={() => setEditingPromotion(null)}
          promotion={editingPromotion}
        />
      </div>
    </div>
  );
}