import { Restaurant, Order, Printer as PrinterEntity } from '@/api/entities';
import React, { useState, useEffect } from "react";
import { supabase } from '@/api/supabaseClient';
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Wifi, Bluetooth, RefreshCw, Check, X, Printer } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

export default function PrintOrders() {
  const [restaurant, setRestaurant] = useState(null);
  const [lastPrintedId, setLastPrintedId] = useState(null);
  const [autoPrint, setAutoPrint] = useState(false);
  const [printerStatus, setPrinterStatus] = useState("disconnected");

  const safeFormatDate = (value, fmt) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return format(d, fmt, { locale: it });
  };

  const normalizeOrder = (o) => {
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
      table_id: o?.table_id ?? null,
      table_name: o?.table_name ?? null,
      totale: Number(o?.totale ?? o?.total ?? 0),
      created_date: o?.created_date ?? o?.created_at,
      items: Array.isArray(o?.items) ? o.items : [],
    };
  };

  const { data: orders = [], refetch } = useQuery({
    queryKey: ['orders', restaurant?.id],
    queryFn: async () => {
      if (!restaurant) return [];
      const rows = await Order.filter(
        { restaurant_id: restaurant.id, status: "pending" },
        "-created_at"
      );
      const normalized = (rows || []).map(normalizeOrder);
      const orderIds = normalized.map((o) => o.id).filter(Boolean);
      if (orderIds.length === 0) return normalized;

      const { data: orderItems, error } = await supabase
        .from('order_items')
        .select('*')
        .in('order_id', orderIds)
        .order('created_at', { ascending: true });
      if (error) throw error;

      const itemsByOrderId = (orderItems || []).reduce((acc, row) => {
        const key = row.order_id;
        if (!acc[key]) acc[key] = [];
        acc[key].push({
          menu_item_id: row.menu_item_id,
          nome: row.name,
          quantita: row.quantity,
          prezzo_unitario: Number(row.price ?? 0),
          modificatori: Array.isArray(row.modifiers) ? row.modifiers : [],
          note: row.notes || "",
        });
        return acc;
      }, {});

      return normalized.map((o) => ({
        ...o,
        items: itemsByOrderId[o.id] || [],
      }));
    },
    enabled: !!restaurant,
    initialData: [],
    refetchInterval: autoPrint ? 10000 : false,
  });

  const { data: printers = [] } = useQuery({
    queryKey: ['printers', restaurant?.id],
    queryFn: async () => {
      if (!restaurant) return [];
      return PrinterEntity.filter({ restaurant_id: restaurant.id });
    },
    enabled: !!restaurant,
    initialData: [],
  });

  useEffect(() => {
    loadRestaurant();
    checkPrinterConnection();
  }, []);

  useEffect(() => {
    if (autoPrint && orders.length > 0) {
      const newOrders = orders.filter(o => !lastPrintedId || o.created_date > lastPrintedId);
      if (newOrders.length > 0) {
        newOrders.forEach(order => printOrder(order));
        setLastPrintedId(orders[0].created_date);
      }
    }
  }, [orders, autoPrint]);

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

  const checkPrinterConnection = () => {
    if (window.print) {
      setPrinterStatus("ready");
    }
  };

  const connectBluetooth = async () => {
    if (!('bluetooth' in navigator)) {
      alert("Bluetooth non supportato su questo dispositivo");
      return;
    }

    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }]
      });
      setPrinterStatus("connected");
      alert("Stampante Bluetooth connessa!");
    } catch (error) {
      console.error("Errore connessione Bluetooth:", error);
      alert("Impossibile connettersi alla stampante");
    }
  };

  const printOrder = (order) => {
    const printContent = `
      <html>
        <head>
          <title>Comanda #${order.numero_ordine}</title>
          <style>
            body {
              font-family: 'Courier New', monospace;
              width: 80mm;
              margin: 0;
              padding: 10px;
            }
            .header {
              text-align: center;
              border-bottom: 2px dashed #000;
              padding-bottom: 10px;
              margin-bottom: 10px;
            }
            .order-num {
              font-size: 24px;
              font-weight: bold;
            }
            .section {
              margin: 10px 0;
              padding: 10px 0;
              border-bottom: 1px dashed #000;
            }
            .item {
              margin: 5px 0;
            }
            .item-name {
              font-weight: bold;
            }
            .modifier {
              margin-left: 20px;
              font-size: 12px;
            }
            .total {
              font-size: 18px;
              font-weight: bold;
              text-align: right;
              margin-top: 10px;
            }
            @media print {
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div style="font-size: 18px; font-weight: bold;">${restaurant.nome}</div>
            <div class="order-num">#${order.numero_ordine}</div>
            <div>${safeFormatDate(order.created_date, "dd/MM/yyyy HH:mm")}</div>
          </div>

          <div class="section">
            <div><strong>Cliente:</strong> ${order.cliente_nome}</div>
            <div><strong>Tel:</strong> ${order.cliente_telefono}</div>
            <div><strong>Tipo:</strong> ${order.tipo_consegna === "tavolo" ? `TAVOLO ${order.table_name}` : order.tipo_consegna === "consegna" ? "CONSEGNA" : "ASPORTO"}</div>
            ${order.tipo_consegna === "consegna" ? `<div><strong>Indirizzo:</strong> ${order.cliente_indirizzo}</div>` : ''}
            ${order.tipo_consegna === "tavolo" && order.table_name ? `<div><strong>Tavolo:</strong> ${order.table_name}</div>` : ''}
            ${order.note ? `<div><strong>Note:</strong> ${order.note}</div>` : ''}
          </div>

          <div class="section">
            <div style="font-weight: bold; margin-bottom: 10px;">PRODOTTI:</div>
            ${(order.items || []).map(item => `
              <div class="item">
                <div class="item-name">${item.quantita}x ${item.nome}</div>
                ${item.modificatori && item.modificatori.length > 0 ? 
                  item.modificatori.map(mod => `<div class="modifier">+ ${mod}</div>`).join('') 
                  : ''}
                ${item.note ? `<div class="modifier">Note: ${item.note}</div>` : ''}
              </div>
            `).join('')}
          </div>

          <div class="total">
            TOTALE: €${order.totale.toFixed(2)}
          </div>

          <div style="text-align: center; margin-top: 20px; font-size: 12px;">
            ${new Date().toLocaleString('it-IT')}
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '', 'width=300,height=600');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
    printWindow.close();
  };

  return (
    <div className="p-4 md:p-8 bg-background text-foreground min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Stampa <span className="gradient-text">Comande</span></h1>
          <p className="text-muted-foreground mt-1">Gestisci la stampa delle comande in arrivo</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Printer className="w-5 h-5" />
              Impostazioni Stampa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Stato Stampa Automatica */}
            <div className={`p-6 rounded-xl border-4 transition-all ${
              autoPrint 
                ? 'bg-green-50 dark:bg-green-950/30 border-green-500' 
                : 'bg-muted border-border'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                    autoPrint ? 'bg-green-500' : 'bg-muted-foreground'
                  }`}>
                    {autoPrint ? (
                      <Check className="w-8 h-8 text-white" />
                    ) : (
                      <X className="w-8 h-8 text-white" />
                    )}
                  </div>
                  <div>
                    <div className="text-xl font-bold">
                      Stampa Automatica
                    </div>
                    <div className={`text-lg font-semibold ${
                      autoPrint ? 'text-green-700 dark:text-green-100' : 'text-muted-foreground'
                    }`}>
                      {autoPrint ? "ATTIVATA" : "DISATTIVATA"}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {autoPrint 
                        ? "Stampa automatica ogni 10 secondi" 
                        : "Stampa manuale richiesta"}
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => setAutoPrint(!autoPrint)}
                  size="lg"
                  className={`text-lg px-8 py-6 ${
                    autoPrint 
                      ? 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/20'
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {autoPrint ? "Disattiva" : "Attiva"}
                </Button>
              </div>
            </div>

            {/* Stato Connessione Stampante */}
            <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-blue-900">Stato Stampante</div>
                  <div className="text-sm text-blue-700">
                    {printerStatus === "connected" ? "Connessa" : 
                     printerStatus === "ready" ? "Pronta" : 
                     "Non connessa"}
                  </div>
                </div>
                <Badge className={
                  printerStatus === "connected" ? "bg-green-500" : "bg-muted-foreground"
                }>
                  {printerStatus === "connected" ? "Connessa" : "Disconnessa"}
                </Badge>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 border-2 border-border rounded-lg hover:border-blue-400 transition-all">
                <div className="flex items-center gap-2 mb-3">
                  <Wifi className="w-5 h-5 text-blue-500" />
                  <div className="font-semibold">Stampante WiFi</div>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Stampa tramite rete WiFi locale
                </p>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setPrinterStatus("ready");
                    alert("Pronto per stampare via WiFi");
                  }}
                >
                  Usa WiFi
                </Button>
              </div>

              <div className="p-4 border-2 border-border rounded-lg hover:border-blue-400 transition-all">
                <div className="flex items-center gap-2 mb-3">
                  <Bluetooth className="w-5 h-5 text-blue-500" />
                  <div className="font-semibold">Stampante Bluetooth</div>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Connetti via Bluetooth
                </p>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={connectBluetooth}
                >
                  Connetti Bluetooth
                </Button>
              </div>
            </div>

            {printers.length > 0 && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Stampanti Configurate</Label>
                {printers.map(printer => (
                  <div key={printer.id} className={`p-4 border-2 rounded-lg ${printer.attiva ? 'border-green-500 bg-green-50 dark:bg-green-950/30' : 'border-border bg-muted'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Printer className={`w-5 h-5 ${printer.attiva ? 'text-green-600' : 'text-muted-foreground'}`} />
                        <div>
                          <div className="font-semibold">{printer.nome}</div>
                          <div className="text-sm text-muted-foreground">
                            {printer.tipo === 'wifi' && printer.indirizzo_ip && `WiFi: ${printer.indirizzo_ip}`}
                            {printer.tipo === 'bluetooth' && printer.mac_address && `BT: ${printer.mac_address}`}
                            {printer.modello && ` • ${printer.modello}`}
                            {printer.larghezza_carta && ` • ${printer.larghezza_carta}`}
                          </div>
                        </div>
                      </div>
                      {printer.predefinita && (
                        <Badge className="bg-blue-500">Predefinita</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
              <strong>Consiglio:</strong> Per ottenere i migliori risultati, usa una stampante termica da 80mm compatibile ESC/POS. Configura le stampanti nella sezione Impostazioni.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Ordini da Stampare ({orders.length})</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Aggiorna
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {orders.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Printer className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p>Nessun ordine da stampare</p>
                </div>
              ) : (
                orders.map(order => (
                  <div key={order.id} className="flex items-center justify-between p-4 border-2 rounded-lg hover:bg-accent">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-bold text-lg">#{order.numero_ordine}</span>
                        <Badge className={order.tipo_consegna === "tavolo" ? "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-100 dark:border-orange-900/40" : ""}>
                          {order.tipo_consegna === "tavolo" ? `Tavolo ${order.table_name}` : order.tipo_consegna === "consegna" ? "Consegna" : "Asporto"}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {safeFormatDate(order.created_date, "HH:mm")}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {order.cliente_nome} · {(order.items?.length ?? 0)} prodotti · €{order.totale.toFixed(2)}
                      </div>
                    </div>
                    <Button
                      onClick={() => printOrder(order)}
                      className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/20"
                      size="lg"
                    >
                      <Printer className="w-5 h-5 mr-2" />
                      Stampa
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}