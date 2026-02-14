import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
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

  const { data: promotions = [], isLoading } = useQuery({
    queryKey: ['promotions', restaurant?.id],
    queryFn: async () => {
      if (!restaurant) return [];
      return base44.entities.Promotion.filter({ restaurant_id: restaurant.id });
    },
    enabled: !!restaurant,
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
      }
    } catch (error) {
      console.error("Errore:", error);
    }
  };

  const createFromTemplateMutation = useMutation({
    mutationFn: (template) => base44.entities.Promotion.create({
      ...template,
      restaurant_id: restaurant.id,
      utilizzi_attuali: 0,
      attiva: false
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      toast({
        title: "✅ Template applicato!",
        description: "Promozione creata (disattivata). Modificala e attivala quando vuoi."
      });
      setActiveTab('mine'); 
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, attiva }) => base44.entities.Promotion.update(id, { attiva }),
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
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestione Promozioni</h1>
            <p className="text-gray-500 mt-1">Crea e gestisci sconti e offerte speciali</p>
          </div>
          {/* Removed the old Template Pronti and Nuova Promozione buttons */}
        </div>

        {/* Tabs - New UI element for navigation */}
        <div className="flex gap-2 mb-6 bg-white p-2 rounded-lg shadow-sm">
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
            onClick={() => {
              setActiveTab('create');
              setShowAddDialog(true);
            }}
            className={activeTab === 'create' ? 'bg-red-600 hover:bg-red-700' : ''}
          >
            <Plus className="w-4 h-4 mr-2" />
            Crea Nuova
          </Button>
        </div>

        {/* Le Tue Promo content - conditionally rendered based on activeTab */}
        {activeTab === 'mine' && (
          promotions.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Tag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">Nessuna promozione attiva</h2>
                <p className="text-gray-600 mb-6">
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
            <div className="grid md:grid-cols-2 gap-6">
              {promotions.map(promo => (
                <Card key={promo.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="flex flex-row items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">{promo.nome}</CardTitle>
                      <div className="flex flex-wrap gap-2">
                        <Badge className={promo.attiva ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                          {promo.attiva ? "Attiva" : "Disattivata"}
                        </Badge>
                        <Badge variant="outline">
                          {promo.attivazione === "automatica" ? "Automatica" : `Codice: ${promo.codice}`}
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
                      <p className="text-gray-600 mb-4">{promo.descrizione}</p>
                    )}
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Sconto:</span>
                        <span className="font-bold text-red-600">
                          {promo.tipo_sconto === "percentuale" 
                            ? `${promo.valore_sconto}%`
                            : `€${promo.valore_sconto.toFixed(2)}`
                          }
                        </span>
                      </div>
                      
                      {promo.regole?.ordine_minimo > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Ordine minimo:</span>
                          <span>€{promo.regole.ordine_minimo.toFixed(2)}</span>
                        </div>
                      )}
                      
                      {promo.regole?.solo_primo_ordine && (
                        <div className="text-gray-600">
                          ✓ Solo primo ordine
                        </div>
                      )}

                      {promo.regole?.giorni_settimana && promo.regole.giorni_settimana.length > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Giorni:</span>
                          <span className="text-xs">
                            {promo.regole.giorni_settimana.map(g => 
                              g.substring(0, 3).charAt(0).toUpperCase() + g.substring(1, 3)
                            ).join(', ')}
                          </span>
                        </div>
                      )}

                      {(promo.regole?.orario_inizio || promo.regole?.orario_fine) && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Orario:</span>
                          <span className="text-xs">
                            {promo.regole.orario_inizio || "00:00"} - {promo.regole.orario_fine || "23:59"}
                          </span>
                        </div>
                      )}
                      
                      {promo.regole?.max_utilizzi_totali > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Utilizzi:</span>
                          <span>{promo.utilizzi_attuali} / {promo.regole.max_utilizzi_totali}</span>
                        </div>
                      )}
                      
                      {promo.regole?.data_fine && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Valida fino al:</span>
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
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {promotionTemplates.map((template, idx) => (
              <Card key={idx} className="hover:shadow-lg transition-shadow bg-white">
                <CardContent className="p-4">
                  <h3 className="font-bold text-lg mb-2">{template.nome}</h3>
                  <p className="text-sm text-gray-600 mb-3">{template.descrizione}</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Sconto:</span>
                      <span className="font-bold text-red-600">
                        {template.tipo_sconto === "percentuale" 
                          ? `${template.valore_sconto}%`
                          : `€${template.valore_sconto.toFixed(2)}`
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Codice:</span>
                      <Badge variant="outline">{template.codice}</Badge>
                    </div>
                    {template.regole.ordine_minimo > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Minimo:</span>
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