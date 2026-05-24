import { Promotion } from '@/api/entities';
import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

export default function PromotionSelector({ selectedIds = [], onChange, restaurantId }) {
  const { data: promotions = [] } = useQuery({
    queryKey: ['promotions', restaurantId],
    queryFn: () => Promotion.filter({ 
      restaurant_id: restaurantId,
      is_active: true 
    }),
    enabled: !!restaurantId,
    initialData: [],
  });

  const togglePromotion = (id) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(pid => pid !== id));
    } else if (selectedIds.length < 2) {
      onChange([...selectedIds, id]);
    } else {
      alert("Puoi selezionare massimo 2 promozioni");
    }
  };

  if (promotions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Nessuna promozione attiva disponibile</p>
        <p className="text-sm mt-2">Crea prima delle promozioni nella sezione Promozioni</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {promotions.map(promo => (
        <div
          key={promo.id}
          className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
            selectedIds.includes(promo.id)
              ? 'border-red-500 bg-red-50 dark:bg-red-950/30'
              : 'border-border hover:bg-accent'
          }`}
          onClick={() => togglePromotion(promo.id)}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-bold">{promo.nome}</h4>
                {selectedIds.includes(promo.id) && (
                  <Badge className="bg-red-500">In Evidenza</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{promo.descrizione}</p>
              {promo.codice && (
                <p className="text-xs text-muted-foreground mt-1">Codice: {promo.codice}</p>
              )}
            </div>
            <div className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 ${
              selectedIds.includes(promo.id)
                ? 'border-red-500 bg-red-500'
                : 'border-border'
            }`}>
              {selectedIds.includes(promo.id) && (
                <Check className="w-4 h-4 text-white" />
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}