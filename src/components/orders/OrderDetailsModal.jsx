import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Phone, MapPin, Package, Truck } from "lucide-react";

const statusColors = {
  nuovo: "bg-yellow-100 text-yellow-800",
  confermato: "bg-blue-100 text-blue-800",
  in_preparazione: "bg-purple-100 text-purple-800",
  pronto: "bg-green-100 text-green-800",
  in_consegna: "bg-indigo-100 text-indigo-800",
  completato: "bg-gray-100 text-gray-800",
  annullato: "bg-red-100 text-red-800"
};

export default function OrderDetailsModal({ order, onClose }) {
  if (!order) return null;

  return (
    <Dialog open={!!order} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Ordine #{order.numero_ordine}</span>
            <Badge className={statusColors[order.stato]}>
              {order.stato}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-gray-500">Cliente</h3>
              <div className="space-y-1">
                <p className="font-medium">{order.cliente_nome}</p>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="w-4 h-4" />
                  {order.cliente_telefono}
                </div>
                {order.cliente_email && (
                  <p className="text-sm text-gray-600">{order.cliente_email}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-gray-500">Dettagli Ordine</h3>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {order.tipo_consegna === "consegna" ? (
                    <Truck className="w-4 h-4" />
                  ) : (
                    <Package className="w-4 h-4" />
                  )}
                  <span className="capitalize">{order.tipo_consegna}</span>
                </div>
                <p className="text-sm text-gray-600">
                  {format(new Date(order.created_date), "d MMMM yyyy, HH:mm", { locale: it })}
                </p>
                {order.tipo_consegna === "consegna" && order.cliente_indirizzo && (
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="w-4 h-4 mt-0.5" />
                    <span>{order.cliente_indirizzo}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Prodotti</h3>
            <div className="space-y-2">
              {order.items?.map((item, index) => (
                <div key={index} className="flex justify-between items-start p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{item.nome}</div>
                    {item.modificatori && item.modificatori.length > 0 && (
                      <div className="text-sm text-gray-600 mt-1">
                        {item.modificatori.join(', ')}
                      </div>
                    )}
                    {item.note && (
                      <div className="text-sm text-gray-500 italic mt-1">
                        Note: {item.note}
                      </div>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    <div className="font-medium">
                      {item.quantita}x €{item.prezzo_unitario.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-600">
                      €{(item.quantita * item.prezzo_unitario).toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {order.note && (
            <div>
              <h3 className="font-semibold mb-2">Note</h3>
              <p className="text-gray-600 p-3 bg-yellow-50 rounded-lg">
                {order.note}
              </p>
            </div>
          )}

          <div className="border-t pt-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotale</span>
                <span>€{(order.totale - (order.costo_consegna || 0)).toFixed(2)}</span>
              </div>
              {order.costo_consegna > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Costo Consegna</span>
                  <span>€{order.costo_consegna.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Totale</span>
                <span className="text-red-600">€{order.totale.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}