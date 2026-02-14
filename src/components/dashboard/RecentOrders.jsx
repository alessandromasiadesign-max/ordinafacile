import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Package, Truck, Clock } from "lucide-react";

const statusColors = {
  nuovo: "bg-yellow-100 text-yellow-800",
  confermato: "bg-blue-100 text-blue-800",
  in_preparazione: "bg-purple-100 text-purple-800",
  pronto: "bg-green-100 text-green-800",
  in_consegna: "bg-indigo-100 text-indigo-800",
  completato: "bg-gray-100 text-gray-800"
};

const statusLabels = {
  nuovo: "Nuovo",
  confermato: "Confermato",
  in_preparazione: "In Preparazione",
  pronto: "Pronto",
  in_consegna: "In Consegna",
  completato: "Completato"
};

export default function RecentOrders({ orders, isLoading }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Ordini Recenti</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {isLoading ? (
            <p className="text-center text-gray-500 py-8">Caricamento...</p>
          ) : orders.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Nessun ordine ancora</p>
          ) : (
            orders.map(order => (
              <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-bold text-lg">#{order.numero_ordine}</span>
                    <Badge className={statusColors[order.stato]}>
                      {statusLabels[order.stato]}
                    </Badge>
                    {order.tipo_consegna === "consegna" ? (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Truck className="w-3 h-3" />
                        Consegna
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Package className="w-3 h-3" />
                        Asporto
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="font-medium">{order.cliente_nome}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(order.created_date), "HH:mm", { locale: it })}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-red-600">
                    €{order.totale.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-500">
                    {order.items?.length || 0} prodotti
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}