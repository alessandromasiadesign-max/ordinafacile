import { MenuItem } from '@/api/entities';
import React, { useState } from 'react';
import { supabase } from '@/api/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CopyPlus, Pencil, Plus, Trash2 } from "lucide-react";
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useToast } from "../ui/use-toast";
import { safeAuditLog } from "@/lib/audit";

import EditCategoryDialog from "./EditCategoryDialog";
import EditMenuItemDialog from "./EditMenuItemDialog";


export default function CategorySection({ category, menuItems, onAddItem, isExpanded, headerActions = null, enableBulkActions = false }) {
  const [showEditCategory, setShowEditCategory] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const hasSelection = enableBulkActions && selectedItemIds.length > 0;

  const toggleEsauritoMutation = useMutation({
    mutationFn: ({ id, esaurito }) => MenuItem.update(id, { esaurito }),
    onMutate: async ({ id, esaurito }) => {
      await queryClient.cancelQueries({ queryKey: ['menuItems'] });
      const previous = queryClient.getQueriesData({ queryKey: ['menuItems'] });

      queryClient.setQueriesData({ queryKey: ['menuItems'] }, (old) => {
        if (!Array.isArray(old)) return old;
        return old.map((i) => (i?.id === id ? { ...i, esaurito } : i));
      });

      return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
    },
    onError: (error, _vars, context) => {
      if (context?.previous) {
        for (const [key, value] of context.previous) {
          queryClient.setQueryData(key, value);
        }
      }
      console.error("Errore aggiornamento:", error);
      toast({
        title: "Errore",
        description: "Impossibile aggiornare lo stato del prodotto",
        type: "error"
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
    },
  });

  const undoEsaurito = async ({ id, esaurito }) => {
    try {
      await MenuItem.update(id, { esaurito });
      queryClient.setQueriesData({ queryKey: ['menuItems'] }, (old) => {
        if (!Array.isArray(old)) return old;
        return old.map((i) => (i?.id === id ? { ...i, esaurito } : i));
      });
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
      safeAuditLog({
        action: 'menu_item_esaurito_undo',
        entity_type: 'menu_item',
        entity_id: id,
        restaurant_id: category?.restaurant_id,
        meta: { esaurito },
      });
    } catch (error) {
      console.error('Errore undo esaurito:', error);
      toast({
        title: "Errore",
        description: "Impossibile annullare la modifica",
        type: "error"
      });
    }
  };

  // Handler for toggling 'esaurito' status
  const handleToggleEsaurito = (item, e) => {
    e.stopPropagation(); // Prevent the card's onClick from firing
    const prev = !!item.esaurito;
    const next = !prev;

    toggleEsauritoMutation.mutate({
      id: item.id,
      esaurito: next,
    }, {
      onSuccess: () => {
        toast({
          title: "Stato aggiornato",
          type: "success",
          action: {
            label: 'Annulla',
            onClick: () => undoEsaurito({ id: item.id, esaurito: prev }),
          },
        });
        safeAuditLog({
          action: 'menu_item_esaurito_changed',
          entity_type: 'menu_item',
          entity_id: item?.id,
          restaurant_id: category?.restaurant_id,
          meta: { from: prev, to: next },
        });
      },
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
    onMutate: async ({ ids, patch }) => {
      await queryClient.cancelQueries({ queryKey: ['menuItems'] });
      const previous = queryClient.getQueriesData({ queryKey: ['menuItems'] });

      const prevById = new Map();
      for (const [_key, list] of previous) {
        if (!Array.isArray(list)) continue;
        for (const i of list) {
          if (i?.id && ids.includes(i.id)) prevById.set(i.id, i);
        }
      }

      queryClient.setQueriesData({ queryKey: ['menuItems'] }, (old) => {
        if (!Array.isArray(old)) return old;
        return old.map((i) => {
          if (!i?.id || !ids.includes(i.id)) return i;
          return { ...i, ...patch };
        });
      });

      return { previous, prevById, ids, patch };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) {
        for (const [key, value] of context.previous) {
          queryClient.setQueryData(key, value);
        }
      }

      console.error('Errore bulk update prodotti:', error);
      toast({
        title: 'Errore',
        description: error?.message || 'Impossibile aggiornare i prodotti',
        type: 'error',
      });
    },
    onSuccess: (_data, vars, context) => {
      const ids = vars?.ids;
      const patch = vars?.patch;
      if (!Array.isArray(ids) || !patch || typeof patch !== 'object') {
        queryClient.invalidateQueries({ queryKey: ['menuItems'] });
        return;
      }

      toast({
        title: 'Aggiornato',
        type: 'success',
        action: {
          label: 'Annulla',
          onClick: async () => {
            try {
              const prevById = context?.prevById;
              if (!prevById || typeof prevById.get !== 'function') return;

              queryClient.setQueriesData({ queryKey: ['menuItems'] }, (old) => {
                if (!Array.isArray(old)) return old;
                return old.map((i) => {
                  if (!i?.id || !ids.includes(i.id)) return i;
                  const prev = prevById.get(i.id);
                  if (!prev) return i;
                  const restored = { ...i };
                  if (Object.prototype.hasOwnProperty.call(patch, 'is_available')) restored.is_available = prev.is_available;
                  if (Object.prototype.hasOwnProperty.call(patch, 'esaurito')) restored.esaurito = prev.esaurito;
                  return restored;
                });
              });

              await Promise.all(
                ids.map(async (id) => {
                  const prev = prevById.get(id);
                  if (!prev) return;

                  const restore = {};
                  if (Object.prototype.hasOwnProperty.call(patch, 'is_available')) restore.is_available = prev.is_available;
                  if (Object.prototype.hasOwnProperty.call(patch, 'esaurito')) restore.esaurito = prev.esaurito;
                  if (Object.keys(restore).length === 0) return;

                  const { error } = await supabase
                    .from('menu_items')
                    .update(restore)
                    .eq('id', id);
                  if (error) throw error;
                })
              );

              queryClient.invalidateQueries({ queryKey: ['menuItems'] });
              safeAuditLog({
                action: 'menu_item_bulk_update_undo',
                entity_type: 'menu_item',
                entity_id: null,
                restaurant_id: category?.restaurant_id,
                meta: { ids, patch },
              });
            } catch (e) {
              console.error('Errore undo bulk update:', e);
              toast({
                title: 'Errore',
                description: e?.message || 'Impossibile annullare la modifica',
                type: 'error',
              });
              queryClient.invalidateQueries({ queryKey: ['menuItems'] });
            }
          },
        },
      });

      setSelectedItemIds([]);
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
      safeAuditLog({
        action: 'menu_item_bulk_updated',
        entity_type: 'menu_item',
        entity_id: null,
        restaurant_id: category?.restaurant_id,
        meta: { ids, patch },
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
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
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
      setSelectedItemIds([]);
      toast({
        title: 'Prodotti eliminati',
        type: 'success',
      });
      safeAuditLog({
        action: 'menu_item_bulk_deleted',
        entity_type: 'menu_item',
        entity_id: null,
        restaurant_id: category?.restaurant_id,
        meta: {
          ids: Array.isArray(vars?.ids) ? vars.ids : [],
          count: Array.isArray(vars?.ids) ? vars.ids.length : 0,
        },
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
        <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {category.immagine_url && (
              <img 
                src={category.immagine_url} 
                alt={category.nome}
                className="w-16 h-16 object-cover rounded-lg"
              />
            )}
            <div className="min-w-0">
              <CardTitle className="text-xl md:text-2xl truncate">{category.nome}</CardTitle>
              {category.descrizione && (
                <p className="text-sm text-muted-foreground mt-1">{category.descrizione}</p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 justify-end sm:pt-1">
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
                  onClick={() => setIsBulkDeleteConfirmOpen(true)}
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
              aria-label="Modifica categoria"
              title="Modifica categoria"
              data-edit-category={category?.id}
            >
              <Pencil className="w-4 h-4" />
            </Button>
            <Button onClick={onAddItem} className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/20">
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
            <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {menuItems.map(item => (
                (() => {
                  const selected = enableBulkActions && selectedItemIds.includes(item.id);
                  return (
                <Card 
                  key={item.id} 
                  className={`hover:shadow-md transition-shadow ${
                    item.esaurito ? 'opacity-60' : ''
                  }`}
                >
                  <CardContent className="p-4 relative">
                    <button
                      type="button"
                      className="absolute inset-0 z-0 rounded-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      onClick={() => setEditingItem(item)}
                      aria-label={`Modifica prodotto ${item.nome}`}
                    />
                    <div className="relative z-10">
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
                            aria-label="Duplica prodotto"
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
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <h3 className="font-bold text-lg truncate min-w-0">{item.nome}</h3>
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
                      <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center">
                        <span className="text-xl font-bold gradient-text">
                          €{formatPrice(item?.prezzo)}
                        </span>
                        <div className="flex gap-2 items-center">
                          <Button
                            variant={item.esaurito ? "default" : "outline"}
                            size="sm"
                            onClick={(e) => handleToggleEsaurito(item, e)}
                            className={item.esaurito ? "bg-green-600 hover:bg-green-700" : ""}
                            disabled={toggleEsauritoMutation.isPending}
                            aria-label={item.esaurito ? "Rendi disponibile" : "Segna come esaurito"}
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
                            aria-label="Modifica prodotto"
                            title="Modifica prodotto"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                  );
                })()
              ))}
            </div>

            <AlertDialog open={isBulkDeleteConfirmOpen} onOpenChange={setIsBulkDeleteConfirmOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Eliminare prodotti?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Stai per eliminare {selectedItemIds.length} prodotti. L’operazione è definitiva.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={bulkDeleteMutation.isPending}>Annulla</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-600 hover:bg-red-700"
                    disabled={bulkDeleteMutation.isPending || selectedItemIds.length === 0}
                    onClick={() => {
                      bulkDeleteMutation.mutate({ ids: selectedItemIds });
                      setIsBulkDeleteConfirmOpen(false);
                    }}
                  >
                    Elimina
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            </>
          )}
        </CardContent>
      </Card>

      {/* Floating Add Button - visible only when expanded */}
      {isExpanded && menuItems.length > 0 && (
        <div className="flex justify-center -mt-4 mb-4">
          <Button
            onClick={onAddItem}
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/20"
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