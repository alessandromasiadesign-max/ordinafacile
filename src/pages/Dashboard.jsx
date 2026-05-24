import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from '@/api/supabaseClient';
import { Restaurant, Order, Category, MenuItem } from '@/api/entities';
import { createPageUrl } from "@/utils";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ShoppingBag,
  TrendingUp,
  Euro,
  Clock,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

import StatsCard from "../components/dashboard/StatsCard";
import RecentOrders from "../components/dashboard/RecentOrders";
import OrdersChart from "../components/dashboard/OrdersChart";
import QRCodeGenerator from "../components/dashboard/QRCodeGenerator";

export default function Dashboard() {
  const [restaurant, setRestaurant] = useState(null);
  const navigate = useNavigate();

  const getTodaySchedule = (rest) => {
    const schedule = rest?.orari_apertura;
    if (!schedule || typeof schedule !== 'object') return "";

    const dayKey = (() => {
      // JS: 0=Sunday..6=Saturday
      const d = new Date().getDay();
      if (d === 0) return 'domenica';
      if (d === 1) return 'lunedi';
      if (d === 2) return 'martedi';
      if (d === 3) return 'mercoledi';
      if (d === 4) return 'giovedi';
      if (d === 5) return 'venerdi';
      return 'sabato';
    })();

    return String(schedule?.[dayKey] ?? '').trim();
  };

  const parseTimeToMinutes = (hhmm) => {
    const m = String(hhmm ?? '').trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    const h = Number(m[1]);
    const mm = Number(m[2]);
    if (!Number.isFinite(h) || !Number.isFinite(mm)) return null;
    if (h < 0 || h > 23 || mm < 0 || mm > 59) return null;
    return h * 60 + mm;
  };

  const getCurrentShiftRange = (scheduleStr, now = new Date()) => {
    const raw = String(scheduleStr ?? '').trim();
    if (!raw) return null;

    // Accept formats like:
    // "12:00-15:00"
    // "12:00-15:00, 19:00-23:00"
    // "12:00-15:00;19:00-23:00"
    const ranges = raw
      .split(/[,;]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((r) => {
        const parts = r.split('-').map((p) => p.trim());
        if (parts.length !== 2) return null;
        const startMin = parseTimeToMinutes(parts[0]);
        const endMin = parseTimeToMinutes(parts[1]);
        if (startMin == null || endMin == null) return null;
        return { startMin, endMin };
      })
      .filter(Boolean);

    if (ranges.length === 0) return null;

    const nowMin = now.getHours() * 60 + now.getMinutes();
    const baseDay = new Date(now);
    baseDay.setSeconds(0, 0);

    // 1) Prefer the shift that contains "now".
    for (const r of ranges) {
      const crossesMidnight = r.endMin < r.startMin;
      const inRange = crossesMidnight
        ? (nowMin >= r.startMin || nowMin <= r.endMin)
        : (nowMin >= r.startMin && nowMin <= r.endMin);

      if (!inRange) continue;

      const start = new Date(baseDay);
      start.setHours(0, 0, 0, 0);
      start.setMinutes(r.startMin);

      const end = new Date(baseDay);
      end.setHours(0, 0, 0, 0);
      end.setMinutes(r.endMin);
      if (crossesMidnight) {
        // End is next day
        end.setDate(end.getDate() + 1);
      }

      // If shift crosses midnight and we are after midnight (early hours), start is previous day
      if (crossesMidnight && nowMin <= r.endMin) {
        start.setDate(start.getDate() - 1);
      }

      return { start, end };
    }

    // 2) If not currently in a shift, return the most recent started shift (today) if any.
    const started = ranges
      .map((r) => {
        const crossesMidnight = r.endMin < r.startMin;
        // For "recent" we consider only non-crossing shifts or the part before midnight.
        const effectiveStartMin = r.startMin;
        return { ...r, crossesMidnight, effectiveStartMin };
      })
      .filter((r) => nowMin >= r.effectiveStartMin)
      .sort((a, b) => b.effectiveStartMin - a.effectiveStartMin);

    if (started.length === 0) return null;

    const r = started[0];
    const start = new Date(baseDay);
    start.setHours(0, 0, 0, 0);
    start.setMinutes(r.startMin);
    const end = new Date(baseDay);
    end.setHours(0, 0, 0, 0);
    end.setMinutes(r.endMin);
    if (r.crossesMidnight) end.setDate(end.getDate() + 1);
    return { start, end };
  };

  const normalizeOrder = (o) => {
    const toItStatus = (raw) => {
      if (raw === 'pending') return 'nuovo';
      if (raw === 'confirmed') return 'confermato';
      if (raw === 'preparing') return 'in_preparazione';
      if (raw === 'ready') return 'pronto';
      if (raw === 'delivered') return 'completato';
      if (raw === 'cancelled') return 'annullato';
      return raw;
    };

    const toDbStatus = (raw) => {
      if (raw === 'nuovo') return 'pending';
      if (raw === 'confermato') return 'confirmed';
      if (raw === 'in_preparazione') return 'preparing';
      if (raw === 'pronto') return 'ready';
      if (raw === 'in_consegna') return 'delivered';
      if (raw === 'completato') return 'delivered';
      if (raw === 'annullato') return 'cancelled';
      return raw;
    };

    const rawDbStatus = o?.status;
    const rawItStatus = o?.stato;
    const stato = rawItStatus || toItStatus(rawDbStatus);
    const status = rawDbStatus || toDbStatus(rawItStatus);

    const toItDelivery = (raw) => {
      if (raw === 'delivery') return 'consegna';
      if (raw === 'pickup') return 'asporto';
      if (raw === 'table') return 'tavolo';
      return raw;
    };

    const toDbDelivery = (raw) => {
      if (raw === 'consegna') return 'delivery';
      if (raw === 'asporto') return 'pickup';
      if (raw === 'tavolo') return 'table';
      return raw;
    };

    const rawDbDelivery = o?.delivery_type;
    const rawItDelivery = o?.tipo_consegna;
    const tipo_consegna = rawItDelivery || toItDelivery(rawDbDelivery);
    const delivery_type = rawDbDelivery || toDbDelivery(rawItDelivery);

    const total = Number(o?.total ?? o?.totale ?? 0);
    const created = o?.created_at || o?.created_date;

    return {
      ...o,
      numero_ordine: o?.numero_ordine ?? o?.order_number,
      cliente_nome: o?.cliente_nome ?? o?.customer_name,
      cliente_telefono: o?.cliente_telefono ?? o?.customer_phone,
      stato,
      status,
      tipo_consegna,
      delivery_type,
      totale: total,
      total,
      created_date: created,
      items: Array.isArray(o?.items) ? o.items : [],
    };
  };

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders', restaurant?.id],
    queryFn: async () => {
      if (!restaurant) return [];
      const rows = await Order.filter({ restaurant_id: restaurant.id }, "-created_at", 100);
      return (rows || []).map(normalizeOrder);
    },
    enabled: !!restaurant,
    initialData: [],
    refetchOnWindowFocus: true,
    refetchInterval: () => {
      if (!restaurant?.id) return false;
      if (typeof document === 'undefined') return false;
      return document.visibilityState === 'visible' ? 10000 : false;
    },
  });

  const { data: menuCategories = [] } = useQuery({
    queryKey: ['dashboard-menu-categories', restaurant?.id],
    queryFn: async () => {
      if (!restaurant?.id) return [];
      return Category.filter({ restaurant_id: restaurant.id, event_id: null }, 'ordine');
    },
    enabled: !!restaurant?.id,
    initialData: [],
  });

  const { data: menuItems = [] } = useQuery({
    queryKey: ['dashboard-menu-items', restaurant?.id],
    queryFn: async () => {
      if (!restaurant?.id) return [];
      return MenuItem.filter({ restaurant_id: restaurant.id });
    },
    enabled: !!restaurant?.id,
    initialData: [],
  });

  useEffect(() => {
    loadRestaurant();
  }, []);

  const loadRestaurant = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
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

  const todayOrders = orders.filter(o => {
    const createdAt = o?.created_date || o?.created_at;
    if (!createdAt) return false;
    const orderDate = new Date(createdAt);
    if (Number.isNaN(orderDate.getTime())) return false;
    const today = new Date();
    return orderDate.toDateString() === today.toDateString();
  });

  const todayScheduleStr = restaurant ? getTodaySchedule(restaurant) : "";

  const currentShiftRange = restaurant
    ? getCurrentShiftRange(todayScheduleStr, new Date())
    : null;

  const shiftIndicatorText = (() => {
    if (!restaurant) return "";
    if (!todayScheduleStr) return "Turno attuale: orari non configurati";
    if (!currentShiftRange) return `Turno attuale: fuori turno (oggi: ${todayScheduleStr})`;
    return `Turno attuale: ${format(currentShiftRange.start, "HH:mm", { locale: it })}–${format(currentShiftRange.end, "HH:mm", { locale: it })}`;
  })();

  const shiftOrders = orders.filter((o) => {
    if (!currentShiftRange) return false;
    const createdAt = o?.created_date || o?.created_at;
    if (!createdAt) return false;
    const orderDate = new Date(createdAt);
    if (Number.isNaN(orderDate.getTime())) return false;
    return orderDate >= currentShiftRange.start && orderDate <= currentShiftRange.end;
  });

  const visibleOrders = currentShiftRange ? shiftOrders : todayOrders;

  const todayRevenue = visibleOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const pendingOrders = visibleOrders.filter(o => o.status === "pending" || o.status === "confirmed");
  const avgOrderValue = visibleOrders.length > 0
    ? visibleOrders.reduce((sum, o) => sum + (o.total || 0), 0) / visibleOrders.length
    : 0;

  if (!restaurant) {
    return (
      <div className="p-4 md:p-8">
        <Card>
          <CardContent className="p-8 md:p-12 text-center">
            <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl md:text-2xl font-bold mb-2">Configura il tuo Ristorante</h2>
            <p className="text-sm md:text-base text-muted-foreground mb-4">
              Per iniziare, vai su Impostazioni e completa i dati del tuo ristorante.
            </p>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 py-2 bg-foreground text-background hover:bg-foreground/90"
              onClick={() => navigate(createPageUrl("Settings"))}
            >
              Vai a Impostazioni
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">
              {format(new Date(), "EEEE, d MMMM yyyy", { locale: it })}
            </p>
            {shiftIndicatorText ? (
              <p className="text-xs md:text-sm text-muted-foreground mt-1">
                {shiftIndicatorText}
              </p>
            ) : null}
          </div>

          {(menuCategories.length === 0 || menuItems.length === 0) && (
            <Card className="mb-4 md:mb-6 border-yellow-200 bg-yellow-50">
              <CardContent className="p-4 md:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="font-semibold">Completa il menu</div>
                    <div className="text-sm text-muted-foreground">
                      Per pubblicare e ricevere ordini, aggiungi almeno una categoria e un prodotto.
                    </div>
                  </div>
                  <Button
                    type="button"
                    className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
                    onClick={() => navigate(`${createPageUrl('MenuManagement')}?onboarding=1`)}
                  >
                    Vai a Gestione Menu
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
            <StatsCard
              title="Ordini Oggi"
              value={visibleOrders.length}
              icon={ShoppingBag}
              bgColor="bg-blue-500"
              trend={`${visibleOrders.length} ordini`}
              onClick={() => navigate('/Orders')}
            />
            <StatsCard
              title="Incasso Oggi"
              value={`€${todayRevenue.toFixed(2)}`}
              icon={Euro}
              bgColor="bg-green-500"
              trend="Totale giornaliero"
              onClick={() => navigate('/Orders')}
            />
            <StatsCard
              title="In Attesa"
              value={pendingOrders.length}
              icon={Clock}
              bgColor="bg-yellow-500"
              trend="Da evadere"
              onClick={() => navigate('/Orders?status=in_attesa')}
            />
            <StatsCard
              title="Scontrino Medio"
              value={`€${avgOrderValue.toFixed(2)}`}
              icon={TrendingUp}
              bgColor="bg-purple-500"
              trend="Media ordini"
              onClick={() => navigate('/Orders')}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            <div className="lg:col-span-2">
              <RecentOrders orders={visibleOrders.slice(0, 10)} isLoading={isLoading} />
            </div>

            <div className="space-y-4 md:space-y-6">
              <QRCodeGenerator restaurant={restaurant} />

              <div className="hidden md:block">
                <OrdersChart orders={visibleOrders} />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base md:text-lg">Quick Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 md:space-y-4">
                  <div className="flex justify-between items-center text-sm md:text-base">
                    <span className="text-muted-foreground">Totale Ordini</span>
                    <span className="font-bold">{visibleOrders.length}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm md:text-base">
                    <span className="text-muted-foreground">Completati</span>
                    <span className="font-bold text-green-600">
                      {visibleOrders.filter(o => o.status === "delivered").length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm md:text-base">
                    <span className="text-muted-foreground">In Consegna</span>
                    <span className="font-bold text-blue-600">
                      {visibleOrders.filter(o => o.delivery_type === "delivery").length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm md:text-base">
                    <span className="text-muted-foreground">Asporto</span>
                    <span className="font-bold text-purple-600">
                      {visibleOrders.filter(o => o.delivery_type === "pickup").length}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="md:hidden mt-6">
            <OrdersChart orders={visibleOrders} />
          </div>
        </div>
      </div>
    </div>
  );
}
