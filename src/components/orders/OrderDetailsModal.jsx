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
import { Phone, MapPin, Package, Truck, Table as TableIcon } from "lucide-react";

const statusColors = {
  nuovo: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-100",
  confermato: "bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-100",
  in_preparazione: "bg-purple-100 text-purple-800 dark:bg-purple-950/30 dark:text-purple-100",
  pronto: "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-100",
  in_consegna: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-100",
  completato: "bg-slate-100 text-slate-800 dark:bg-slate-900/40 dark:text-slate-100",
  annullato: "bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-100"
};

export default function OrderDetailsModal({ order, onClose }) {
  if (!order) return null;

  const createdAt = order.created_date || order.created_at;
  const tipoConsegna = (() => {
    const raw = order.tipo_consegna;
    if (raw === 'delivery') return 'consegna';
    if (raw === 'pickup') return 'asporto';
    if (raw === 'table') return 'tavolo';
    return raw;
  })();

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
              <h3 className="font-semibold text-sm text-muted-foreground">Cliente</h3>
              <div className="space-y-1">
                <p className="font-medium">{order.cliente_nome}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  {order.cliente_telefono}
                </div>
                {order.cliente_email && (
                  <p className="text-sm text-muted-foreground">{order.cliente_email}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground">Dettagli Ordine</h3>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {tipoConsegna === "tavolo" ? (
                    <TableIcon className="w-4 h-4" />
                  ) : tipoConsegna === "consegna" ? (
                    <Truck className="w-4 h-4" />
                  ) : (
                    <Package className="w-4 h-4" />
                  )}
                  <span className="capitalize">
                    {tipoConsegna === "tavolo" && order.table_name ? `Tavolo ${order.table_name}` : tipoConsegna}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {createdAt ? format(new Date(createdAt), "d MMMM yyyy, HH:mm", { locale: it }) : ''}
                </p>
                {tipoConsegna === "consegna" && order.cliente_indirizzo && (
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="w-4 h-4 mt-0.5" />
                    <span>{order.cliente_indirizzo}</span>
                  </div>
                )}
                {tipoConsegna === "tavolo" && order.table_name && (
                  <div className="flex items-start gap-2 text-sm">
                    <TableIcon className="w-4 h-4 mt-0.5" />
                    <span>Ordine dal tavolo {order.table_name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Prodotti</h3>
            <div className="space-y-2">
              {order.items?.map((item, index) => (
                <div key={index} className="flex justify-between items-start p-3 bg-muted rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{item.nome}</div>
                    {item.modificatori && item.modificatori.length > 0 && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {item.modificatori
                          .map((m) => (typeof m === 'string' ? m : (m?.label ?? '')))
                          .filter(Boolean)
                          .join(', ')}
                      </div>
                    )}
                    {item.note && (
                      <div className="text-sm text-muted-foreground italic mt-1">
                        Note: {item.note}
                      </div>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    <div className="font-medium">
                      {item.quantita}x €{item.prezzo_unitario.toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground">
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
              <p className="text-muted-foreground p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg">
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
                <span className="text-orange-600">€{order.totale.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}