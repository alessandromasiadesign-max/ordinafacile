import { Restaurant, Order } from '@/api/entities';
import React, { useState, useEffect } from "react";
import { supabase } from '@/api/supabaseClient';
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Calendar, TrendingUp, Euro, Printer } from "lucide-react";
import { format, subDays, subMonths, subYears, isWithinInterval } from "date-fns";
import { it } from "date-fns/locale";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function OrderHistory() {
  const [restaurant, setRestaurant] = useState(null);
  const [period, setPeriod] = useState("1m");

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
      tipo_consegna: tipoConsegnaIt,
      stato: statoIt,
      table_id: o?.table_id ?? null,
      table_name: o?.table_name ?? null,
      totale: Number(o?.totale ?? o?.total ?? 0),
      created_date: o?.created_date ?? o?.created_at,
    };
  };

  const { data: allOrders = [], isLoading } = useQuery({
    queryKey: ['orderHistory', restaurant?.id],
    queryFn: async () => {
      if (!restaurant) return [];
      const rows = await Order.filter(
        { restaurant_id: restaurant.id },
        "-created_date",
        1000
      );

      return (rows || []).map(normalizeOrder);
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
      if (!user) return;
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

  const getDateRange = () => {
    const now = new Date();
    switch(period) {
      case "1w": return { start: subDays(now, 7), end: now };
      case "1m": return { start: subMonths(now, 1), end: now };
      case "3m": return { start: subMonths(now, 3), end: now };
      case "6m": return { start: subMonths(now, 6), end: now };
      case "1y": return { start: subYears(now, 1), end: now };
      default: return { start: subMonths(now, 1), end: now };
    }
  };

  const dateRange = getDateRange();
  const filteredOrders = allOrders.filter(order => {
    if (!order.created_date) return false;
    const orderDate = new Date(order.created_date);
    if (Number.isNaN(orderDate.getTime())) return false;
    return isWithinInterval(orderDate, dateRange);
  });

  const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.totale, 0);
  const avgOrderValue = filteredOrders.length > 0 ? totalRevenue / filteredOrders.length : 0;
  const completedOrders = filteredOrders.filter(o => o.stato === "completato").length;

  const completionRate = filteredOrders.length > 0 ? (completedOrders / filteredOrders.length * 100) : 0;

  const getChartData = () => {
    const days = period === "1w" ? 7 : period === "1m" ? 30 : period === "3m" ? 90 : period === "6m" ? 180 : 365;
    const data = [];

    
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayOrders = filteredOrders.filter(o => {
        const orderDate = new Date(o.created_date);
        return orderDate.toDateString() === date.toDateString();
      });
      
      data.push({
        date: format(date, 'dd/MM'),
        ordini: dayOrders.length,
        incasso: dayOrders.reduce((sum, o) => sum + o.totale, 0)
      });
    }
    
    return data;
  };

  const chartData = getChartData();

  const downloadCSV = () => {
    const csv = [
      ['Data', 'Numero Ordine', 'Cliente', 'Telefono', 'Tipo', 'Stato', 'Totale'],
      ...filteredOrders.map(o => [
        format(new Date(o.created_date), 'dd/MM/yyyy HH:mm'),
        o.numero_ordine,
        o.cliente_nome,
        o.cliente_telefono,
        o.tipo_consegna,
        o.stato,
        o.totale.toFixed(2)
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ordini_${period}_${format(new Date(), 'ddMMyyyy')}.csv`;
    a.click();
  };

  const printReport = () => {
    const printContent = `
      <html>
        <head>
          <title>Report Ordini - ${restaurant.nome}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #e74c3c; color: white; }
            .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin: 20px 0; }
            .stat { padding: 15px; border: 1px solid #ddd; border-radius: 8px; }
            .stat-value { font-size: 24px; font-weight: bold; color: #e74c3c; }
            @media print { button { display: none; } }
          </style>
        </head>
        <body>
          <h1>Report Ordini - ${restaurant.nome}</h1>
          <p>Periodo: ${format(dateRange.start, 'dd/MM/yyyy')} - ${format(dateRange.end, 'dd/MM/yyyy')}</p>
          
          <div class="stats">
            <div class="stat">
              <div>Totale Ordini</div>
              <div class="stat-value">${filteredOrders.length}</div>
            </div>
            <div class="stat">
              <div>Incasso Totale</div>
              <div class="stat-value">€${totalRevenue.toFixed(2)}</div>
            </div>
            <div class="stat">
              <div>Valore Medio</div>
              <div class="stat-value">€${avgOrderValue.toFixed(2)}</div>
            </div>
            <div class="stat">
              <div>Tasso Completamento</div>
              <div class="stat-value">${completionRate.toFixed(1)}%</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>N° Ordine</th>
                <th>Cliente</th>
                <th>Tipo</th>
                <th>Stato</th>
                <th>Totale</th>
              </tr>
            </thead>
            <tbody>
              ${filteredOrders.map(o => `
                <tr>
                  <td>${format(new Date(o.created_date), 'dd/MM/yyyy HH:mm')}</td>
                  <td>#${o.numero_ordine}</td>
                  <td>${o.cliente_nome}</td>
                  <td>${o.tipo_consegna}</td>
                  <td>${o.stato}</td>
                  <td>€${o.totale.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const printWindow = window.open('', '', 'width=800,height=600');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  const statusColors = {
    nuovo: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-100",
    confermato: "bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-100",
    in_preparazione: "bg-purple-100 text-purple-800 dark:bg-purple-950/30 dark:text-purple-100",
    pronto: "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-100",
    in_consegna: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-100",
    completato: "bg-slate-100 text-slate-800 dark:bg-slate-900/40 dark:text-slate-100",
    annullato: "bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-100"
  };

  return (
    <div className="p-4 md:p-8 bg-background text-foreground min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Storico Ordini</h1>
            <p className="text-muted-foreground mt-1">Visualizza, analizza e scarica i tuoi ordini</p>
          </div>

          <div className="flex gap-3">
            <Button onClick={downloadCSV} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Scarica CSV
            </Button>
            <Button onClick={printReport} variant="outline">
              <Printer className="w-4 h-4 mr-2" />
              Stampa Report
            </Button>
          </div>
        </div>

        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
              <div className="flex items-center gap-4">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Seleziona periodo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1w">Ultima Settimana</SelectItem>
                    <SelectItem value="1m">Ultimo Mese</SelectItem>
                    <SelectItem value="3m">Ultimi 3 Mesi</SelectItem>
                    <SelectItem value="6m">Ultimi 6 Mesi</SelectItem>
                    <SelectItem value="1y">Ultimo Anno</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <span className="text-sm text-muted-foreground">
                Dal {format(dateRange.start, 'dd/MM/yyyy')} al {format(dateRange.end, 'dd/MM/yyyy')}
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-950/30 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Totale Ordini</p>
                  <p className="text-2xl font-bold">{filteredOrders.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-950/30 rounded-lg flex items-center justify-center">
                  <Euro className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Incasso Totale</p>
                  <p className="text-2xl font-bold">€{totalRevenue.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-950/30 rounded-lg flex items-center justify-center">
                  <Euro className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valore Medio</p>
                  <p className="text-2xl font-bold">€{avgOrderValue.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-100 dark:bg-amber-950/30 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Completamento</p>
                  <p className="text-2xl font-bold">{completionRate.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Incasso</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="incasso" stroke="#16a34a" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ordini</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="ordini" fill="#2563eb" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Ordini</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center py-8 text-muted-foreground">Caricamento...</p>
            ) : filteredOrders.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Nessun ordine in questo periodo</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted border-b">
                    <tr>
                      <th className="text-left py-3 px-4 font-semibold text-sm">Data</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm">N° Ordine</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm">Cliente</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm">Tipo</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm">Stato</th>
                      <th className="text-right py-3 px-4 font-semibold text-sm">Totale</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => (
                      <tr key={order.id} className="border-b hover:bg-accent">
                        <td className="py-3 px-4 text-sm">
                          {format(new Date(order.created_date), "dd/MM/yyyy HH:mm", { locale: it })}
                        </td>
                        <td className="py-3 px-4 text-sm font-mono">#{order.numero_ordine}</td>
                        <td className="py-3 px-4 text-sm">
                          <div>{order.cliente_nome}</div>
                          <div className="text-xs text-muted-foreground">{order.cliente_telefono}</div>
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {order.tipo_consegna === "tavolo" ? (
                            <span className="text-orange-600 font-medium">Tavolo {order.table_name}</span>
                          ) : order.tipo_consegna === "consegna" ? (
                            "Consegna"
                          ) : (
                            "Asporto"
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <Badge className={statusColors[order.stato] || "bg-muted text-foreground"}>
                            {String(order.stato || "").replaceAll('_', ' ')}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-sm text-right font-semibold">€{order.totale.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}