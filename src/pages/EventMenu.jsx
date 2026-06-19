import { Restaurant, MenuItem, Category, Event } from '@/api/entities';
import React, { useState, useEffect } from "react";
import { supabase } from '@/api/supabaseClient';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, ArrowLeft, Calendar, Copy, CopyPlus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

import { useToast } from "../components/ui/use-toast";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import AddCategoryDialog from "../components/menu/AddCategoryDialog";
import AddMenuItemDialog from "../components/menu/AddMenuItemDialog";
import CategorySection from "../components/menu/CategorySection";

export default function EventMenu() {
  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get('id');
  const navigate = useNavigate();
  
  const [restaurant, setRestaurant] = useState(null);
  const [event, setEvent] = useState(null);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importCategoryId, setImportCategoryId] = useState("");
  const [copyBusyCategoryId, setCopyBusyCategoryId] = useState(null);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const normalizeCategory = (c) => ({
    ...c,
    nome: c?.nome ?? c?.name,
    descrizione: c?.descrizione ?? c?.description,
    immagine_url: c?.immagine_url ?? c?.image_url,
    ordine: c?.ordine ?? c?.sort_order,
    attiva: c?.attiva ?? c?.is_active,
  });

  const normalizeMenuItem = (i) => ({
    ...i,
    nome: i?.nome ?? i?.name,
    descrizione: i?.descrizione ?? i?.description,
    prezzo: i?.prezzo ?? i?.price,
    allergeni: i?.allergeni ?? i?.allergens,
    disponibile: i?.disponibile ?? i?.is_available,
    immagine_url: i?.immagine_url ?? i?.image_url,
    esaurito: i?.esaurito ?? false,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['event-categories', eventId],
    queryFn: async () => {
      const rows = await Category.filter({ event_id: eventId });
      return (rows || []).map(normalizeCategory);
    },
    enabled: !!eventId,
    initialData: [],
  });

  const { data: standardCategories = [] } = useQuery({
    queryKey: ['categories', restaurant?.id],
    queryFn: async () => {
      if (!restaurant?.id) return [];
      const rows = await Category.filter({ restaurant_id: restaurant.id, event_id: null }, 'ordine');
      return (rows || []).map(normalizeCategory);
    },
    enabled: !!restaurant?.id,
    initialData: [],
  });

  const { data: menuItems = [] } = useQuery({
    queryKey: ['menuItems', restaurant?.id, eventId],
    queryFn: async () => {
      if (!restaurant?.id) return [];
      const rows = await MenuItem.filter({ restaurant_id: restaurant.id });
      const eventCategoryIds = new Set((categories || []).map((c) => c?.id).filter(Boolean));
      return (rows || [])
        .filter((i) => eventCategoryIds.has(i?.category_id))
        .map(normalizeMenuItem);
    },
    enabled: !!restaurant?.id && !!eventId,
    initialData: [],
  });

  const handleAddItem = (category) => {
    setSelectedCategory(category);
    setShowAddItem(true);
  };

  const deleteCategoryMutation = useMutation({
    mutationFn: async (category) => {
      if (!restaurant?.id) throw new Error('Ristorante non caricato');
      if (!category?.id) throw new Error('Categoria non valida');

      const items = await MenuItem.filter({ restaurant_id: restaurant.id, category_id: category.id });
      const itemIds = (items || []).map((i) => i.id).filter(Boolean);
      if (itemIds.length > 0) {
        const { error: delLinksError } = await supabase
          .from('menu_item_category_modifiers')
          .delete()
          .in('menu_item_id', itemIds);
        if (delLinksError) throw delLinksError;
      }

      const { data: mods, error: modsError } = await supabase
        .from('category_modifiers')
        .select('id')
        .eq('category_id', category.id);
      if (modsError) throw modsError;

      const modIds = (mods || []).map((m) => m.id).filter(Boolean);
      if (modIds.length > 0) {
        const { error: delLinksByModError } = await supabase
          .from('menu_item_category_modifiers')
          .delete()
          .in('category_modifier_id', modIds);
        if (delLinksByModError) throw delLinksByModError;
      }

      const { error: delItemsError } = await supabase
        .from('menu_items')
        .delete()
        .eq('category_id', category.id);
      if (delItemsError) throw delItemsError;

      const { error: delModsError } = await supabase
        .from('category_modifiers')
        .delete()
        .eq('category_id', category.id);
      if (delModsError) throw delModsError;

      await Category.delete(category.id);
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-categories', eventId] });
      queryClient.invalidateQueries({ queryKey: ['menuItems', restaurant?.id, eventId] });
      queryClient.invalidateQueries({ queryKey: ['category_modifiers'] });
      toast({
        title: 'Categoria rimossa',
        type: 'success',
      });
    },
    onError: (error) => {
      console.error('Errore eliminazione categoria:', error);
      toast({
        title: 'Errore',
        description: error?.message || 'Impossibile eliminare la categoria',
        type: 'error',
      });
    },
  });

  const copyCategoryDeep = async ({ sourceCategory, targetEventId }) => {
    if (!restaurant?.id) throw new Error('Ristorante non caricato');
    if (!sourceCategory?.id) throw new Error('Categoria non valida');

    const baseName = String(sourceCategory?.nome ?? sourceCategory?.name ?? '').trim() || 'Categoria';

    const newCategory = await Category.create({
      restaurant_id: restaurant.id,
      event_id: targetEventId ?? null,
      name: `${baseName} (copia)`,
      description: sourceCategory?.descrizione ?? sourceCategory?.description ?? '',
      image_url: sourceCategory?.immagine_url ?? sourceCategory?.image_url ?? '',
      sort_order: Number.isFinite(Number(sourceCategory?.ordine ?? sourceCategory?.sort_order))
        ? Number(sourceCategory?.ordine ?? sourceCategory?.sort_order)
        : 0,
      is_active: (sourceCategory?.attiva ?? sourceCategory?.is_active) ?? true,
    });

    const { data: oldModifiers, error: oldModifiersError } = await supabase
      .from('category_modifiers')
      .select('id, name, type, required, options')
      .eq('category_id', sourceCategory.id);
    if (oldModifiersError) throw oldModifiersError;

    const modifierIdMap = new Map();
    if (Array.isArray(oldModifiers) && oldModifiers.length > 0) {
      const { data: insertedMods, error: insertModsError } = await supabase
        .from('category_modifiers')
        .insert(
          oldModifiers.map((m) => ({
            category_id: newCategory.id,
            name: m.name,
            type: m.type,
            required: m.required,
            options: m.options,
          }))
        )
        .select('id, name, type, required, options');
      if (insertModsError) throw insertModsError;

      for (let i = 0; i < oldModifiers.length; i += 1) {
        const oldId = oldModifiers[i]?.id;
        const newId = insertedMods?.[i]?.id;
        if (oldId && newId) modifierIdMap.set(oldId, newId);
      }
    }

    const oldItems = await MenuItem.filter({ restaurant_id: restaurant.id, category_id: sourceCategory.id });

    for (const oldItem of oldItems || []) {
      const createdItem = await MenuItem.create({
        restaurant_id: restaurant.id,
        event_id: targetEventId ?? null,
        category_id: newCategory.id,
        name: oldItem?.name ?? oldItem?.nome ?? '',
        description: oldItem?.description ?? oldItem?.descrizione ?? '',
        price: Number(oldItem?.price ?? oldItem?.prezzo ?? 0),
        image_url: oldItem?.image_url ?? oldItem?.immagine_url ?? '',
        allergens: Array.isArray(oldItem?.allergens ?? oldItem?.allergeni) ? (oldItem?.allergens ?? oldItem?.allergeni) : [],
        is_available: (oldItem?.is_available ?? oldItem?.disponibile) ?? true,
        esaurito: oldItem?.esaurito ?? false,
      });

      if (modifierIdMap.size > 0) {
        const { data: oldAssignments, error: oldAssignmentsError } = await supabase
          .from('menu_item_category_modifiers')
          .select('category_modifier_id')
          .eq('menu_item_id', oldItem.id);
        if (oldAssignmentsError) throw oldAssignmentsError;

        const newAssignments = (oldAssignments || [])
          .map((a) => ({
            menu_item_id: createdItem.id,
            category_modifier_id: modifierIdMap.get(a.category_modifier_id),
          }))
          .filter((a) => a.category_modifier_id);

        if (newAssignments.length > 0) {
          const { error: insertAssignError } = await supabase
            .from('menu_item_category_modifiers')
            .insert(newAssignments);
          if (insertAssignError) throw insertAssignError;
        }
      }
    }

    return newCategory;
  };

  const handleCopyCategory = async ({ sourceCategory, targetEventId }) => {
    if (copyBusyCategoryId) return;
    setCopyBusyCategoryId(sourceCategory?.id ?? 'busy');
    try {
      await copyCategoryDeep({ sourceCategory, targetEventId });
      queryClient.invalidateQueries({ queryKey: ['event-categories', eventId] });
      queryClient.invalidateQueries({ queryKey: ['categories', restaurant?.id] });
      queryClient.invalidateQueries({ queryKey: ['menuItems', restaurant?.id, eventId] });
    } finally {
      setCopyBusyCategoryId(null);
    }
  };

  const toggleCategory = (categoryId) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  };

  useEffect(() => {
    loadData();
  }, [eventId]);

  const loadData = async () => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user?.id) return;
      const isAdmin = user?.app_metadata?.role === 'admin' || user?.user_metadata?.role === 'admin';

      const restaurants = isAdmin
        ? await Restaurant.list('-created_at')
        : await Restaurant.filter({ user_id: user.id });
      if (restaurants.length > 0) {
        const storedId = localStorage.getItem('selected_restaurant_id');
        const selected = restaurants.find((r) => r.id === storedId) || restaurants[0];
        if (selected?.id) {
          localStorage.setItem('selected_restaurant_id', selected.id);
        }
        setRestaurant(selected);
      }

      if (eventId) {
        const events = await Event.filter({ id: eventId });
        if (events.length > 0) {
          setEvent(events[0]);
        }
      }
    } catch (error) {
      console.error("Errore:", error);
    }
  };

  if (!event) {
    return (
      <div className="p-4 md:p-8 bg-background min-h-screen">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">Caricamento evento...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-background min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 md:mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl("Events"))}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Torna agli Eventi
          </Button>
          
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <Calendar className="w-8 h-8 text-red-600 shrink-0" />
              <div className="min-w-0">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground truncate">{event?.nome}</h1>
                <p className="text-sm md:text-base text-muted-foreground">Menu Evento</p>
              </div>
            </div>

            <Badge
              className={
                event?.attivo
                  ? "bg-green-500 text-white dark:bg-green-950/30 dark:text-green-100"
                  : "bg-muted text-muted-foreground"
              }
            >
              {event?.attivo ? "Attivo" : "Disattivato"}
            </Badge>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:justify-end gap-3 mb-6">
          <Button
            onClick={() => {
              setImportCategoryId("");
              setShowImportDialog(true);
            }}
            variant="outline"
            className="border-red-600 text-red-600 hover:bg-red-100 dark:hover:bg-red-950/30"
          >
            <Copy className="w-4 h-4 mr-2" />
            Importa dal Menu Standard
          </Button>

          <Button
            onClick={() => setShowAddCategory(true)}
            variant="outline"
            className="border-red-600 text-red-600 hover:bg-red-100 dark:hover:bg-red-950/30"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuova Categoria
          </Button>
          <Button
            onClick={() => {
              if (!selectedCategory && categories.length > 0) {
                setSelectedCategory(categories[0]);
              }
              setShowAddItem(true);
            }}
            className="bg-red-600 hover:bg-red-700"
            disabled={categories.length === 0}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuovo Prodotto
          </Button>
        </div>

        {categories.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <h2 className="text-2xl font-bold mb-2">Crea il menu per questo evento</h2>
              <p className="text-muted-foreground mb-6">
                Inizia creando le categorie (es: Antipasti, Primi, Secondi)
              </p>
              <Button
                onClick={() => setShowAddCategory(true)}
                className="bg-red-600 hover:bg-red-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Crea Prima Categoria
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {categories.map(category => (
              <div key={category.id}>
                <div className="relative">
                  <button
                    type="button"
                    className="absolute inset-0 z-0 rounded-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    onClick={() => toggleCategory(category.id)}
                    aria-expanded={expandedCategories.has(category.id)}
                    aria-label={`Espandi o comprimi categoria ${category.nome}`}
                  />
                  <div className="relative z-10">
                    <CategorySection
                      category={category}
                      menuItems={(menuItems || []).filter((i) => i.category_id === category.id)}
                      onAddItem={() => handleAddItem(category)}
                      isExpanded={expandedCategories.has(category.id)}
                      headerActions={(
                        <>
                          <Button
                            variant="outline"
                            size="icon"
                            disabled={deleteCategoryMutation.isPending}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (deleteCategoryMutation.isPending) return;
                              setCategoryToDelete(category);
                            }}
                            title="Elimina questa categoria"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            disabled={!!copyBusyCategoryId}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyCategory({ sourceCategory: category, targetEventId: null });
                            }}
                            title="Copia questa categoria nel menu standard"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            disabled={!!copyBusyCategoryId}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyCategory({ sourceCategory: category, targetEventId: eventId });
                            }}
                            title="Duplica questa categoria in questo evento"
                          >
                            <CopyPlus className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <AddCategoryDialog
          open={showAddCategory}
          onClose={() => setShowAddCategory(false)}
          restaurantId={restaurant?.id}
          eventId={eventId}
        />

        <AddMenuItemDialog
          open={showAddItem}
          onClose={() => setShowAddItem(false)}
          category={selectedCategory}
          restaurantId={restaurant?.id}
          eventId={eventId}
        />

        <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Importa una categoria dal Menu Standard</DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              <Select value={importCategoryId} onValueChange={setImportCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona una categoria" />
                </SelectTrigger>
                <SelectContent>
                  {(standardCategories || []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c?.nome ?? c?.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowImportDialog(false)}>
                Annulla
              </Button>
              <Button
                type="button"
                className="bg-red-600 hover:bg-red-700"
                disabled={!importCategoryId || !!copyBusyCategoryId}
                onClick={async () => {
                  const source = (standardCategories || []).find((c) => c.id === importCategoryId);
                  if (!source) return;
                  await handleCopyCategory({ sourceCategory: source, targetEventId: eventId });
                  setShowImportDialog(false);
                }}
              >
                Importa
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
        <AlertDialog open={!!categoryToDelete} onOpenChange={(open) => !open && setCategoryToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminare categoria?</AlertDialogTitle>
              <AlertDialogDescription>
                Vuoi eliminare la categoria "{categoryToDelete?.nome ?? ''}"? L'operazione è definitiva.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteCategoryMutation.isPending}>Annulla</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                disabled={deleteCategoryMutation.isPending}
                onClick={() => {
                  const c = categoryToDelete;
                  setCategoryToDelete(null);
                  if (!c?.id) return;
                  deleteCategoryMutation.mutate(c);
                }}
              >
                Elimina
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}