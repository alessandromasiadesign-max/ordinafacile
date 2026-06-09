import { MenuItem } from '@/api/entities';
import React, { useState } from 'react';
import { supabase } from '@/api/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { CopyPlus, Pencil, Plus, Trash2 } from "lucide-react";
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useToast } from "../ui/use-toast";

import EditCategoryDialog from "./EditCategoryDialog";
import EditMenuItemDialog from "./EditMenuItemDialog";


export default function CategorySection({ category, menuItems, onAddItem, isExpanded, headerActions = null, enableBulkActions = false }) {
  const [showEditCategory, setShowEditCategory] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedItemIds, setSelectedItemIds] = useState([]);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const hasSelection = enableBulkActions && selectedItemIds.length > 0;

  const toggleEsauritoMutation = useMutation({
    mutationFn: ({ id, esaurito }) => MenuItem.update(id, { esaurito }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
      toast({
        title: "Stato aggiornato",
        type: "success"
      });
    },
    onError: (error) => {
      console.error("Errore aggiornamento:", error);
      toast({
        title: "Errore",
        description: "Impossibile aggiornare lo stato del prodotto",
        type: "error"
      });
    },
  });

  // Handler for toggling 'esaurito' status
  const handleToggleEsaurito = (item, e) => {
    e.stopPropagation(); // Prevent the card's onClick from firing
    toggleEsauritoMutation.mutate({ 
      id: item.id, 
      esaurito: !item.esaurito 
    });
  };

  const formatPrice = (value) => {
    const n = Number(value);
    const safe = Number.isFinite(n) ? n : 0;
    return safe.toFixed(2);
  };

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ ids, patch }) => {
      if (!Array.isArray(ids) || ids.length === 0) return;
      const { error } = await supabase
        .from('menu_items')
        .update(patch)
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
      setSelectedItemIds([]);
      toast({
        title: 'Aggiornato',
        type: 'success',
      });
    },
    onError: (error) => {
      console.error('Errore bulk update prodotti:', error);
      toast({
        title: 'Errore',
        description: error?.message || 'Impossibile aggiornare i prodotti',
        type: 'error',
      });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async ({ ids }) => {
      if (!Array.isArray(ids) || ids.length === 0) return;

      const { error: delLinksError } = await supabase
        .from('menu_item_category_modifiers')
        .delete()
        .in('menu_item_id', ids);
      if (delLinksError) throw delLinksError;

      const { error: delItemsError } = await supabase
        .from('menu_items')
        .delete()
        .in('id', ids);
      if (delItemsError) throw delItemsError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
      setSelectedItemIds([]);
      toast({
        title: 'Prodotti eliminati',
        type: 'success',
      });
    },
    onError: (error) => {
      console.error('Errore bulk delete prodotti:', error);
      toast({
        title: 'Errore',
        description: error?.message || 'Impossibile eliminare i prodotti',
        type: 'error',
      });
    },
  });

  const duplicateItemMutation = useMutation({
    mutationFn: async (item) => {
      if (!item?.id) throw new Error('Prodotto non valido');

      const created = await MenuItem.create({
        restaurant_id: item.restaurant_id,
        event_id: item.event_id ?? null,
        category_id: item.category_id,
        name: `${String(item?.nome ?? item?.name ?? '').trim() || 'Prodotto'} (copia)`,
        description: item?.descrizione ?? item?.description ?? '',
        price: Number(item?.prezzo ?? item?.price ?? 0),
        image_url: item?.immagine_url ?? item?.image_url ?? '',
        allergens: Array.isArray(item?.allergeni ?? item?.allergens) ? (item?.allergeni ?? item?.allergens) : [],
        is_available: (item?.is_available ?? item?.disponibile) ?? true,
        esaurito: item?.esaurito ?? false,
      });

      const { data: oldAssignments, error: oldAssignmentsError } = await supabase
        .from('menu_item_category_modifiers')
        .select('category_modifier_id')
        .eq('menu_item_id', item.id);
      if (oldAssignmentsError) throw oldAssignmentsError;

      const newAssignments = (oldAssignments || [])
        .map((a) => ({
          menu_item_id: created.id,
          category_modifier_id: a.category_modifier_id,
        }))
        .filter((a) => a.category_modifier_id);

      if (newAssignments.length > 0) {
        const { error: insertAssignError } = await supabase
          .from('menu_item_category_modifiers')
          .insert(newAssignments);
        if (insertAssignError) throw insertAssignError;
      }

      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
      toast({
        title: 'Prodotto duplicato',
        type: 'success',
      });
    },
    onError: (error) => {
      console.error('Errore duplicazione prodotto:', error);
      toast({
        title: 'Errore',
        description: error?.message || 'Impossibile duplicare il prodotto',
        type: 'error',
      });
    },
  });

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            {category.immagine_url && (
              <img 
                src={category.immagine_url} 
                alt={category.nome}
                className="w-16 h-16 object-cover rounded-lg"
              />
            )}
            <div>
              <CardTitle className="text-2xl">{category.nome}</CardTitle>
              {category.descrizione && (
                <p className="text-sm text-muted-foreground mt-1">{category.descrizione}</p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            {headerActions}
            {enableBulkActions && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (hasSelection) {
                    setSelectedItemIds([]);
                    return;
                  }

                  setSelectedItemIds((menuItems || []).map((i) => i?.id).filter(Boolean));
                }}
                disabled={(menuItems || []).length === 0}
              >
                {hasSelection ? `${selectedItemIds.length} selezionati` : 'Seleziona tutto'}
              </Button>
            )}
            {enableBulkActions && hasSelection && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => bulkUpdateMutation.mutate({ ids: selectedItemIds, patch: { is_available: true } })}
                  disabled={bulkUpdateMutation.isPending || bulkDeleteMutation.isPending}
                >
                  Attiva
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => bulkUpdateMutation.mutate({ ids: selectedItemIds, patch: { is_available: false } })}
                  disabled={bulkUpdateMutation.isPending || bulkDeleteMutation.isPending}
                >
                  Disattiva
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => bulkUpdateMutation.mutate({ ids: selectedItemIds, patch: { esaurito: true } })}
                  disabled={bulkUpdateMutation.isPending || bulkDeleteMutation.isPending}
                >
                  Esaurito
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => bulkUpdateMutation.mutate({ ids: selectedItemIds, patch: { esaurito: false } })}
                  disabled={bulkUpdateMutation.isPending || bulkDeleteMutation.isPending}
                >
                  Disponibile
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (confirm(`Eliminare ${selectedItemIds.length} prodotti?`)) {
                      bulkDeleteMutation.mutate({ ids: selectedItemIds });
                    }
                  }}
                  disabled={bulkUpdateMutation.isPending || bulkDeleteMutation.isPending}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            )}
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setShowEditCategory(true)}
            >
              <Pencil className="w-4 h-4" />
            </Button>
            <Button onClick={onAddItem} className="bg-red-600 hover:bg-red-700">
              <Plus className="w-4 h-4 mr-2" />
              Aggiungi Prodotto
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {menuItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nessun prodotto in questa categoria
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {menuItems.map(item => (
                (() => {
                  const selected = enableBulkActions && selectedItemIds.includes(item.id);
                  return (
                <Card 
                  key={item.id} 
                  className={`hover:shadow-md transition-shadow cursor-pointer ${
                    item.esaurito ? 'opacity-60' : ''
                  }`}
                  onClick={() => setEditingItem(item)}
                >
                  <CardContent className="p-4">
                    {enableBulkActions && (
                      <div className="flex items-center justify-between mb-2">
                        <Checkbox
                          checked={selected}
                          onCheckedChange={(value) => {
                            const nextChecked = Boolean(value);
                            setSelectedItemIds((prev) => {
                              if (nextChecked) return Array.from(new Set([...prev, item.id]));
                              return prev.filter((id) => id !== item.id);
                            });
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (duplicateItemMutation.isPending) return;
                            duplicateItemMutation.mutate(item);
                          }}
                          disabled={duplicateItemMutation.isPending}
                          title="Duplica prodotto"
                        >
                          <CopyPlus className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                    {item.immagine_url && (
                      <div className="relative">
                        <img 
                          src={item.immagine_url}
                          alt={item.nome}
                          className="w-full h-32 object-cover rounded-lg mb-3"
                        />
                        {item.esaurito && (
                          <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                            <Badge className="bg-red-600 text-white text-lg">
                              ESAURITO
                            </Badge>
                          </div>
                        )}
                      </div>
                    )}
                    {!item.immagine_url && item.esaurito && (
                        <div className="w-full h-32 bg-muted rounded-lg mb-3 flex items-center justify-center relative">
                            <Badge className="bg-red-600 text-white text-lg">
                                ESAURITO
                            </Badge>
                        </div>
                    )}
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-lg">{item.nome}</h3>
                      <div className="flex gap-1">
                        {item.esaurito && (
                          <Badge variant="destructive" className="text-xs">
                            Esaurito
                          </Badge>
                        )}
                        {!item.disponibile && (
                          <Badge variant="secondary" className="text-xs">
                            Non disponibile
                          </Badge>
                        )}
                      </div>
                    </div>
                    {item.descrizione && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {item.descrizione}
                      </p>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-xl font-bold text-red-600">
                        €{formatPrice(item?.prezzo)}
                      </span>
                      <div className="flex gap-2">
                        <Button 
                          variant={item.esaurito ? "default" : "outline"}
                          size="sm"
                          onClick={(e) => handleToggleEsaurito(item, e)}
                          className={item.esaurito ? "bg-green-600 hover:bg-green-700" : ""}
                          disabled={toggleEsauritoMutation.isPending} // Disable button while mutation is in progress
                        >
                          {toggleEsauritoMutation.isPending && toggleEsauritoMutation.variables?.id === item.id 
                            ? "Aggiornamento..." 
                            : (item.esaurito ? "Rendi Disponibile" : "Segna come Esaurito")
                          }
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingItem(item);
                          }}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                  );
                })()
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Floating Add Button - visible only when expanded */}
      {isExpanded && menuItems.length > 0 && (
        <div className="flex justify-center -mt-4 mb-4">
          <Button 
            onClick={onAddItem}
            className="bg-red-600 hover:bg-red-700 shadow-lg"
            size="lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            Aggiungi Altro Prodotto
          </Button>
        </div>
      )}

      <EditCategoryDialog
        open={showEditCategory}
        onClose={() => setShowEditCategory(false)}
        category={category}
      />

      <EditMenuItemDialog
        open={!!editingItem}
        onClose={() => setEditingItem(null)}
        menuItem={editingItem}
      />
    </>
  );
}