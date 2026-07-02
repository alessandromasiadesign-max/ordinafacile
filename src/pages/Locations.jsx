import { Restaurant } from '@/api/entities';
import React, { useState, useEffect } from "react";
import { supabase } from '@/api/supabaseClient';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Copy,
  Trash2,
  Building2,
  Store, 
  ExternalLink, 
  MoreVertical, 
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

import AddLocationDialog from "../components/locations/AddLocationDialog";
import StatusToggle from "../components/ui/status-toggle";
import { useToast } from "../components/ui/use-toast";

export default function Locations() {
  const [restaurant, setRestaurant] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState(null);
  const queryClient = useQueryClient();

  const { data: locations = [] } = useQuery({
    queryKey: ['restaurants'],
    queryFn: async () => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user?.id) return [];
      const isAdmin = user?.app_metadata?.role === 'admin' || user?.user_metadata?.role === 'admin';
      return isAdmin ? Restaurant.list('-created_at') : Restaurant.filter({ user_id: user.id });
    },
    initialData: [],
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['orders', 'by-restaurants', locations.map((r) => r.id).filter(Boolean).join(',')],
    queryFn: async () => {
      const ids = locations.map((r) => r.id).filter(Boolean);
      if (ids.length === 0) return [];
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .in('restaurant_id', ids)
        .order('created_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: locations.length > 0,
    initialData: [],
  });

  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: (id) => Restaurant.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurants'] });
      toast({
        title: "Sede eliminata",
        description: "La sede è stata rimossa con successo",
        type: "success"
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, attiva }) => Restaurant.update(id, { attiva }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurants'] });
      toast({
        title: "Stato aggiornato",
        type: "success"
      });
    },
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

      const restaurants = isAdmin ? await Restaurant.list('-created_at') : await Restaurant.filter({ user_id: user.id });
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

  const getLocationStats = (locationId) => {
    const locationOrders = orders.filter(o => o.restaurant_id === locationId);
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

  const mainLocationStats = () => {
    const mainOrders = orders.filter(o => o.restaurant_id === restaurant?.id);
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

  const handleSelectRestaurant = (id) => {
    if (!id) return;
    localStorage.setItem('selected_restaurant_id', id);
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 md:mb-8">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Gestione <span className="gradient-text">Sedi</span></h1>
              <p className="text-sm md:text-base text-muted-foreground mt-1">Gestisci le tue filiali e punti vendita</p>
            </div>
            <Button
              onClick={() => setShowAddDialog(true)}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/20 w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuova Sede
            </Button>
          </div>

          <div className="grid gap-4 md:gap-6 mb-6 md:mb-8">
            <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
              <CardContent className="p-4 md:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3 md:gap-4">
                    <Store className="w-10 h-10 md:w-12 md:h-12" />
                    <div>
                      <h2 className="text-xl md:text-2xl font-bold">
                        {restaurant?.nome ?? restaurant?.name}
                      </h2>
                      <p className="text-sm md:text-base text-orange-100">Sede Principale</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 md:gap-3 w-full sm:w-auto">
                    <div className="bg-blue-50 dark:bg-blue-950/30 p-2 md:p-3 rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">Ordini Oggi</p>
                      <p className="text-base md:text-xl font-bold text-blue-600">{mainStats.ordini_oggi}</p>
                    </div>
                    <div className="bg-indigo-50 dark:bg-indigo-950/30 p-2 md:p-3 rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">€ Oggi</p>
                      <p className="text-sm md:text-lg font-bold text-indigo-600">€{mainStats.incasso_oggi.toFixed(0)}</p>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-950/30 p-2 md:p-3 rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">Ordini Mese</p>
                      <p className="text-base md:text-xl font-bold text-purple-600">{mainStats.ordini_mese}</p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-950/30 p-2 md:p-3 rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">€ Mese</p>
                      <p className="text-sm md:text-lg font-bold text-green-600">€{mainStats.incasso_mese.toFixed(0)}</p>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-950/30 p-2 md:p-3 rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">€ Totale</p>
                      <p className="text-sm md:text-lg font-bold text-amber-600">€{mainStats.incasso_totale.toFixed(0)}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {locations.length === 0 ? (
            <Card>
              <CardContent className="p-8 md:p-12 text-center">
                <Building2 className="w-12 h-12 md:w-16 md:h-16 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-xl md:text-2xl font-bold mb-2">Espandi la tua attività</h2>
                <p className="text-sm md:text-base text-muted-foreground mb-2">
                  Aggiungi nuove sedi per gestire più punti vendita
                </p>
                <p className="text-xs md:text-sm text-amber-600 mb-6">
                  Ogni sede aggiuntiva: 50% del costo abbonamento base
                </p>
                <Button
                  onClick={() => setShowAddDialog(true)}
                  className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/20 w-full sm:w-auto"
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

                return (
                  <Card key={location.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="p-4 md:p-6 pb-3">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {location.immagine_url ? (
                            <img
                              src={location.immagine_url}
                              alt={location.nome || location.name}
                              className="w-12 h-12 md:w-16 md:h-16 object-cover rounded-lg flex-shrink-0"
                            />
                          ) : null}
                          <div className="min-w-0 flex-1">
                            <CardTitle className="text-lg md:text-xl truncate">{location.nome || location.name}</CardTitle>
                            <p className="text-xs md:text-sm text-muted-foreground mt-1 line-clamp-1">
                              {location.indirizzo || location.address}, {location.citta || location.city}
                            </p>
                            <div className="mt-2">
                              {location.attiva !== undefined ? (
                                <StatusToggle
                                  active={location.attiva}
                                  onToggle={() =>
                                    toggleActiveMutation.mutate({
                                      id: location.id,
                                      attiva: !location.attiva,
                                    })
                                  }
                                  label="Sede"
                                />
                              ) : null}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 flex-shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSelectRestaurant(location.id)}
                            className="text-xs md:text-sm"
                          >
                            <Store className="w-3 h-3 md:w-4 md:h-4 md:mr-1" />
                            <span className="hidden sm:inline">Seleziona</span>
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(`/r/${location.id}`, '_blank')}
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
                              <DropdownMenuItem
                                onClick={() => {
                                  const url = `${window.location.origin}/r/${location.id}`;
                                  navigator.clipboard.writeText(url);
                                  alert("Link copiato!");
                                }}
                              >
                                <Copy className="w-4 h-4 mr-2" /> Copia Link Pubblico
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                onClick={() => {
                                  setLocationToDelete(location);
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
                      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
                        <div className="bg-blue-50 dark:bg-blue-950/30 p-2 rounded-lg text-center">
                          <p className="text-xs text-muted-foreground">Ordini Oggi</p>
                          <p className="text-sm md:text-base font-bold text-blue-600">{stats.ordini_oggi}</p>
                        </div>
                        <div className="bg-indigo-50 dark:bg-indigo-950/30 p-2 rounded-lg text-center">
                          <p className="text-xs text-muted-foreground">€ Oggi</p>
                          <p className="text-xs md:text-sm font-bold text-indigo-600">€{stats.incasso_oggi.toFixed(0)}</p>
                        </div>
                        <div className="bg-purple-50 dark:bg-purple-950/30 p-2 rounded-lg text-center">
                          <p className="text-xs text-muted-foreground">Ordini Mese</p>
                          <p className="text-sm md:text-base font-bold text-purple-600">{stats.ordini_mese}</p>
                        </div>
                        <div className="bg-green-50 dark:bg-green-950/30 p-2 rounded-lg text-center">
                          <p className="text-xs text-muted-foreground">€ Mese</p>
                          <p className="text-xs md:text-sm font-bold text-green-600">€{stats.incasso_mese.toFixed(0)}</p>
                        </div>
                        <div className="bg-amber-50 dark:bg-amber-950/30 p-2 rounded-lg text-center">
                          <p className="text-xs text-muted-foreground">€ Totale</p>
                          <p className="text-xs md:text-sm font-bold text-amber-600">€{stats.incasso_totale.toFixed(0)}</p>
                        </div>
                      </div>
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

          <AlertDialog open={!!locationToDelete} onOpenChange={(open) => !open && setLocationToDelete(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Eliminare sede?</AlertDialogTitle>
                <AlertDialogDescription>
                  Vuoi eliminare la sede "{locationToDelete?.nome || locationToDelete?.name || ''}"? L'operazione è definitiva.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleteMutation.isPending}>Annulla</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 hover:bg-red-700"
                  disabled={deleteMutation.isPending}
                  onClick={() => {
                    if (!locationToDelete?.id) return;
                    deleteMutation.mutate(locationToDelete.id);
                    setLocationToDelete(null);
                  }}
                >
                  Elimina
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}