import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  X,
  Headphones,
  Eye,
  MessageSquare
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function MasterDashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  const { data: restaurants = [], isLoading } = useQuery({
    queryKey: ['all-restaurants'],
    queryFn: () => base44.entities.Restaurant.list("-created_date"),
    initialData: [],
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['all-orders'],
    queryFn: () => base44.entities.Order.list("-created_date", 1000),
    initialData: [],
  });

  const { data: supportRequests = [] } = useQuery({
    queryKey: ['all-support-requests'],
    queryFn: () => base44.entities.TechnicalSupport.list("-created_date"),
    initialData: [],
  });

  const filteredRestaurants = restaurants.filter(r =>
    r.nome?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.citta?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeSubscriptions = restaurants.filter(r => r.abbonamento_attivo).length;
  const expiringSoon = restaurants.filter(r => {
    if (!r.abbonamento_scadenza) return false;
    const daysUntilExpiry = Math.floor(
      (new Date(r.abbonamento_scadenza) - new Date()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiry <= 7 && daysUntilExpiry >= 0;
  }).length;

  const totalRevenue = orders.reduce((sum, o) => sum + (o.totale || 0), 0);

  const openSupportRequests = supportRequests.filter(r => r.stato === "aperta").length;
  const inProgressRequests = supportRequests.filter(r => r.stato === "in_lavorazione").length;

  const getRestaurantStats = (restaurantId) => {
    const restaurantOrders = orders.filter(o => o.restaurant_id === restaurantId);
    const last30Days = orders.filter(o => {
      const orderDate = new Date(o.created_date);
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
        const orderDate = new Date(o.created_date);
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
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Master</h1>
          <p className="text-gray-500 mt-1">Gestisci tutti i ristoranti della piattaforma</p>
        </div>

        <div className="flex gap-2 mb-6 bg-white p-2 rounded-lg shadow-sm">
          <Button
            variant={activeTab === "overview" ? "default" : "ghost"}
            onClick={() => setActiveTab("overview")}
            className={activeTab === "overview" ? "bg-red-600 hover:bg-red-700" : ""}
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Panoramica
          </Button>
          <Button
            variant={activeTab === "restaurants" ? "default" : "ghost"}
            onClick={() => setActiveTab("restaurants")}
            className={activeTab === "restaurants" ? "bg-red-600 hover:bg-red-700" : ""}
          >
            <Store className="w-4 h-4 mr-2" />
            Ristoranti
          </Button>
          <Button
            variant={activeTab === "support" ? "default" : "ghost"}
            onClick={() => setActiveTab("support")}
            className={activeTab === "support" ? "bg-red-600 hover:bg-red-700" : ""}
          >
            <Headphones className="w-4 h-4 mr-2" />
            Assistenza
            {openSupportRequests > 0 && (
              <Badge className="ml-2 bg-red-500">{openSupportRequests}</Badge>
            )}
          </Button>
        </div>

        {activeTab === "overview" && (
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Ristoranti Totali
              </CardTitle>
              <Store className="w-4 h-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{restaurants.length}</div>
              <p className="text-xs text-gray-500 mt-1">Registrati sulla piattaforma</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Abbonamenti Attivi
              </CardTitle>
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{activeSubscriptions}</div>
              <p className="text-xs text-gray-500 mt-1">In regola con i pagamenti</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                In Scadenza
              </CardTitle>
              <AlertCircle className="w-4 h-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">{expiringSoon}</div>
              <p className="text-xs text-gray-500 mt-1">Prossimi 7 giorni</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Fatturato Totale
              </CardTitle>
              <TrendingUp className="w-4 h-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                €{totalRevenue.toFixed(2)}
              </div>
              <p className="text-xs text-gray-500 mt-1">Volume ordini piattaforma</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Richieste Assistenza
              </CardTitle>
              <Headphones className="w-4 h-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">{openSupportRequests}</div>
              <p className="text-xs text-gray-500 mt-1">{inProgressRequests} in lavorazione</p>
            </CardContent>
          </Card>
        </div>
        </>
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
              {(() => {
                const stats = getRestaurantStats(selectedRestaurant.id);
                const chartData = getRestaurantChartData(selectedRestaurant.id);

                return (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600">Ordini Totali</p>
                        <p className="text-2xl font-bold text-blue-600">{stats.totalOrders}</p>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600">Incasso Totale</p>
                        <p className="text-2xl font-bold text-green-600">€{stats.totalRevenue.toFixed(2)}</p>
                      </div>
                      <div className="bg-purple-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600">Ultimi 30gg</p>
                        <p className="text-2xl font-bold text-purple-600">{stats.last30DaysOrders} ordini</p>
                      </div>
                      <div className="bg-amber-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600">Valore Medio</p>
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
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="Cerca ristorante per nome, città o email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoading ? (
                <p className="text-center text-gray-500 py-8">Caricamento...</p>
              ) : filteredRestaurants.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Nessun ristorante trovato</p>
              ) : (
                filteredRestaurants.map(restaurant => {
                  const stats = getRestaurantStats(restaurant.id);
                  const daysUntilExpiry = restaurant.abbonamento_scadenza
                    ? Math.floor((new Date(restaurant.abbonamento_scadenza) - new Date()) / (1000 * 60 * 60 * 24))
                    : null;

                  return (
                    <Card
                      key={restaurant.id}
                      className="hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => setSelectedRestaurant(restaurant)}
                    >
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
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
                                <p className="text-sm text-gray-500">
                                  {restaurant.citta} • {restaurant.tipo_cucina}
                                </p>
                              </div>
                            </div>

                            <div className="grid md:grid-cols-3 gap-2 text-sm text-gray-600 mt-3">
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
                            <Badge className={
                              restaurant.abbonamento_attivo
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }>
                              {restaurant.abbonamento_tipo || "free"} - {
                                restaurant.abbonamento_attivo ? "Attivo" : "Scaduto"
                              }
                            </Badge>

                            {restaurant.abbonamento_scadenza && (
                              <div className="text-sm text-gray-600 flex items-center gap-1">
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
                            <p className="text-sm text-gray-500">Ordini Totali</p>
                            <p className="text-xl font-bold text-blue-600">{stats.totalOrders}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-gray-500">Incasso</p>
                            <p className="text-xl font-bold text-green-600">€{stats.totalRevenue.toFixed(2)}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-gray-500">Ultimi 30gg</p>
                            <p className="text-xl font-bold text-purple-600">{stats.last30DaysOrders}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-gray-500">€ Medio</p>
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
      </div>
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
    aperta: "bg-red-100 text-red-800 border-red-200",
    in_lavorazione: "bg-yellow-100 text-yellow-800 border-yellow-200",
    completata: "bg-green-100 text-green-800 border-green-200"
  };

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, stato }) => base44.entities.TechnicalSupport.update(id, { stato }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-support-requests'] });
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: ({ id, note_admin }) => base44.entities.TechnicalSupport.update(id, { note_admin }),
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
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600">Nuove</p>
              <p className="text-3xl font-bold text-red-600">
                {supportRequests.filter(r => r.stato === "aperta").length}
              </p>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600">In Lavorazione</p>
              <p className="text-3xl font-bold text-yellow-600">
                {supportRequests.filter(r => r.stato === "in_lavorazione").length}
              </p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600">Completate</p>
              <p className="text-3xl font-bold text-green-600">
                {supportRequests.filter(r => r.stato === "completata").length}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {supportRequests.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Nessuna richiesta di assistenza</p>
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
                          <span className="text-sm text-gray-500">
                            {format(new Date(request.created_date), "dd/MM/yyyy HH:mm", { locale: it })}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold mb-1">
                          {getRestaurantName(request.restaurant_id)}
                        </h3>
                        <p className="text-sm text-gray-600">
                          <strong>Contatto:</strong> {request.nome_contatto} • {request.email_contatto}
                          {request.telefono_contatto && ` • ${request.telefono_contatto}`}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <select
                          value={request.stato}
                          onChange={(e) => updateStatusMutation.mutate({ id: request.id, stato: e.target.value })}
                          className="border border-gray-300 rounded px-3 py-2 text-sm"
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

                    <div className="bg-gray-50 rounded-lg p-4 mb-3">
                      <p className="text-sm font-semibold text-gray-700 mb-2">Descrizione Problema:</p>
                      <p className="text-gray-800">{request.descrizione}</p>
                      {request.disponibilita_oraria && (
                        <p className="text-sm text-gray-600 mt-2">
                          <strong>Disponibilità:</strong> {request.disponibilita_oraria}
                        </p>
                      )}
                    </div>

                    {request.screenshot_urls && request.screenshot_urls.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm font-semibold text-gray-700 mb-2">Screenshot:</p>
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
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm font-semibold text-blue-900 mb-1">Note Admin:</p>
                        <p className="text-sm text-blue-800">{request.note_admin}</p>
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
              className="bg-red-600 hover:bg-red-700"
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