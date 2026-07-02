import React, { useState, useEffect } from 'react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Check } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from '@/api/supabaseClient';
import LazyImage from "../ui/lazy-image";

export default function OrderModal({ item, onClose, onAdd }) {
  const [selectedModifiers, setSelectedModifiers] = useState({});
  const [notes, setNotes] = useState(""); // New state for notes
  const [totalPrice, setTotalPrice] = useState(0);

  const { data: modifiers = [] } = useQuery({
    queryKey: ['modifiers', item?.id],
    queryFn: async () => {
      if (!item?.id) return [];

      const { data, error } = await supabase
        .from('menu_item_category_modifiers')
        .select('category_modifier_id, category_modifiers(*)')
        .eq('menu_item_id', item.id);

      if (error) throw error;

      return (data ?? [])
        .map((r) => r?.category_modifiers)
        .filter(Boolean);
    },
    enabled: !!item,
    initialData: [],
  });

  useEffect(() => {
    if (item && modifiers) {
      let price = Number(item?.prezzo ?? 0);
      Object.values(selectedModifiers).forEach(modValue => {
        if (Array.isArray(modValue)) {
          modValue.forEach(optName => {
            const modifier = modifiers.find(m => m.opzioni?.some(o => o.nome === optName));
            const option = modifier?.opzioni?.find(o => o.nome === optName);
            const extra = Number(option?.prezzo_extra ?? 0);
            if (Number.isFinite(extra) && extra > 0) price += extra;
          });
        } else if (modValue) {
          const modifier = modifiers.find(m => m.opzioni?.some(o => o.nome === modValue));
          const option = modifier?.opzioni?.find(o => o.nome === modValue);
          const extra = Number(option?.prezzo_extra ?? 0);
          if (Number.isFinite(extra) && extra > 0) price += extra;
        }
      });
      setTotalPrice(Number.isFinite(price) ? price : 0);
    }
  }, [selectedModifiers, item?.id, item?.prezzo, modifiers.length]);

  const handleSingleSelect = (modifierId, optionName) => {
    setSelectedModifiers(prev => ({
      ...prev,
      [modifierId]: optionName
    }));
  };

  const handleMultiSelect = (modifierId, optionName, checked) => {
    setSelectedModifiers(prev => {
      const current = prev[modifierId] || [];
      if (checked) {
        return { ...prev, [modifierId]: [...current, optionName] };
      } else {
        return { ...prev, [modifierId]: current.filter(n => n !== optionName) };
      }
    });
  };

  const handleAdd = () => {
    if (!canAdd) return;
    
    const modifiersPayload = [];
    Object.entries(selectedModifiers).forEach(([modId, value]) => {
      const modifier = modifiers.find(m => m.id === modId);
      if (!modifier) return;

      const values = Array.isArray(value) ? value : [value];
      values.filter(Boolean).forEach((optName) => {
        const option = modifier?.opzioni?.find(o => o.nome === optName);
        modifiersPayload.push({
          label: `${modifier.nome}: ${optName}`,
          priceExtra: Number(option?.prezzo_extra ?? 0),
        });
      });
    });

    onAdd({ ...item, prezzo: totalPrice }, modifiersPayload, notes);
    setSelectedModifiers({});
    setNotes("");
  };

  const canAdd = modifiers
    .filter(m => m.obbligatorio)
    .every(m => selectedModifiers[m.id]);

  if (!item) return null;

  return (
    <Dialog open={!!item} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{item.nome}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {item.immagine_url && (
            <LazyImage 
              src={item.immagine_url}
              alt={item.nome}
              className="w-full h-48 object-cover rounded-lg"
            />
          )}
          
          {item.descrizione && (
            <p className="text-muted-foreground text-base">{item.descrizione}</p>
          )}

          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg font-semibold">Prezzo base</span>
              <span className="text-xl font-bold text-red-600">€{Number(item?.prezzo ?? 0).toFixed(2)}</span>
            </div>
          </div>

          {modifiers.length > 0 && (
            <div className="space-y-6">
              {modifiers.map(modifier => (
                <div key={modifier.id} className="border-t pt-4">
                  <div className="mb-4">
                    <h3 className="text-lg font-bold">
                      {modifier.nome}
                      {modifier.obbligatorio && <span className="text-red-600 ml-1">*</span>}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {modifier.tipo === "singolo" ? "Seleziona una opzione" : "Seleziona più opzioni"}
                    </p>
                  </div>

                  <div className="space-y-2">
                    {modifier.opzioni?.map((option, i) => {
                      const isSelected = modifier.tipo === "singolo"
                        ? selectedModifiers[modifier.id] === option.nome
                        : (selectedModifiers[modifier.id] || []).includes(option.nome);

                      return (
                        <button
                          type="button"
                          key={i} 
                          className={`flex w-full items-center justify-between p-4 border-2 rounded-lg text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                            isSelected 
                              ? 'border-red-500 bg-red-50 dark:bg-red-950/30' 
                              : 'border-border hover:bg-accent'
                          }`}
                          onClick={() => {
                            if (modifier.tipo === "singolo") {
                              handleSingleSelect(modifier.id, option.nome);
                            } else {
                              handleMultiSelect(modifier.id, option.nome, !isSelected);
                            }
                          }}
                          aria-pressed={!!isSelected}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-6 h-6 flex-shrink-0 flex items-center justify-center border-2 transition-all ${
                              modifier.tipo === "singolo" ? 'rounded-full' : 'rounded'
                            } ${
                              isSelected 
                                ? 'border-red-500 bg-red-500' 
                                : 'border-border'
                            }`}>
                              {isSelected && <Check className="w-4 h-4 text-white" />}
                            </div>
                            <span className="font-medium">{option.nome}</span>
                          </div>
                          {option.prezzo_extra > 0 && (
                            <span className="text-red-600 font-bold">
                              +€{option.prezzo_extra.toFixed(2)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* New: Note Section */}
          <div className="border-t pt-4">
            <Label htmlFor="notes" className="text-base font-semibold mb-2 block">
              Note o richieste speciali
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Es: Senza cipolla, ben cotto, ecc..."
              rows={3}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Specifica eventuali richieste particolari per questo prodotto
            </p>
          </div>
        </div>

        <DialogFooter className="border-t pt-4 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">Totale</span>
            <span className="text-3xl font-bold text-red-600">
              €{totalPrice.toFixed(2)}
            </span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} size="lg">
              Annulla
            </Button>
            <Button 
              onClick={handleAdd} 
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/20"
              disabled={!canAdd}
              size="lg"
            >
              Aggiungi al Carrello
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}