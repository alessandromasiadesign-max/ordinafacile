import { Restaurant, Order, TechnicalSupport, PlatformSettings } from '@/api/entities';
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Store,
  Search,
  Calendar,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Settings,
  X,
  Headphones,
  Eye,
  MessageSquare,
  Save,
  Pencil,
  Trash2
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { createPageUrl } from "@/utils";

import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function MasterDashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showExpiringOnly, setShowExpiringOnly] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [platformSettings, setPlatformSettings] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [editingRestaurant, setEditingRestaurant] = useState(null);
  const [deletingRestaurant, setDeletingRestaurant] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [subscriptionForm, setSubscriptionForm] = useState({
    abbonamento_tipo: 'free',
    abbonamento_scadenza: '',
    abbonamento_attivo: false,
    attivo: true,
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const startManagingRestaurant = (restaurant) => {
    if (!restaurant?.id) return;
    localStorage.setItem('admin_view_mode', 'restaurant');
    localStorage.setItem('selected_restaurant_id', restaurant.id);
    window.location.href = createPageUrl("Dashboard");
  };

  const normalizeRestaurant = (r) => ({
    ...r,
    created_date: r?.created_at,
  });

  const updateRestaurantMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      if (!id) throw new Error('Ristorante non valido');
      return Restaurant.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-restaurants'] });
      queryClient.invalidateQueries({ queryKey: ['restaurants'] });
      toast({
        title: 'Aggiornato',
        description: 'Ristorante aggiornato correttamente',
        type: 'success',
      });
      setEditingRestaurant(null);
    },
    onError: (error) => {
      console.error('Errore aggiornamento ristorante:', error);
      toast({
        title: 'Errore',
        description: error?.message || 'Impossibile aggiornare il ristorante',
        type: 'error',
      });
    },
  });

  const deleteRestaurantMutation = useMutation({
    mutationFn: async (id) => {
      if (!id) throw new Error('Ristorante non valido');
      return Restaurant.delete(id);
    },
    onSuccess: (data, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['all-restaurants'] });
      queryClient.invalidateQueries({ queryKey: ['restaurants'] });
      toast({
        title: 'Eliminato',
        description: 'Ristorante eliminato',
        type: 'success',
      });
      if (selectedRestaurant?.id && selectedRestaurant.id === deletedId) {
        setSelectedRestaurant(null);
      }
      if (editingRestaurant?.id && editingRestaurant.id === deletedId) {
        setEditingRestaurant(null);
      }
      setDeletingRestaurant(null);
      setDeleteConfirmText("");
    },
    onError: (error) => {
      console.error('Errore eliminazione ristorante:', error);
      toast({
        title: 'Errore',
        description: error?.message || 'Impossibile eliminare il ristorante (potrebbero esserci dati collegati)',
        type: 'error',
      });
    },
  });

  const openEditSubscription = (restaurant) => {
    if (!restaurant?.id) return;
    setEditingRestaurant(restaurant);
    setSubscriptionForm({
      abbonamento_tipo: restaurant.abbonamento_tipo || 'free',
      abbonamento_scadenza: restaurant.abbonamento_scadenza || '',
      abbonamento_attivo: restaurant.abbonamento_attivo === true,
      attivo: restaurant.attivo !== false,
    });
  };

  const saveSubscription = () => {
    if (!editingRestaurant?.id) return;
    updateRestaurantMutation.mutate({
      id: editingRestaurant.id,
      data: {
        abbonamento_tipo: subscriptionForm.abbonamento_tipo,
        abbonamento_scadenza: subscriptionForm.abbonamento_scadenza || null,
        abbonamento_attivo: subscriptionForm.abbonamento_attivo,
        attivo: subscriptionForm.attivo,
      },
    });
  };

  const normalizeOrder = (o) => ({
    ...o,
    totale: Number(o?.totale ?? o?.total ?? 0),
    created_date: o?.created_date ?? o?.created_at,
  });

  const { data: restaurants = [], isLoading } = useQuery({
    queryKey: ['all-restaurants'],
    queryFn: async () => {
      const rows = await Restaurant.list("-created_at");
      return (rows || []).map(normalizeRestaurant);
    },
    initialData: [],
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['all-orders'],
    queryFn: async () => {
      const rows = await Order.list("-created_at", 1000);
      return (rows || []).map(normalizeOrder);
    },
    initialData: [],
  });

  const { data: supportRequests = [] } = useQuery({
    queryKey: ['all-support-requests'],
    queryFn: () => TechnicalSupport.list("-created_date"),
    initialData: [],
  });

  useEffect(() => {
    loadPlatformSettings();
  }, []);

  const loadPlatformSettings = async () => {
    try {
      const settings = await PlatformSettings.list();
      if (settings.length > 0) {
        setPlatformSettings(settings[0]);
        setPhoneNumber(settings[0].telefono_assistenza || "");
      }
    } catch (error) {
      console.error("Errore caricamento impostazioni:", error);
    }
  };

  const savePhoneMutation = useMutation({
    mutationFn: async () => {
      if (platformSettings) {
        return PlatformSettings.update(platformSettings.id, {
          telefono_assistenza: phoneNumber
        });
      } else {
        return PlatformSettings.create({
          telefono_assistenza: phoneNumber
        });
      }
    },
    onSuccess: () => {
      toast({
        title: "Numero salvato",
        description: "Il numero di assistenza è stato aggiornato",
        type: "success"
      });
      loadPlatformSettings();
    },
    onError: (error) => {
      console.error('Errore salvataggio telefono assistenza:', error);
      toast({
        title: "Errore",
        description: error?.message ? `Impossibile salvare il numero: ${error.message}` : "Impossibile salvare il numero",
        type: "error"
      });
    }
  });

  const openDeleteRestaurant = (restaurant) => {
    if (!restaurant?.id) return;
    setDeletingRestaurant(restaurant);
    setDeleteConfirmText("");
  };

  const normalizeDeleteConfirm = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");

  const confirmDeleteRestaurant = () => {
    if (!deletingRestaurant?.id) return;
    deleteRestaurantMutation.mutate(deletingRestaurant.id);
  };

  const getNormalizedExpiryInfo = (r) => {
    if (!r?.abbonamento_scadenza) return { expiry: null, today: null, daysUntilExpiry: null, isExpired: false };
    const expiry = new Date(r.abbonamento_scadenza);
    if (Number.isNaN(expiry.getTime())) return { expiry: null, today: null, daysUntilExpiry: null, isExpired: false };

    expiry.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysUntilExpiry = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return {
      expiry,
      today,
      daysUntilExpiry,
      isExpired: daysUntilExpiry < 0,
    };
  };

  const isSubscriptionActive = (r) => {
    if (r?.abbonamento_attivo !== true) return false;
    const info = getNormalizedExpiryInfo(r);
    if (!info.expiry) return true;
    return info.isExpired === false;
  };

  const isSubscriptionExpiringSoon = (r) => {
    if (!isSubscriptionActive(r)) return false;
    const info = getNormalizedExpiryInfo(r);
    if (info.daysUntilExpiry == null) return false;
    return info.daysUntilExpiry <= 7 && info.daysUntilExpiry >= 0;
  };

  const activeSubscriptions = restaurants.filter((r) => isSubscriptionActive(r)).length;
  const expiringSoon = restaurants.filter((r) => isSubscriptionExpiringSoon(r)).length;

  const filteredRestaurants = restaurants
    .filter((r) => {
      const q = searchQuery.toLowerCase();
      return (
        r.nome?.toLowerCase().includes(q) ||
        r.citta?.toLowerCase().includes(q) ||
        r.email?.toLowerCase().includes(q)
      );
    })
    .filter((r) => {
      if (!showExpiringOnly) return true;
      return isSubscriptionExpiringSoon(r);
    });

  const totalRevenue = orders.reduce((sum, o) => sum + (o.totale || 0), 0);

  const openSupportRequests = supportRequests.filter(r => r.stato === "aperta").length;
  const inProgressRequests = supportRequests.filter(r => r.stato === "in_lavorazione").length;

  const getRestaurantStats = (restaurantId) => {
    const restaurantOrders = orders.filter(o => o.restaurant_id === restaurantId);
    const last30Days = orders.filter(o => {
      if (!o.created_date) return false;
      const orderDate = new Date(o.created_date);
      if (Number.isNaN(orderDate.getTime())) return false;
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return o.restaurant_id === restaurantId && orderDate >= thirtyDaysAgo;
    });

    const revenue = restaurantOrders.reduce((sum, o) => sum + (o.totale || 0), 0);
    const last30DaysRevenue = last30Days.reduce((sum, o) => sum + (o.totale || 0), 0);

    return {
      totalOrders: restaurantOrders.length,
      last30DaysOrders: last30Days.length,
      totalRevenue: revenue,
      last30DaysRevenue: last30DaysRevenue,
      avgOrderValue: restaurantOrders.length > 0 ? revenue / restaurantOrders.length : 0
    };
  };

  const getRestaurantChartData = (restaurantId) => {
    const restaurantOrders = orders.filter(o => o.restaurant_id === restaurantId);
    const data = [];

    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayOrders = restaurantOrders.filter(o => {
        if (!o.created_date) return false;
        const orderDate = new Date(o.created_date);
        if (Number.isNaN(orderDate.getTime())) return false;
        return orderDate.toDateString() === date.toDateString();
      });

      data.push({
        date: format(date, 'dd/MM'),
        ordini: dayOrders.length,
        incasso: dayOrders.reduce((sum, o) => sum + (o.totale || 0), 0)
      });
    }

    return data;
  };

  return (
    <div className="p-4 md:p-8 bg-background text-foreground min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Dashboard <span className="gradient-text">Master</span></h1>
          <p className="text-muted-foreground mt-1">Gestisci tutti i ristoranti della piattaforma</p>
        </div>

        <div className="flex gap-2 mb-6 bg-background p-2 rounded-lg shadow-sm border border-border">
          <Button
            variant={activeTab === "overview" ? "default" : "ghost"}
            onClick={() => setActiveTab("overview")}
            className={activeTab === "overview" ? "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-md shadow-orange-500/20" : ""}
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Panoramica
          </Button>
          <Button
            variant={activeTab === "restaurants" ? "default" : "ghost"}
            onClick={() => setActiveTab("restaurants")}
            className={activeTab === "restaurants" ? "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-md shadow-orange-500/20" : ""}
          >
            <Store className="w-4 h-4 mr-2" />
            Ristoranti
          </Button>
          <Button
            variant={activeTab === "support" ? "default" : "ghost"}
            onClick={() => setActiveTab("support")}
            className={activeTab === "support" ? "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-md shadow-orange-500/20" : ""}
          >
            <Headphones className="w-4 h-4 mr-2" />
            Assistenza
            {openSupportRequests > 0 && (
              <Badge className="ml-2 bg-red-500">{openSupportRequests}</Badge>
            )}
          </Button>
          <Button
            variant={activeTab === "settings" ? "default" : "ghost"}
            onClick={() => setActiveTab("settings")}
            className={activeTab === "settings" ? "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-md shadow-orange-500/20" : ""}
          >
            <Settings className="w-4 h-4 mr-2" />
            Impostazioni
          </Button>
        </div>

        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Ristoranti Totali
                </CardTitle>
                <Store className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{restaurants.length}</div>
                <p className="text-xs text-muted-foreground mt-1">Registrati sulla piattaforma</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Abbonamenti Attivi
                </CardTitle>
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{activeSubscriptions}</div>
                <p className="text-xs text-muted-foreground mt-1">In regola con i pagamenti</p>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:shadow-sm transition-shadow"
              onClick={() => {
                setActiveTab('restaurants');
                setSelectedRestaurant(null);
                setSearchQuery('');
                setShowExpiringOnly(true);
              }}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  In Scadenza (7gg)
                </CardTitle>
                <AlertCircle className="w-4 h-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-600">{expiringSoon}</div>
                <p className="text-xs text-muted-foreground mt-1">Prossimi 7 giorni</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Fatturato Totale
                </CardTitle>
                <TrendingUp className="w-4 h-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  €{totalRevenue.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Volume ordini piattaforma</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Richieste Assistenza
                </CardTitle>
                <Headphones className="w-4 h-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">{openSupportRequests}</div>
                <p className="text-xs text-muted-foreground mt-1">{inProgressRequests} in lavorazione</p>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "restaurants" && selectedRestaurant && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Dettaglio: {selectedRestaurant.nome}</span>
                <Button variant="outline" size="sm" onClick={() => setSelectedRestaurant(null)}>
                  <X className="w-4 h-4 mr-2" />
                  Chiudi
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-end mb-4">
                <Button
                  className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/20"
                  onClick={() => startManagingRestaurant(selectedRestaurant)}
                >
                  Gestisci questo ristorante
                </Button>
              </div>
              {(() => {
                const stats = getRestaurantStats(selectedRestaurant.id);
                const chartData = getRestaurantChartData(selectedRestaurant.id);

                return (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg">
                        <p className="text-sm text-muted-foreground">Ordini Totali</p>
                        <p className="text-2xl font-bold text-blue-600">{stats.totalOrders}</p>
                      </div>
                      <div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-lg">
                        <p className="text-sm text-muted-foreground">Incasso Totale</p>
                        <p className="text-2xl font-bold text-green-600">€{stats.totalRevenue.toFixed(2)}</p>
                      </div>
                      <div className="bg-purple-50 dark:bg-purple-950/30 p-4 rounded-lg">
                        <p className="text-sm text-muted-foreground">Ultimi 30gg</p>
                        <p className="text-2xl font-bold text-purple-600">{stats.last30DaysOrders} ordini</p>
                      </div>
                      <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-lg">
                        <p className="text-sm text-muted-foreground">Valore Medio</p>
                        <p className="text-2xl font-bold text-amber-600">€{stats.avgOrderValue.toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold mb-3">Ordini (Ultimi 30 giorni)</h4>
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="ordini" fill="#3b82f6" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-3">Incassi (Ultimi 30 giorni)</h4>
                        <ResponsiveContainer width="100%" height={250}>
                          <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Line type="monotone" dataKey="incasso" stroke="#10b981" strokeWidth={2} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}

        {activeTab === "restaurants" && (
          <Card>
            <CardHeader>
              <CardTitle>Lista Ristoranti</CardTitle>
              <div className="mt-4">
                <div className="flex flex-col md:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                    <Input
                      placeholder="Cerca ristorante per nome, città o email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className={showExpiringOnly ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : ''}
                    onClick={() => {
                      setSelectedRestaurant(null);
                      setShowExpiringOnly((v) => !v);
                    }}
                  >
                    Mostra in scadenza (7gg)
                    {showExpiringOnly ? ' (attivo)' : ''}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isLoading ? (
                  <p className="text-center text-muted-foreground py-8">Caricamento...</p>
                ) : filteredRestaurants.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Nessun ristorante trovato</p>
                ) : (
                  filteredRestaurants.map(restaurant => {
                    const stats = getRestaurantStats(restaurant.id);
                    const expiryInfo = getNormalizedExpiryInfo(restaurant);
                    const daysUntilExpiry = expiryInfo.daysUntilExpiry;
                    const effectiveSubscriptionActive = isSubscriptionActive(restaurant);

                    return (
                      <Card
                        key={restaurant.id}
                        className="hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => setSelectedRestaurant(restaurant)}
                      >
                        <CardContent className="p-6">
                          <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                {restaurant.logo_url && (
                                  <img
                                    src={restaurant.logo_url}
                                    alt={restaurant.nome}
                                    className="w-12 h-12 object-cover rounded-lg"
                                  />
                                )}
                                <div>
                                  <h3 className="text-lg font-bold">{restaurant.nome}</h3>
                                  <p className="text-sm text-muted-foreground">
                                    {restaurant.citta} • {restaurant.tipo_cucina}
                                  </p>
                                </div>
                              </div>

                              <div className="grid md:grid-cols-3 gap-2 text-sm text-muted-foreground mt-3">
                                <div>
                                  <span className="font-medium">Email:</span> {restaurant.email || "N/A"}
                                </div>
                                <div>
                                  <span className="font-medium">Telefono:</span> {restaurant.telefono || "N/A"}
                                </div>
                                <div>
                                  <span className="font-medium">Ordini:</span> {stats.totalOrders}
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-2">
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditSubscription(restaurant);
                                  }}
                                >
                                  <Pencil className="w-4 h-4 mr-2" />
                                  Abbonamento
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openDeleteRestaurant(restaurant);
                                  }}
                                  disabled={deleteRestaurantMutation.isPending}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Elimina
                                </Button>
                              </div>
                              <Badge className={
                                effectiveSubscriptionActive
                                  ? "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-100"
                                  : "bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-100"
                              }>
                                {restaurant.abbonamento_tipo || "free"} - {
                                  effectiveSubscriptionActive ? "Attivo" : "Scaduto"
                                }
                              </Badge>

                              {restaurant.abbonamento_scadenza && (
                                <div className="text-sm text-muted-foreground flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  <span>
                                    Scadenza: {format(new Date(restaurant.abbonamento_scadenza), "dd/MM/yyyy", { locale: it })}
                                  </span>
                                </div>
                              )}

                              {daysUntilExpiry !== null && daysUntilExpiry <= 7 && daysUntilExpiry >= 0 && (
                                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                  Scade tra {daysUntilExpiry} giorni
                                </Badge>
                              )}

                              <Badge variant="outline">
                                Registrato: {format(new Date(restaurant.created_date), "dd/MM/yyyy", { locale: it })}
                              </Badge>
                            </div>
                          </div>

                          <div className="grid md:grid-cols-4 gap-3 mt-4 pt-4 border-t">
                            <div className="text-center">
                              <p className="text-sm text-muted-foreground">Ordini Totali</p>
                              <p className="text-xl font-bold text-blue-600">{stats.totalOrders}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-sm text-muted-foreground">Incasso</p>
                              <p className="text-xl font-bold text-green-600">€{stats.totalRevenue.toFixed(2)}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-sm text-muted-foreground">Ultimi 30gg</p>
                              <p className="text-xl font-bold text-purple-600">{stats.last30DaysOrders}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-sm text-muted-foreground">€ Medio</p>
                              <p className="text-xl font-bold text-amber-600">€{stats.avgOrderValue.toFixed(2)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "support" && (
          <SupportRequestsSection supportRequests={supportRequests} restaurants={restaurants} />
        )}

        {activeTab === "settings" && (
          <Card>
            <CardHeader>
              <CardTitle>Impostazioni Piattaforma</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="phone">Numero di Telefono Assistenza</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Questo numero sarà visibile ai ristoratori per chiamate di assistenza urgente
                  </p>
                  <div className="flex gap-3">
                    <Input
                      id="phone"
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="Es: +39 123 456 7890"
                      className="flex-1"
                    />
                    <Button
                      onClick={() => savePhoneMutation.mutate()}
                      disabled={savePhoneMutation.isPending || !phoneNumber}
                      className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/20"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {savePhoneMutation.isPending ? "Salvataggio..." : "Salva"}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog
        open={!!deletingRestaurant}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingRestaurant(null);
            setDeleteConfirmText("");
          }
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              Eliminare ristorante: {deletingRestaurant?.nome}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Questa azione è definitiva. Per confermare, digita esattamente il nome del ristorante.
            </p>
            <div className="space-y-2">
              <Label>Conferma nome</Label>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={deletingRestaurant?.nome || ""}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDeletingRestaurant(null);
                setDeleteConfirmText("");
              }}
            >
              Annulla
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={
                deleteRestaurantMutation.isPending ||
                normalizeDeleteConfirm(deleteConfirmText) !==
                  normalizeDeleteConfirm(deletingRestaurant?.nome)
              }
              onClick={confirmDeleteRestaurant}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {deleteRestaurantMutation.isPending ? "Eliminazione..." : "Elimina definitivamente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingRestaurant} onOpenChange={() => setEditingRestaurant(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              Gestione ristorante: {editingRestaurant?.nome}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ristorante attivo</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={subscriptionForm.attivo ? "default" : "outline"}
                    className={subscriptionForm.attivo ? "bg-green-600 hover:bg-green-700" : ""}
                    onClick={() => setSubscriptionForm((p) => ({ ...p, attivo: true }))}
                  >
                    Attivo
                  </Button>
                  <Button
                    type="button"
                    variant={!subscriptionForm.attivo ? "default" : "outline"}
                    className={!subscriptionForm.attivo ? "bg-red-600 hover:bg-red-700" : ""}
                    onClick={() => setSubscriptionForm((p) => ({ ...p, attivo: false }))}
                  >
                    Disattivo
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Abbonamento attivo</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={subscriptionForm.abbonamento_attivo ? "default" : "outline"}
                    className={subscriptionForm.abbonamento_attivo ? "bg-green-600 hover:bg-green-700" : ""}
                    onClick={() => setSubscriptionForm((p) => ({ ...p, abbonamento_attivo: true }))}
                  >
                    Attivo
                  </Button>
                  <Button
                    type="button"
                    variant={!subscriptionForm.abbonamento_attivo ? "default" : "outline"}
                    className={!subscriptionForm.abbonamento_attivo ? "bg-red-600 hover:bg-red-700" : ""}
                    onClick={() => setSubscriptionForm((p) => ({ ...p, abbonamento_attivo: false }))}
                  >
                    Non attivo
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Piano</Label>
                <Input
                  value={subscriptionForm.abbonamento_tipo}
                  onChange={(e) => setSubscriptionForm((p) => ({ ...p, abbonamento_tipo: e.target.value }))}
                  placeholder="free / basic / premium"
                />
              </div>
              <div className="space-y-2">
                <Label>Scadenza</Label>
                <Input
                  type="date"
                  value={subscriptionForm.abbonamento_scadenza || ''}
                  onChange={(e) => setSubscriptionForm((p) => ({ ...p, abbonamento_scadenza: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditingRestaurant(null)}>
              Chiudi
            </Button>
            <Button
              type="button"
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/20"
              disabled={updateRestaurantMutation.isPending}
              onClick={saveSubscription}
            >
              <Save className="w-4 h-4 mr-2" />
              {updateRestaurantMutation.isPending ? 'Salvataggio...' : 'Salva'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SupportRequestsSection({ supportRequests, restaurants }) {
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [adminNote, setAdminNote] = useState("");
  const queryClient = useQueryClient();

  const statusLabels = {
    aperta: "Nuova",
    in_lavorazione: "In Lavorazione",
    completata: "Completata"
  };

  const statusColors = {
    aperta: "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/30 dark:text-red-100 dark:border-red-900",
    in_lavorazione: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-100 dark:border-yellow-900",
    completata: "bg-green-100 text-green-800 border-green-200 dark:bg-green-950/30 dark:text-green-100 dark:border-green-900"
  };

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, stato }) => TechnicalSupport.update(id, { stato }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-support-requests'] });
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: ({ id, note_admin }) => TechnicalSupport.update(id, { note_admin }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-support-requests'] });
      setShowNoteDialog(false);
      setSelectedRequest(null);
      setAdminNote("");
    },
  });

  const handleAddNote = () => {
    if (!selectedRequest || !adminNote.trim()) return;
    updateNoteMutation.mutate({ id: selectedRequest.id, note_admin: adminNote });
  };

  const getRestaurantName = (restaurantId) => {
    const restaurant = restaurants.find(r => r.id === restaurantId);
    return restaurant?.nome || "N/A";
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Richieste di Assistenza Tecnica</CardTitle>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="bg-red-50 border border-red-200 dark:bg-red-950/30 dark:border-red-900 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">Nuove</p>
              <p className="text-3xl font-bold text-red-600">
                {supportRequests.filter(r => r.stato === "aperta").length}
              </p>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-900 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">In Lavorazione</p>
              <p className="text-3xl font-bold text-yellow-600">
                {supportRequests.filter(r => r.stato === "in_lavorazione").length}
              </p>
            </div>
            <div className="bg-green-50 border border-green-200 dark:bg-green-950/30 dark:border-green-900 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">Completate</p>
              <p className="text-3xl font-bold text-green-600">
                {supportRequests.filter(r => r.stato === "completata").length}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {supportRequests.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nessuna richiesta di assistenza</p>
          ) : (
            <div className="space-y-4">
              {supportRequests.map(request => (
                <Card key={request.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge className={`${statusColors[request.stato]} border font-semibold`}>
                            {statusLabels[request.stato]}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(request.created_date), "dd/MM/yyyy HH:mm", { locale: it })}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold mb-1">
                          {getRestaurantName(request.restaurant_id)}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          <strong>Contatto:</strong> {request.nome_contatto} • {request.email_contatto}
                          {request.telefono_contatto && ` • ${request.telefono_contatto}`}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <select
                          value={request.stato}
                          onChange={(e) => updateStatusMutation.mutate({ id: request.id, stato: e.target.value })}
                          className="border border-border bg-background text-foreground rounded px-3 py-2 text-sm"
                        >
                          <option value="aperta">Nuova</option>
                          <option value="in_lavorazione">In Lavorazione</option>
                          <option value="completata">Completata</option>
                        </select>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedRequest(request);
                            setAdminNote(request.note_admin || "");
                            setShowNoteDialog(true);
                          }}
                        >
                          <MessageSquare className="w-4 h-4 mr-1" />
                          Note
                        </Button>
                      </div>
                    </div>

                    <div className="bg-muted rounded-lg p-4 mb-3">
                      <p className="text-sm font-semibold text-foreground mb-2">Descrizione Problema:</p>
                      <p className="text-foreground">{request.descrizione}</p>
                      {request.disponibilita_oraria && (
                        <p className="text-sm text-muted-foreground mt-2">
                          <strong>Disponibilità:</strong> {request.disponibilita_oraria}
                        </p>
                      )}
                    </div>

                    {request.screenshot_urls && request.screenshot_urls.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm font-semibold text-foreground mb-2">Screenshot:</p>
                        <div className="flex gap-2 flex-wrap">
                          {request.screenshot_urls.map((url, idx) => (
                            <a
                              key={idx}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                            >
                              <Eye className="w-4 h-4" />
                              Screenshot {idx + 1}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {request.note_admin && (
                      <div className="bg-blue-50 border border-blue-200 dark:bg-blue-950/30 dark:border-blue-900 rounded-lg p-4">
                        <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">Note Admin:</p>
                        <p className="text-sm text-blue-800 dark:text-blue-100">{request.note_admin}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Note Interne Admin</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Aggiungi o modifica note per questa richiesta</Label>
              <Textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Note, stato avanzamento, informazioni interne..."
                rows={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNoteDialog(false)}>
              Annulla
            </Button>
            <Button
              onClick={handleAddNote}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/20"
              disabled={updateNoteMutation.isPending}
            >
              {updateNoteMutation.isPending ? "Salvataggio..." : "Salva Note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}