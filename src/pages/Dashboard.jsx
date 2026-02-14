import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders', restaurant?.id],
    queryFn: async () => {
      if (!restaurant) return [];
      return base44.entities.Order.filter(
        { restaurant_id: restaurant.id },
        "-created_date",
        100
      );
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

  const todayOrders = orders.filter(o => {
    const orderDate = new Date(o.created_date);
    const today = new Date();
    return orderDate.toDateString() === today.toDateString();
  });

  const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.totale || 0), 0);
  const pendingOrders = orders.filter(o => o.stato === "nuovo" || o.stato === "confermato");
  const avgOrderValue = orders.length > 0 ? orders.reduce((sum, o) => sum + o.totale, 0) / orders.length : 0;

  if (!restaurant) {
    return (
      <div className="p-4 md:p-8">
        <Card>
          <CardContent className="p-8 md:p-12 text-center">
            <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl md:text-2xl font-bold mb-2">Configura il tuo Ristorante</h2>
            <p className="text-sm md:text-base text-gray-600 mb-4">
              Per iniziare, vai su Impostazioni e completa i dati del tuo ristorante.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm md:text-base text-gray-500 mt-1">
              {format(new Date(), "EEEE, d MMMM yyyy", { locale: it })}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
            <StatsCard
              title="Ordini Oggi"
              value={todayOrders.length}
              icon={ShoppingBag}
              bgColor="bg-blue-500"
              trend={`${todayOrders.length} ordini`}
            />
            <StatsCard
              title="Incasso Oggi"
              value={`€${todayRevenue.toFixed(2)}`}
              icon={Euro}
              bgColor="bg-green-500"
              trend="Totale giornaliero"
            />
            <StatsCard
              title="In Attesa"
              value={pendingOrders.length}
              icon={Clock}
              bgColor="bg-yellow-500"
              trend="Da evadere"
            />
            <StatsCard
              title="Scontrino Medio"
              value={`€${avgOrderValue.toFixed(2)}`}
              icon={TrendingUp}
              bgColor="bg-purple-500"
              trend="Media ordini"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            <div className="lg:col-span-2">
              <RecentOrders orders={orders.slice(0, 10)} isLoading={isLoading} />
            </div>

            <div className="space-y-4 md:space-y-6">
              <QRCodeGenerator restaurant={restaurant} />
              
              <div className="hidden md:block">
                <OrdersChart orders={orders} />
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-base md:text-lg">Quick Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 md:space-y-4">
                  <div className="flex justify-between items-center text-sm md:text-base">
                    <span className="text-gray-600">Totale Ordini</span>
                    <span className="font-bold">{orders.length}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm md:text-base">
                    <span className="text-gray-600">Completati</span>
                    <span className="font-bold text-green-600">
                      {orders.filter(o => o.stato === "completato").length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm md:text-base">
                    <span className="text-gray-600">In Consegna</span>
                    <span className="font-bold text-blue-600">
                      {orders.filter(o => o.tipo_consegna === "consegna").length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm md:text-base">
                    <span className="text-gray-600">Asporto</span>
                    <span className="font-bold text-purple-600">
                      {orders.filter(o => o.tipo_consegna === "asporto").length}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="md:hidden mt-6">
            <OrdersChart orders={orders} />
          </div>
        </div>
      </div>
    </div>
  );
}