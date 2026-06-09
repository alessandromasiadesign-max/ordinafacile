import React, { useState, useEffect } from "react";
import { Restaurant, Order } from '@/api/entities';
import { supabase } from '@/api/supabaseClient';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  Search,
  Phone,
  MapPin,
  Clock,
  Package,
  Truck,
  LayoutList,
  Columns3,
  CheckCircle2,
  ChefHat,
  Flag,
  XCircle
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
  nuovo: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-100 dark:border-yellow-900/40",
  confermato: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/30 dark:text-blue-100 dark:border-blue-900/40",
  in_preparazione: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/30 dark:text-purple-100 dark:border-purple-900/40",
  pronto: "bg-green-100 text-green-800 border-green-200 dark:bg-green-950/30 dark:text-green-100 dark:border-green-900/40",
  in_consegna: "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-100 dark:border-indigo-900/40",
  completato: "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-900/40 dark:text-slate-100 dark:border-slate-700/50",
  annullato: "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/30 dark:text-red-100 dark:border-red-900/40"
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
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem("orders_view_mode") || "list";
    } catch {
      return "list";
    }
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const safeFormatDate = (value) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return format(d, "d MMM yyyy, HH:mm", { locale: it });
  };

  const normalizeOrder = (o) => {
    const statoIt = (() => {
      const raw = o?.stato ?? o?.status;
      if (raw === 'pending') return 'nuovo';
      if (raw === 'confirmed') return 'confermato';
      if (raw === 'preparing') return 'in_preparazione';
      if (raw === 'ready') return 'pronto';
      if (raw === 'delivered') return 'completato';
      if (raw === 'cancelled') return 'annullato';
      return raw;
    })();

    const tipoConsegnaIt = (() => {
      const raw = o?.tipo_consegna ?? o?.delivery_type;
      if (raw === 'delivery') return 'consegna';
      if (raw === 'pickup') return 'asporto';
      if (raw === 'table') return 'tavolo';
      return raw;
    })();

    return {
      ...o,
      numero_ordine: o?.numero_ordine ?? o?.order_number,
      cliente_nome: o?.cliente_nome ?? o?.customer_name,
      cliente_telefono: o?.cliente_telefono ?? o?.customer_phone,
      cliente_indirizzo: o?.cliente_indirizzo ?? o?.customer_address ?? "",
      note: o?.note ?? o?.customer_notes,
      tipo_consegna: tipoConsegnaIt,
      stato: statoIt,
      totale: Number(o?.totale ?? o?.total ?? 0),
      created_date: o?.created_date ?? o?.created_at,
    };
  };

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders', restaurant?.id],
    queryFn: async () => {
      if (!restaurant) return [];
      const rows = await Order.filter(
        { restaurant_id: restaurant.id },
        "-created_date"
      );

      const normalized = (rows || []).map(normalizeOrder);
      const orderIds = normalized.map((o) => o.id).filter(Boolean);
      if (orderIds.length === 0) return normalized;

      const { data: orderItems, error } = await supabase
        .from('order_items')
        .select('order_id')
        .in('order_id', orderIds);
      if (error) throw error;

      const countByOrderId = (orderItems || []).reduce((acc, row) => {
        acc[row.order_id] = (acc[row.order_id] || 0) + 1;
        return acc;
      }, {});

      return normalized.map((o) => ({
        ...o,
        items_count: countByOrderId[o.id] || 0,
      }));
    },
    enabled: !!restaurant,
    initialData: [],
    refetchOnWindowFocus: true,
    refetchInterval: () => {
      if (!restaurant?.id) return false;
      if (typeof document === "undefined") return false;
      return document.visibilityState === "visible" ? 10000 : false;
    },
  });

  const updateOrderMutation = useMutation({
    mutationFn: ({ id, data }) => Order.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const ordersRef = React.useRef([]);
  React.useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  useEffect(() => {
    loadRestaurant();
  }, []);

  // Notifica sonora per nuovi ordini
  useEffect(() => {
    if (!restaurant) return;

    const channel = supabase
      .channel(`orders-insert-${restaurant.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurant.id}`,
        },
        (payload) => {
          const row = payload?.new;
          if (!row) return;

          toast({
            title: "Nuovo ordine",
            description: `Ordine #${row.numero_ordine ?? row.order_number ?? ""}`,
          });

          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwPUKnk77ZkHQU7k9n0y3csBSF1yPDckUELFF+27OukVRULRp/h8r9vIQYshM/z2Io3CBxqvvHlnU8NEFCp5O+2ZB0FO5PZ9Mt3LAUgdcjw3JBBC');
          audio.volume = 0.7;
          audio.play().catch(e => console.log('Audio play failed:', e));

          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Nuovo Ordine!', {
              body: `Ordine #${row.numero_ordine ?? row.order_number ?? ''}`,
              icon: '/favicon.ico',
              tag: row.id,
            });
          }

          queryClient.invalidateQueries({ queryKey: ['orders'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurant, queryClient]);

  // Richiede permesso notifiche al primo caricamento
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("orders_view_mode", viewMode);
    } catch {
    }
  }, [viewMode]);

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

  const loadOrderItemsForOrder = async (orderId) => {
    const { data, error } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });
    if (error) throw error;

    return (data || []).map((row) => ({
      menu_item_id: row.menu_item_id,
      nome: row.name,
      quantita: row.quantity,
      prezzo_unitario: Number(row.price ?? 0),
      modificatori: Array.isArray(row.modifiers) ? row.modifiers : [],
      note: row.notes || "",
    }));
  };

  const handleStatusChange = (order, newStatus, options = {}) => {
    const { enableUndo = true } = options;

    const dbStatus = (() => {
      if (newStatus === 'nuovo') return 'pending';
      if (newStatus === 'confermato') return 'confirmed';
      if (newStatus === 'in_preparazione') return 'preparing';
      if (newStatus === 'pronto') return 'ready';
      if (newStatus === 'in_consegna') return 'delivered';
      if (newStatus === 'completato') return 'delivered';
      if (newStatus === 'annullato') return 'cancelled';
      return newStatus;
    })();

    const prevStatus = String(order?.stato ?? '').toLowerCase();
    const prevDbStatus = (() => {
      if (prevStatus === 'nuovo') return 'pending';
      if (prevStatus === 'confermato') return 'confirmed';
      if (prevStatus === 'in_preparazione') return 'preparing';
      if (prevStatus === 'pronto') return 'ready';
      if (prevStatus === 'in_consegna') return 'delivered';
      if (prevStatus === 'completato') return 'delivered';
      if (prevStatus === 'annullato') return 'cancelled';
      return prevStatus;
    })();

    const toastTitle = newStatus === 'annullato'
      ? 'Ordine annullato'
      : 'Stato aggiornato';
    const toastDescription = `Ordine #${order?.numero_ordine ?? ''}`;

    updateOrderMutation.mutate(
      {
        id: order.id,
        data: { status: dbStatus, stato: newStatus },
      },
      {
        onMutate: async () => {
          await queryClient.cancelQueries({ queryKey: ['orders'] });
          const previousOrders = queryClient.getQueryData(['orders', restaurant?.id]);

          queryClient.setQueryData(['orders', restaurant?.id], (old) => {
            if (!Array.isArray(old)) return old;
            return old.map((o) => (o?.id === order.id ? { ...o, stato: newStatus } : o));
          });

          if (enableUndo && prevStatus && prevStatus !== newStatus) {
            toast({
              title: toastTitle,
              description: toastDescription,
              duration: 5000,
              action: {
                label: 'Annulla',
                onClick: () => {
                  const current = (ordersRef.current || []).find((o) => o?.id === order.id);
                  const currentStatus = String(current?.stato ?? '').toLowerCase();
                  if (currentStatus !== newStatus) return;

                  updateOrderMutation.mutate({
                    id: order.id,
                    data: { status: prevDbStatus, stato: prevStatus },
                  }, {
                    onMutate: async () => {
                      await queryClient.cancelQueries({ queryKey: ['orders'] });
                      queryClient.setQueryData(['orders', restaurant?.id], (old) => {
                        if (!Array.isArray(old)) return old;
                        return old.map((o) => (o?.id === order.id ? { ...o, stato: prevStatus } : o));
                      });
                    },
                    onSettled: () => {
                      queryClient.invalidateQueries({ queryKey: ['orders'] });
                    },
                  });
                },
              },
            });
          }

          return { previousOrders };
        },
        onError: (error, _vars, context) => {
          console.error('Errore aggiornamento ordine:', error);
          if (context?.previousOrders !== undefined) {
            queryClient.setQueryData(['orders', restaurant?.id], context.previousOrders);
          }
          toast({
            title: 'Errore',
            description: error?.message || 'Impossibile aggiornare lo stato',
            type: 'error',
          });
        },
        onSettled: () => {
          queryClient.invalidateQueries({ queryKey: ['orders'] });
        },
      }
    );
  };

  const openOrderDetails = async (order) => {
    try {
      const items = await loadOrderItemsForOrder(order.id);
      setSelectedOrder({ ...order, items });
    } catch (e) {
      console.error("Errore caricamento items ordine:", e);
      setSelectedOrder(order);
    }
  };

  const confirmCancelOrder = (order) => {
    const orderNumber = order?.numero_ordine ?? "";
    return window.confirm(`Annullare l’ordine #${orderNumber}?`);
  };

  const quickAction = (order, nextStatus) => {
    if (nextStatus === "annullato" && !confirmCancelOrder(order)) return;
    handleStatusChange(order, nextStatus, { enableUndo: true });
  };

  const kanbanColumns = React.useMemo(() => {
    return [
      { key: "nuovo", title: "Nuovi", statuses: ["nuovo"] },
      { key: "confermato", title: "Confermati", statuses: ["confermato"] },
      { key: "in_preparazione", title: "In preparazione", statuses: ["in_preparazione"] },
      { key: "pronto", title: "Pronti", statuses: ["pronto"] },
      { key: "completato", title: "Completati", statuses: ["in_consegna", "completato"] },
      { key: "annullato", title: "Annullati", statuses: ["annullato"] },
    ];
  }, []);

  const getPrimaryActionForOrder = (order) => {
    const status = String(order?.stato ?? "").toLowerCase();
    if (status === "nuovo") return { label: "Accetta", next: "confermato", icon: CheckCircle2 };
    if (status === "confermato") return { label: "In prep", next: "in_preparazione", icon: ChefHat };
    if (status === "in_preparazione") return { label: "Pronto", next: "pronto", icon: Flag };
    if (status === "pronto") return { label: "Completa", next: "completato", icon: CheckCircle2 };
    return null;
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      String(order.numero_ordine ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(order.cliente_nome ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(order.cliente_telefono ?? '').includes(searchQuery);

    const matchesStatus = statusFilter === "tutti" || order.stato === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const kanbanOrdersByColumn = React.useMemo(() => {
    const out = {};
    kanbanColumns.forEach((c) => { out[c.key] = []; });
    for (const o of filteredOrders) {
      const status = String(o?.stato ?? "").toLowerCase();
      const col = kanbanColumns.find((c) => c.statuses.includes(status));
      if (!col) continue;
      out[col.key].push(o);
    }
    return out;
  }, [filteredOrders, kanbanColumns]);

  return (
    <div className="min-h-screen bg-background text-foreground">

      <div className="p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold">Gestione Ordini</h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">Visualizza e gestisci tutti gli ordini</p>
          </div>

          <Card className="mb-4 md:mb-6">
            <CardContent className="p-4 md:p-6">
              <div className="flex flex-col gap-3 md:gap-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm text-muted-foreground">{filteredOrders.length} ordini</div>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant={viewMode === "list" ? "default" : "outline"} size="sm" onClick={() => setViewMode("list")} className="h-9 md:h-10">
                      <LayoutList className="w-4 h-4 mr-2" />
                      Lista
                    </Button>
                    <Button type="button" variant={viewMode === "kanban" ? "default" : "outline"} size="sm" onClick={() => setViewMode("kanban")} className="h-9 md:h-10">
                      <Columns3 className="w-4 h-4 mr-2" />
                      Kanban
                    </Button>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 md:w-5 md:h-5" />
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
                      <SelectItem value="annullato">Annullato</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {viewMode === "kanban" && (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {kanbanColumns.map((col) => {
                const list = kanbanOrdersByColumn[col.key] || [];
                return (
                  <div key={col.key} className="w-[320px] shrink-0 rounded-lg border border-border bg-background/60">
                    <div className="px-3 py-2 border-b border-border flex items-center justify-between">
                      <div className="font-semibold text-sm">{col.title}</div>
                      <Badge variant="outline" className="text-xs">{list.length}</Badge>
                    </div>
                    <div className="p-3 space-y-3 max-h-[70vh] overflow-auto">
                      {list.map((order) => {
                        const primary = getPrimaryActionForOrder(order);
                        const PrimaryIcon = primary?.icon;
                        const status = String(order?.stato ?? "").toLowerCase();
                        const canCancel = status !== "annullato" && status !== "completato";

                        return (
                          <Card key={order.id} className="hover:shadow-lg transition-shadow duration-200 cursor-pointer" onClick={() => openOrderDetails(order)}>
                            <CardContent className="p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="font-bold text-sm truncate">#{order.numero_ordine}</div>
                                  <div className="text-xs text-muted-foreground truncate">
                                    {order.cliente_nome}{order.cliente_telefono ? ` • ${order.cliente_telefono}` : ""}
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-1">{safeFormatDate(order.created_date)}</div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <div className="font-bold text-sm text-red-600">{Number(order.totale ?? 0).toFixed(2)}</div>
                                  <div className="text-xs text-muted-foreground">{order.items_count ?? (order.items?.length || 0)} prod.</div>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 mt-3">
                                <Badge className={`${statusColors[order.stato]} border text-[11px]`}>{statusLabels[order.stato]}</Badge>
                                {order.tipo_consegna === "consegna" ? (
                                  <Badge variant="outline" className="flex items-center gap-1 text-[11px]">
                                    <Truck className="w-3 h-3" />
                                    Consegna
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="flex items-center gap-1 text-[11px]">
                                    <Package className="w-3 h-3" />
                                    Asporto
                                  </Badge>
                                )}
                              </div>

                              <div className="flex items-center gap-2 mt-3">
                                {primary && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    className="h-9 md:h-10"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      quickAction(order, primary.next);
                                    }}
                                  >
                                    {PrimaryIcon ? <PrimaryIcon className="w-4 h-4 mr-2" /> : null}
                                    {primary.label}
                                  </Button>
                                )}
                                {canCancel && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-9 md:h-10"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      quickAction(order, "annullato");
                                    }}
                                  >
                                    <XCircle className="w-4 h-4 mr-2" />
                                    Annulla
                                  </Button>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {viewMode !== "kanban" && (
          <div className="grid gap-3 md:gap-4 md:grid-cols-2">
            {isLoading ? (
              <Card>
                <CardContent className="p-6 md:p-8 text-center">
                  <p className="text-sm md:text-base text-muted-foreground">Caricamento ordini...</p>
                </CardContent>
              </Card>
            ) : filteredOrders.length === 0 ? (
              <Card>
                <CardContent className="p-6 md:p-8 text-center">
                  <Package className="w-10 h-10 md:w-12 md:h-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-sm md:text-base text-muted-foreground">Nessun ordine trovato</p>
                </CardContent>
              </Card>
            ) : (
              filteredOrders.map((order) => (
                <Card key={order.id} className="hover:shadow-lg transition-shadow duration-200 cursor-pointer"
                  onClick={() => openOrderDetails(order)}>
                  <CardContent className="p-4 md:p-6">
                    <div className="flex flex-col gap-3 md:gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <h3 className="text-base md:text-lg font-bold">
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
                        
                        <div className="grid gap-2 text-xs md:text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Phone className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                            <span className="font-medium truncate">{order.cliente_nome}</span>
                            <span className="text-muted-foreground/60">•</span>
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
                              {safeFormatDate(order.created_date)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-border">
                        <div className="text-left sm:text-right">
                          <p className="text-xl md:text-2xl font-bold text-red-600">
                            €{Number(order.totale ?? 0).toFixed(2)}
                          </p>
                          <p className="text-xs md:text-sm text-muted-foreground">
                            {order.items_count ?? (order.items?.length || 0)} prodotti
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
          )}
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