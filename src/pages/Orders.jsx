import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search,
  Phone,
  MapPin,
  Clock,
  Package,
  Truck
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";



import OrderDetailsModal from "../components/orders/OrderDetailsModal";

const statusColors = {
  nuovo: "bg-yellow-100 text-yellow-800 border-yellow-200",
  confermato: "bg-blue-100 text-blue-800 border-blue-200",
  in_preparazione: "bg-purple-100 text-purple-800 border-purple-200",
  pronto: "bg-green-100 text-green-800 border-green-200",
  in_consegna: "bg-indigo-100 text-indigo-800 border-indigo-200",
  completato: "bg-gray-100 text-gray-800 border-gray-200",
  annullato: "bg-red-100 text-red-800 border-red-200"
};

const statusLabels = {
  nuovo: "Nuovo",
  confermato: "Confermato",
  in_preparazione: "In Preparazione",
  pronto: "Pronto",
  in_consegna: "In Consegna",
  completato: "Completato",
  annullato: "Annullato"
};

export default function Orders() {
  const [restaurant, setRestaurant] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("tutti");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [lastOrderCount, setLastOrderCount] = useState(0);
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders', restaurant?.id],
    queryFn: async () => {
      if (!restaurant) return [];
      return base44.entities.Order.filter(
        { restaurant_id: restaurant.id },
        "-created_date"
      );
    },
    enabled: !!restaurant,
    initialData: [],
  });

  const updateOrderMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Order.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  useEffect(() => {
    loadRestaurant();
  }, []);

  // Notifica sonora per nuovi ordini
  useEffect(() => {
    if (!restaurant) return;

    const unsubscribe = base44.entities.Order.subscribe((event) => {
      if (event.type === 'create' && event.data.restaurant_id === restaurant.id) {
        // Riproduce suono di notifica
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwPUKnk77ZkHQU7k9n0y3csBSF1yPDckUELFF+27OukVRULRp/h8r9vIQYshM/z2Io3CBxqvvHlnU8NEFCp5O+2ZB0FO5PZ9Mt3LAUgdcjw3JBBC');
        audio.volume = 0.7;
        audio.play().catch(e => console.log('Audio play failed:', e));

        // Mostra notifica browser se supportata
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Nuovo Ordine! 🍕', {
            body: `Ordine #${event.data.numero_ordine} da ${event.data.cliente_nome}`,
            icon: '/favicon.ico',
            tag: event.data.id
          });
        }

        // Aggiorna la lista ordini
        queryClient.invalidateQueries({ queryKey: ['orders'] });
      }
    });

    return unsubscribe;
  }, [restaurant, queryClient]);

  // Richiede permesso notifiche al primo caricamento
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
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

  const handleStatusChange = (order, newStatus) => {
    updateOrderMutation.mutate({
      id: order.id,
      data: { stato: newStatus }
    });
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.numero_ordine?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.cliente_nome?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.cliente_telefono?.includes(searchQuery);
    
    const matchesStatus = statusFilter === "tutti" || order.stato === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Gestione Ordini</h1>
            <p className="text-sm md:text-base text-gray-500 mt-1">Visualizza e gestisci tutti gli ordini</p>
          </div>

          <Card className="mb-4 md:mb-6">
            <CardContent className="p-4 md:p-6">
              <div className="flex flex-col gap-3 md:gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 md:w-5 md:h-5" />
                    <Input
                      placeholder="Cerca ordine..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 md:pl-10 text-sm md:text-base"
                    />
                  </div>
                </div>
                <div className="w-full md:w-48">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="text-sm md:text-base">
                      <SelectValue placeholder="Filtra per stato" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tutti">Tutti gli stati</SelectItem>
                      <SelectItem value="nuovo">Nuovo</SelectItem>
                      <SelectItem value="confermato">Confermato</SelectItem>
                      <SelectItem value="in_preparazione">In Preparazione</SelectItem>
                      <SelectItem value="pronto">Pronto</SelectItem>
                      <SelectItem value="in_consegna">In Consegna</SelectItem>
                      <SelectItem value="completato">Completato</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-3 md:gap-4">
            {isLoading ? (
              <Card>
                <CardContent className="p-6 md:p-8 text-center">
                  <p className="text-sm md:text-base text-gray-500">Caricamento ordini...</p>
                </CardContent>
              </Card>
            ) : filteredOrders.length === 0 ? (
              <Card>
                <CardContent className="p-6 md:p-8 text-center">
                  <Package className="w-10 h-10 md:w-12 md:h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-sm md:text-base text-gray-500">Nessun ordine trovato</p>
                </CardContent>
              </Card>
            ) : (
              filteredOrders.map((order) => (
                <Card key={order.id} className="hover:shadow-lg transition-shadow duration-200 cursor-pointer"
                  onClick={() => setSelectedOrder(order)}>
                  <CardContent className="p-4 md:p-6">
                    <div className="flex flex-col gap-3 md:gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <h3 className="text-base md:text-lg font-bold text-gray-900">
                            #{order.numero_ordine}
                          </h3>
                          <Badge className={`${statusColors[order.stato]} border text-xs md:text-sm`}>
                            {statusLabels[order.stato]}
                          </Badge>
                          {order.tipo_consegna === "consegna" ? (
                            <Badge variant="outline" className="flex items-center gap-1 text-xs md:text-sm">
                              <Truck className="w-3 h-3" />
                              Consegna
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="flex items-center gap-1 text-xs md:text-sm">
                              <Package className="w-3 h-3" />
                              Asporto
                            </Badge>
                          )}
                        </div>
                        
                        <div className="grid gap-2 text-xs md:text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Phone className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                            <span className="font-medium truncate">{order.cliente_nome}</span>
                            <span className="text-gray-400">•</span>
                            <span className="truncate">{order.cliente_telefono}</span>
                          </div>
                          {order.tipo_consegna === "consegna" && order.cliente_indirizzo && (
                            <div className="flex items-start gap-2">
                              <MapPin className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0 mt-0.5" />
                              <span className="line-clamp-1">{order.cliente_indirizzo}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <Clock className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                            <span>
                              {format(new Date(order.created_date), "d MMM yyyy, HH:mm", { locale: it })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t">
                        <div className="text-left sm:text-right">
                          <p className="text-xl md:text-2xl font-bold text-red-600">
                            €{order.totale.toFixed(2)}
                          </p>
                          <p className="text-xs md:text-sm text-gray-500">
                            {order.items?.length || 0} prodotti
                          </p>
                        </div>

                        <Select 
                          value={order.stato} 
                          onValueChange={(value) => handleStatusChange(order, value)}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <SelectTrigger className="w-full sm:w-40 text-xs md:text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="nuovo">Nuovo</SelectItem>
                            <SelectItem value="confermato">Confermato</SelectItem>
                            <SelectItem value="in_preparazione">In Preparazione</SelectItem>
                            <SelectItem value="pronto">Pronto</SelectItem>
                            <SelectItem value="in_consegna">In Consegna</SelectItem>
                            <SelectItem value="completato">Completato</SelectItem>
                            <SelectItem value="annullato">Annullato</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>

      <OrderDetailsModal 
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}