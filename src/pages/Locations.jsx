import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Edit as Pencil, // Renamed Edit to Pencil for clarity with the outline
  Copy,
  Trash2,
  Building2,
  Store, // New icon for principal location
  ExternalLink, // New icon for opening external link
  MoreVertical, // New icon for dropdown menu
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import AddLocationDialog from "../components/locations/AddLocationDialog";
import EditLocationDialog from "../components/locations/EditLocationDialog";
import StatusToggle from "../components/ui/status-toggle";
import { useToast } from "../components/ui/toast";

export default function Locations() {
  const [restaurant, setRestaurant] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const queryClient = useQueryClient();

  const { data: locations = [] } = useQuery({
    queryKey: ['locations', restaurant?.id],
    queryFn: async () => {
      if (!restaurant) return [];
      return base44.entities.Location.filter({ restaurant_id: restaurant.id });
    },
    enabled: !!restaurant,
    initialData: [],
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['orders', restaurant?.id],
    queryFn: async () => {
      if (!restaurant) return [];
      return base44.entities.Order.filter(
        { restaurant_id: restaurant.id },
        "-created_date",
        1000
      );
    },
    enabled: !!restaurant,
    initialData: [],
  });

  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Location.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast({
        title: "✅ Sede eliminata",
        description: "La sede è stata rimossa con successo",
        type: "success"
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, attiva }) => base44.entities.Location.update(id, { attiva }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast({
        title: "✅ Stato aggiornato",
        type: "success"
      });
    },
  });

  const cloneMenuMutation = useMutation({
    mutationFn: async ({ targetLocationId, sourceLocationId }) => {
      const categories = await base44.entities.Category.filter({
        restaurant_id: restaurant.id,
        event_id: null,
        ...(sourceLocationId ? { location_id: sourceLocationId } : {})
      });

      for (const category of categories) {
        const newCategory = await base44.entities.Category.create({
          ...category,
          id: undefined,
          created_date: undefined,
          updated_date: undefined,
          location_id: targetLocationId
        });

        const items = await base44.entities.MenuItem.filter({
          category_id: category.id
        });

        for (const item of items) {
          await base44.entities.MenuItem.create({
            ...item,
            id: undefined,
            created_date: undefined,
            updated_date: undefined,
            category_id: newCategory.id,
            location_id: targetLocationId
          });
        }
      }
    },
    onSuccess: () => {
      toast({
        title: "✅ Menu clonato!",
        description: "Il menu è stato copiato con successo nella sede",
        type: "success"
      });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
    },
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

  const getLocationStats = (locationId) => {
    const locationOrders = orders.filter(o => o.location_id === locationId);
    const today = new Date().toDateString();
    const todayOrders = locationOrders.filter(o =>
      new Date(o.created_date).toDateString() === today
    );
    const todayRevenue = todayOrders.reduce((sum, o) => sum + o.totale, 0);
    const revenue = locationOrders.reduce((sum, o) => sum + o.totale, 0);
    const thisMonth = new Date().getMonth();
    const monthOrders = locationOrders.filter(o => new Date(o.created_date).getMonth() === thisMonth);
    const monthRevenue = monthOrders.reduce((sum, o) => sum + o.totale, 0);

    return {
      ordini_oggi: todayOrders.length,
      incasso_oggi: todayRevenue,
      ordini_mese: monthOrders.length,
      incasso_mese: monthRevenue,
      incasso_totale: revenue,
    };
  };

  // Ordini senza location_id (sede principale)
  const mainLocationStats = () => {
    const mainOrders = orders.filter(o => !o.location_id);
    const today = new Date().toDateString();
    const todayOrders = mainOrders.filter(o =>
      new Date(o.created_date).toDateString() === today
    );
    const todayRevenue = todayOrders.reduce((sum, o) => sum + o.totale, 0);
    const revenue = mainOrders.reduce((sum, o) => sum + o.totale, 0);
    const thisMonth = new Date().getMonth();
    const monthOrders = mainOrders.filter(o => new Date(o.created_date).getMonth() === thisMonth);
    const monthRevenue = monthOrders.reduce((sum, o) => sum + o.totale, 0);

    return {
      ordini_oggi: todayOrders.length,
      incasso_oggi: todayRevenue,
      ordini_mese: monthOrders.length,
      incasso_mese: monthRevenue,
      incasso_totale: revenue,
    };
  };

  const mainStats = mainLocationStats();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 md:mb-8">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Gestione Sedi</h1>
              <p className="text-sm md:text-base text-gray-500 mt-1">Gestisci le tue filiali e punti vendita</p>
            </div>
            <Button
              onClick={() => setShowAddDialog(true)}
              className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuova Sede
            </Button>
          </div>

          <div className="grid gap-4 md:gap-6 mb-6 md:mb-8">
            <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
              <CardContent className="p-4 md:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3 md:gap-4">
                    <Store className="w-10 h-10 md:w-12 md:h-12" />
                    <div>
                      <h2 className="text-xl md:text-2xl font-bold">
                        {restaurant?.nome}
                      </h2>
                      <p className="text-sm md:text-base text-red-100">Sede Principale</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 md:gap-3 w-full sm:w-auto">
                    <div className="bg-white/20 p-2 md:p-3 rounded-lg text-center">
                      <p className="text-xs text-red-100">Ordini Oggi</p>
                      <p className="text-base md:text-xl font-bold">{mainStats.ordini_oggi}</p>
                    </div>
                    <div className="bg-white/20 p-2 md:p-3 rounded-lg text-center">
                      <p className="text-xs text-red-100">€ Oggi</p>
                      <p className="text-sm md:text-lg font-bold">€{mainStats.incasso_oggi.toFixed(0)}</p>
                    </div>
                    <div className="bg-white/20 p-2 md:p-3 rounded-lg text-center">
                      <p className="text-xs text-red-100">Ordini Mese</p>
                      <p className="text-base md:text-xl font-bold">{mainStats.ordini_mese}</p>
                    </div>
                    <div className="bg-white/20 p-2 md:p-3 rounded-lg text-center">
                      <p className="text-xs text-red-100">€ Mese</p>
                      <p className="text-sm md:text-lg font-bold">€{mainStats.incasso_mese.toFixed(0)}</p>
                    </div>
                    <div className="bg-white/20 p-2 md:p-3 rounded-lg text-center">
                      <p className="text-xs text-red-100">€ Totale</p>
                      <p className="text-sm md:text-lg font-bold">€{mainStats.incasso_totale.toFixed(0)}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {locations.length === 0 ? (
            <Card>
              <CardContent className="p-8 md:p-12 text-center">
                <Building2 className="w-12 h-12 md:w-16 md:h-16 text-gray-300 mx-auto mb-4" />
                <h2 className="text-xl md:text-2xl font-bold mb-2">Espandi la tua attività</h2>
                <p className="text-sm md:text-base text-gray-600 mb-2">
                  Aggiungi nuove sedi per gestire più punti vendita
                </p>
                <p className="text-xs md:text-sm text-amber-600 mb-6">
                  💰 Ogni sede aggiuntiva: 50% del costo abbonamento base
                </p>
                <Button
                  onClick={() => setShowAddDialog(true)}
                  className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Aggiungi Prima Sede
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              {locations.map(location => {
                const stats = getLocationStats(location.id);
                const subscriptionCost = restaurant?.abbonamento_tipo === "basic" ? 30 : restaurant?.abbonamento_tipo === "premium" ? 50 : 0;
                const locationCost = (subscriptionCost * 0.5).toFixed(2);
                
                return (
                  <Card key={location.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="p-4 md:p-6 pb-3">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {location.immagine_url && (
                            <img
                              src={location.immagine_url}
                              alt={location.nome}
                              className="w-12 h-12 md:w-16 md:h-16 object-cover rounded-lg flex-shrink-0"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <CardTitle className="text-lg md:text-xl truncate">{location.nome}</CardTitle>
                            <p className="text-xs md:text-sm text-gray-500 mt-1 line-clamp-1">
                              {location.indirizzo}, {location.citta}
                            </p>
                            <div className="mt-2">
                              <StatusToggle
                                active={location.attiva}
                                onToggle={() => toggleActiveMutation.mutate({
                                  id: location.id,
                                  attiva: !location.attiva
                                })}
                                label="Sede"
                              />
                              {location.menu_condiviso && (
                                <Badge variant="outline" className="text-xs mt-2">Menu Condiviso</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingLocation(location)}
                            className="text-xs md:text-sm"
                          >
                            <Pencil className="w-3 h-3 md:w-4 md:h-4 md:mr-1" />
                            <span className="hidden sm:inline">Modifica</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(createPageUrl(`RestaurantPublic?id=${restaurant?.id}&location=${location.id}`), '_blank')}
                            className="text-xs md:text-sm"
                          >
                            <ExternalLink className="w-3 h-3 md:w-4 md:h-4 md:mr-1" />
                            <span className="hidden sm:inline">Apri</span>
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="outline" className="text-xs md:text-sm">
                                <MoreVertical className="w-3 h-3 md:w-4 md:h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link to={createPageUrl(`Orders?location=${location.id}`)}>
                                  <ExternalLink className="w-4 h-4 mr-2" /> Vedi Ordini Sede
                                </Link>
                              </DropdownMenuItem>
                              {!location.menu_condiviso && (
                                <DropdownMenuItem asChild>
                                  <Link to={createPageUrl(`MenuManagement?location=${location.id}`)}>
                                    <Pencil className="w-4 h-4 mr-2" /> Gestisci Menu
                                  </Link>
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => {
                                  if (confirm(`Clonare il menu della sede principale per "${location.nome}"?`)) {
                                    cloneMenuMutation.mutate({ 
                                      targetLocationId: location.id,
                                      sourceLocationId: null 
                                    });
                                  }
                                }}
                              >
                                <Copy className="w-4 h-4 mr-2" /> Clona Menu Sede Principale
                              </DropdownMenuItem>
                              {locations.length > 1 && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    const otherLocations = locations.filter(l => l.id !== location.id);
                                    if (otherLocations.length === 0) return;
                                    
                                    const locationNames = otherLocations.map((l, i) => `${i + 1}. ${l.nome}`).join('\n');
                                    const choice = prompt(`Scegli sede da cui clonare (inserisci numero):\n\n${locationNames}`);
                                    const index = parseInt(choice) - 1;
                                    
                                    if (index >= 0 && index < otherLocations.length) {
                                      const sourceLocation = otherLocations[index];
                                      if (confirm(`Clonare il menu da "${sourceLocation.nome}" a "${location.nome}"?`)) {
                                        cloneMenuMutation.mutate({ 
                                          targetLocationId: location.id,
                                          sourceLocationId: sourceLocation.id 
                                        });
                                      }
                                    }
                                  }}
                                >
                                  <Copy className="w-4 h-4 mr-2" /> Clona Menu da Altra Sede
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => {
                                  const url = `${window.location.origin}${createPageUrl(`RestaurantPublic?id=${restaurant.id}&location=${location.id}`)}`;
                                  navigator.clipboard.writeText(url);
                                  alert("✅ Link copiato!");
                                }}
                              >
                                <Copy className="w-4 h-4 mr-2" /> Copia Link Pubblico
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                onClick={() => {
                                  if (confirm(`Eliminare la sede "${location.nome}"? Questa azione è irreversibile.`)) {
                                    deleteMutation.mutate(location.id);
                                  }
                                }}
                              >
                                <Trash2 className="w-4 h-4 mr-2" /> Elimina Sede
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 md:p-6 pt-0">
                      {/* Subscription Info */}
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-amber-900">💰 Abbonamento Sede</span>
                          {location.abbonamento_attivo ? (
                            <Badge className="bg-green-100 text-green-800 border-green-300 border">✓ ATTIVO</Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800 border-red-300 border">✗ SOSPESO</Badge>
                          )}
                        </div>
                        <div className="text-xs space-y-1">
                          <p className="text-amber-800">
                            Costo mensile: <span className="font-bold">€{locationCost}/mese</span> (50% sconto)
                          </p>
                          {location.abbonamento_scadenza && (
                            <p className="text-amber-800">
                              Scadenza: <span className="font-semibold">{new Date(location.abbonamento_scadenza).toLocaleDateString('it-IT')}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
                        <div className="bg-blue-50 p-2 rounded-lg text-center">
                          <p className="text-xs text-gray-600">Ordini Oggi</p>
                          <p className="text-sm md:text-base font-bold text-blue-600">{stats.ordini_oggi}</p>
                        </div>
                        <div className="bg-indigo-50 p-2 rounded-lg text-center">
                          <p className="text-xs text-gray-600">€ Oggi</p>
                          <p className="text-xs md:text-sm font-bold text-indigo-600">€{stats.incasso_oggi.toFixed(0)}</p>
                        </div>
                        <div className="bg-purple-50 p-2 rounded-lg text-center">
                          <p className="text-xs text-gray-600">Ordini Mese</p>
                          <p className="text-sm md:text-base font-bold text-purple-600">{stats.ordini_mese}</p>
                        </div>
                        <div className="bg-green-50 p-2 rounded-lg text-center">
                          <p className="text-xs text-gray-600">€ Mese</p>
                          <p className="text-xs md:text-sm font-bold text-green-600">€{stats.incasso_mese.toFixed(0)}</p>
                        </div>
                        <div className="bg-amber-50 p-2 rounded-lg text-center">
                          <p className="text-xs text-gray-600">€ Totale</p>
                          <p className="text-xs md:text-sm font-bold text-amber-600">€{stats.incasso_totale.toFixed(0)}</p>
                        </div>
                      </div>

                      {/* Fiscal & Payment Configuration */}
                      <div className="mt-3 pt-3 border-t text-xs space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Config. Fiscale:</span>
                          {(!location.configurazione_fiscale || location.configurazione_fiscale.usa_principale !== false) ? (
                            <Badge variant="outline" className="text-xs">Condivisa</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700">Propria</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Config. Pagamenti:</span>
                          {(!location.configurazione_pagamenti || location.configurazione_pagamenti.usa_principale !== false) ? (
                            <Badge variant="outline" className="text-xs">Condivisa</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700">Propria</Badge>
                          )}
                        </div>
                      </div>

                      {location.responsabile_nome && (
                        <div className="mt-3 pt-3 border-t text-xs md:text-sm">
                          <p className="text-gray-600">
                            <span className="font-medium">Responsabile:</span> {location.responsabile_nome}
                          </p>
                          {location.responsabile_telefono && (
                            <p className="text-gray-600 mt-1">
                              <span className="font-medium">Tel:</span> {location.responsabile_telefono}
                            </p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <AddLocationDialog
            open={showAddDialog}
            onClose={() => setShowAddDialog(false)}
            restaurantId={restaurant?.id}
          />

          <EditLocationDialog
            open={!!editingLocation}
            onClose={() => setEditingLocation(null)}
            location={editingLocation}
          />
        </div>
      </div>
    </div>
  );
}