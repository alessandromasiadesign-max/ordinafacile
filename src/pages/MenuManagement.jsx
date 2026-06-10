import { Restaurant, MenuItem, Category, Event } from '@/api/entities';
import React, { useState, useEffect, useMemo } from "react";
import { supabase } from '@/api/supabaseClient';
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, UtensilsCrossed, ChevronDown, ChevronUp, Copy, CopyPlus, Trash2, Calendar, Search, X } from "lucide-react";

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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import CategorySection from "../components/menu/CategorySection";
import AddCategoryDialog from "../components/menu/AddCategoryDialog";
import AddMenuItemDialog from "../components/menu/AddMenuItemDialog";
import { useToast } from "../components/ui/use-toast";
import { safeAuditLog } from "@/lib/audit";

export default function MenuManagement() {
  const [restaurant, setRestaurant] = useState(null);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [guideDismissed, setGuideDismissed] = useState(false);
  const [hasPreviewedPublicMenu, setHasPreviewedPublicMenu] = useState(false);
  const [completionDismissed, setCompletionDismissed] = useState(false);

  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [confirmAction, setConfirmAction] = useState(null);
  const [showCopyToEventDialog, setShowCopyToEventDialog] = useState(false);
  const [copyTargetEventId, setCopyTargetEventId] = useState('');
  const [copySourceCategory, setCopySourceCategory] = useState(null);

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

  const { data: events = [] } = useQuery({
    queryKey: ['events', restaurant?.id],
    queryFn: async () => {
      if (!restaurant?.id) return [];
      return Event.filter({ restaurant_id: restaurant.id }, '-created_at');
    },
    enabled: !!restaurant?.id,
    initialData: [],
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

  const copyToEventMutation = useMutation({
    mutationFn: async ({ category, targetEventId }) => copyCategoryDeep({ sourceCategory: category, targetEventId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
      queryClient.invalidateQueries({ queryKey: ['event-categories'] });
      toast({
        title: 'Copiato in evento',
        type: 'success',
      });
      setShowCopyToEventDialog(false);
      setCopyTargetEventId('');
      setCopySourceCategory(null);
    },
    onError: (error) => {
      console.error('Errore copia in evento:', error);
      toast({
        title: 'Errore',
        description: error?.message || 'Impossibile copiare la categoria',
        type: 'error',
      });
    },
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
    queryKey: ['categories', restaurant?.id],
    queryFn: async () => {
      if (!restaurant) return [];
      const rows = await Category.filter(
        { restaurant_id: restaurant.id, event_id: null },
        "ordine"
      );
      return (rows || []).map(normalizeCategory);
    },
    enabled: !!restaurant,
    initialData: [],
  });

  const { data: menuItems = [] } = useQuery({
    queryKey: ['menuItems', restaurant?.id],
    queryFn: async () => {
      if (!restaurant) return [];
      const rows = await MenuItem.filter({
        restaurant_id: restaurant.id
      });
      return (rows || []).map(normalizeMenuItem);
    },
    enabled: !!restaurant,
    initialData: [],
  });

  const trimmedSearch = String(searchQuery || "").trim();

  const filteredMenuItems = useMemo(() => {
    if (!trimmedSearch) return menuItems || [];
    const q = trimmedSearch.toLowerCase();
    return (menuItems || []).filter((item) => {
      const name = String(item?.nome ?? item?.name ?? "").toLowerCase();
      const desc = String(item?.descrizione ?? item?.description ?? "").toLowerCase();
      return name.includes(q) || desc.includes(q);
    });
  }, [menuItems, trimmedSearch]);

  const filteredCategories = useMemo(() => {
    if (!trimmedSearch) return categories || [];
    const q = trimmedSearch.toLowerCase();
    const categoryIdsWithMatchingItems = new Set(
      (filteredMenuItems || []).map((i) => i?.category_id).filter(Boolean)
    );

    return (categories || []).filter((cat) => {
      const name = String(cat?.nome ?? cat?.name ?? "").toLowerCase();
      const desc = String(cat?.descrizione ?? cat?.description ?? "").toLowerCase();
      const categoryMatches = name.includes(q) || desc.includes(q);
      return categoryMatches || categoryIdsWithMatchingItems.has(cat?.id);
    });
  }, [categories, filteredMenuItems, trimmedSearch]);

  useEffect(() => {
    loadRestaurant();
  }, []);

  const isOnboarding = new URLSearchParams(window.location.search).get('onboarding') === '1';
  const hasCategories = (categories || []).length > 0;
  const hasItems = (menuItems || []).length > 0;
  const isWizardCompleted = hasCategories && hasItems && hasPreviewedPublicMenu;

  const getPublicMenuUrl = () => {
    if (!restaurant?.id) return '';
    return `${window.location.origin}/r/${restaurant.id}`;
  };

  useEffect(() => {
    if (!restaurant?.id) return;
    const key = `menu_onboarding_dismissed_${restaurant.id}`;
    setGuideDismissed(localStorage.getItem(key) === '1');
  }, [restaurant?.id]);

  useEffect(() => {
    if (!restaurant?.id) return;
    const key = `menu_onboarding_completed_dismissed_${restaurant.id}`;
    setCompletionDismissed(localStorage.getItem(key) === '1');
  }, [restaurant?.id]);

  useEffect(() => {
    if (!restaurant?.id) return;
    const key = `menu_onboarding_previewed_${restaurant.id}`;
    setHasPreviewedPublicMenu(localStorage.getItem(key) === '1');
  }, [restaurant?.id]);

  useEffect(() => {
    if (!isOnboarding) return;
    if (!isWizardCompleted) return;
    const params = new URLSearchParams(window.location.search);
    params.delete('onboarding');
    const next = params.toString();
    window.history.replaceState({}, '', next ? `${window.location.pathname}?${next}` : window.location.pathname);
  }, [isOnboarding, isWizardCompleted]);

  const shouldShowGuide = !guideDismissed && !isWizardCompleted;
  const shouldShowCompletion = isWizardCompleted && !completionDismissed;

  useEffect(() => {
    if (!isOnboarding) return;
    if (!restaurant?.id) return;
    if (!hasCategories) {
      setShowAddCategory(true);
      return;
    }
    if (hasCategories && !hasItems) {
      const firstCat = categories?.[0];
      if (firstCat?.id) {
        setExpandedCategories(new Set([firstCat.id]));
        setSelectedCategory(firstCat);
        setShowAddItem(true);
      }
    }
  }, [isOnboarding, restaurant?.id, hasCategories, hasItems, categories]);

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

  const handleAddItem = (category) => {
    setSelectedCategory(category);
    setShowAddItem(true);
  };

  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const duplicateCategoryMutation = useMutation({
    mutationFn: async (category) => {
      if (!restaurant?.id) throw new Error('Ristorante non caricato');
      if (!category?.id) throw new Error('Categoria non valida');

      const baseName = String(category?.nome ?? '').trim() || 'Categoria';
      const newCategory = await Category.create({
        restaurant_id: restaurant.id,
        name: `${baseName} (copia)`,
        description: category?.descrizione ?? '',
        image_url: category?.immagine_url ?? '',
        sort_order: Number.isFinite(Number(category?.ordine)) ? Number(category.ordine) + 1 : 0,
        is_active: true,
      });

      const { data: oldModifiers, error: oldModifiersError } = await supabase
        .from('category_modifiers')
        .select('id, name, type, required, options')
        .eq('category_id', category.id);
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

        for (let i = 0; i < oldModifiers.length; i++) {
          const oldId = oldModifiers[i]?.id;
          const newId = insertedMods?.[i]?.id;
          if (oldId && newId) modifierIdMap.set(oldId, newId);
        }
      }

      const oldItems = await MenuItem.filter({ restaurant_id: restaurant.id, category_id: category.id });

      for (const oldItem of oldItems || []) {
        const createdItem = await MenuItem.create({
          restaurant_id: restaurant.id,
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
      queryClient.invalidateQueries({ queryKey: ['category_modifiers'] });
      toast({
        title: 'Categoria duplicata',
        type: 'success',
      });
    },
    onError: (error) => {
      console.error('Errore duplicazione categoria:', error);
      toast({
        title: 'Errore',
        description: error?.message || 'Impossibile duplicare la categoria',
        type: 'error',
      });
    },
  });

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
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
      queryClient.invalidateQueries({ queryKey: ['category_modifiers'] });
      toast({
        title: 'Categoria rimossa',
        type: 'success',
      });
      safeAuditLog({
        action: 'category_deleted',
        entity_type: 'category',
        entity_id: confirmCategory?.id ?? null,
        restaurant_id: restaurant?.id,
        meta: {
          name: confirmCategory?.nome ?? null,
        },
      });
    },
    onError: (error) => {
      console.error('Errore eliminazione categoria:', error);
      toast({
        title: 'Errore',
        description: error?.message || 'Impossibile rimuovere la categoria',
        type: 'error',
      });
    },
  });

  const isConfirmOpen = !!confirmAction;
  const confirmCategory = confirmAction?.category;
  const confirmType = confirmAction?.type;
  const confirmIsBusy = duplicateCategoryMutation.isPending || deleteCategoryMutation.isPending;
  const confirmTitle = (() => {
    if (confirmType === 'duplicate') return 'Duplicare categoria?';
    if (confirmType === 'delete') return 'Rimuovere categoria?';
    return '';
  })();
  const confirmDescription = (() => {
    const name = confirmCategory?.nome ?? '';
    if (confirmType === 'duplicate') return `Vuoi duplicare la categoria "${name}"? Verranno copiati anche prodotti e modificatori.`;
    if (confirmType === 'delete') return `Vuoi rimuovere la categoria "${name}"? Verranno eliminati anche tutti i prodotti e i modificatori associati.`;
    return '';
  })();
  const confirmActionLabel = confirmType === 'delete' ? 'Rimuovi' : 'Duplica';
  const runConfirmedAction = () => {
    if (!confirmCategory) return;
    if (confirmType === 'duplicate') duplicateCategoryMutation.mutate(confirmCategory);
    if (confirmType === 'delete') deleteCategoryMutation.mutate(confirmCategory);
    setConfirmAction(null);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="p-4 md:p-8">
        <div className="max-w-7xl mx-auto">

          <Dialog open={showCopyToEventDialog} onOpenChange={setShowCopyToEventDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Copia categoria in un evento</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Select value={copyTargetEventId} onValueChange={setCopyTargetEventId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona evento" />
                  </SelectTrigger>
                  <SelectContent>
                    {(events || []).map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e?.nome ?? e?.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowCopyToEventDialog(false)}>
                  Annulla
                </Button>
                <Button
                  type="button"
                  className="bg-red-600 hover:bg-red-700"
                  disabled={!copyTargetEventId || !copySourceCategory || copyToEventMutation.isPending}
                  onClick={() => copyToEventMutation.mutate({ category: copySourceCategory, targetEventId: copyTargetEventId })}
                >
                  Copia
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <AlertDialog open={isConfirmOpen} onOpenChange={(open) => { if (!open) setConfirmAction(null); }}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
                <AlertDialogDescription>{confirmDescription}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={confirmIsBusy}>Annulla</AlertDialogCancel>
                <AlertDialogAction
                  onClick={runConfirmedAction}
                  disabled={confirmIsBusy}
                  className={confirmType === 'delete' ? 'bg-red-600 hover:bg-red-700' : undefined}
                >
                  {confirmActionLabel}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 md:mb-8">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Gestione Menu</h1>
              <p className="text-sm md:text-base text-muted-foreground mt-1">Organizza il tuo menu in categorie</p>
            </div>
            <Button 
              onClick={() => setShowAddCategory(true)}
              className="bg-red-600 hover:bg-red-700 w-full sm:w-auto text-sm md:text-base"
            >
              <Plus className="w-4 h-4 mr-2" />
              Aggiungi Categoria
            </Button>
          </div>

          {categories.length > 0 && (
            <Card className="mb-4 md:mb-6">
              <CardContent className="p-4 md:p-6">
                <div className="flex flex-col gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cerca categoria o prodotto..."
                      className="pl-9 pr-9"
                    />
                    {trimmedSearch && (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7"
                        onClick={() => setSearchQuery("")}
                        title="Svuota ricerca"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  {trimmedSearch && (
                    <div className="text-sm text-muted-foreground">
                      {filteredCategories.length} categorie
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {shouldShowGuide && (
            <Card className="mb-4 md:mb-6">
              <CardContent className="p-4 md:p-6">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold">Guida rapida: crea il tuo menu</div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (!restaurant?.id) {
                          setGuideDismissed(true);
                          return;
                        }
                        const key = `menu_onboarding_dismissed_${restaurant.id}`;
                        localStorage.setItem(key, '1');
                        setGuideDismissed(true);
                      }}
                    >
                      Chiudi
                    </Button>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Segui questi passaggi per andare online velocemente.
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className={`rounded-lg border p-3 ${hasCategories ? 'border-green-200 bg-green-50' : 'border-border'}`}>
                      <div className="text-sm font-medium">1) Crea una categoria</div>
                      <div className="text-xs text-muted-foreground">Es: Pizze, Antipasti, Bevande</div>
                      {!hasCategories && (
                        <Button
                          type="button"
                          size="sm"
                          className="mt-2 bg-red-600 hover:bg-red-700"
                          onClick={() => setShowAddCategory(true)}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Crea categoria
                        </Button>
                      )}
                    </div>
                    <div className={`rounded-lg border p-3 ${hasItems ? 'border-green-200 bg-green-50' : 'border-border'}`}>
                      <div className="text-sm font-medium">2) Inserisci i prodotti</div>
                      <div className="text-xs text-muted-foreground">Nome, prezzo, descrizione (foto opzionale)</div>
                      {hasCategories && !hasItems && (
                        <Button
                          type="button"
                          size="sm"
                          className="mt-2 bg-red-600 hover:bg-red-700"
                          onClick={() => {
                            const firstCat = categories?.[0];
                            if (!firstCat) return;
                            setSelectedCategory(firstCat);
                            setShowAddItem(true);
                          }}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Aggiungi prodotto
                        </Button>
                      )}
                    </div>
                    <div className="rounded-lg border p-3 border-border">
                      <div className="text-sm font-medium">3) Controlla la pagina pubblica</div>
                      <div className="text-xs text-muted-foreground">Apri il menu come lo vedono i clienti</div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="mt-2"
                        onClick={() => {
                          if (!restaurant?.id) return;
                          const url = getPublicMenuUrl();
                          if (!url) return;
                          const key = `menu_onboarding_previewed_${restaurant.id}`;
                          localStorage.setItem(key, '1');
                          setHasPreviewedPublicMenu(true);
                          window.open(url, '_blank', 'noopener,noreferrer');
                        }}
                      >
                        Apri pagina pubblica
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {shouldShowCompletion && (
            <Card className="mb-4 md:mb-6 border-green-200 bg-green-50">
              <CardContent className="p-4 md:p-6">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold">Menu pronto</div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (!restaurant?.id) {
                          setCompletionDismissed(true);
                          return;
                        }
                        const key = `menu_onboarding_completed_dismissed_${restaurant.id}`;
                        localStorage.setItem(key, '1');
                        setCompletionDismissed(true);
                      }}
                    >
                      Chiudi
                    </Button>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Hai completato i passaggi principali. Ora puoi condividere il link del menu.
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const url = getPublicMenuUrl();
                        if (!url) return;
                        window.open(url, '_blank', 'noopener,noreferrer');
                      }}
                    >
                      Apri pagina pubblica
                    </Button>
                    <Button
                      type="button"
                      className="bg-red-600 hover:bg-red-700"
                      onClick={async () => {
                        const url = getPublicMenuUrl();
                        if (!url) return;
                        try {
                          if (navigator?.clipboard?.writeText) {
                            await navigator.clipboard.writeText(url);
                          } else {
                            const el = document.createElement('textarea');
                            el.value = url;
                            document.body.appendChild(el);
                            el.select();
                            document.execCommand('copy');
                            document.body.removeChild(el);
                          }
                          toast({
                            title: 'Link copiato',
                            type: 'success',
                          });
                        } catch (e) {
                          console.error('Errore copia link:', e);
                          toast({
                            title: 'Errore',
                            description: 'Impossibile copiare il link',
                            type: 'error',
                          });
                        }
                      }}
                    >
                      Copia link menu
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {categories.length === 0 ? (
            <Card>
              <CardContent className="p-8 md:p-12 text-center">
                <UtensilsCrossed className="w-12 h-12 md:w-16 md:h-16 text-muted-foreground/50 mx-auto mb-4" />
                <h2 className="text-xl md:text-2xl font-bold mb-2">Crea il tuo primo menu</h2>
                <p className="text-sm md:text-base text-muted-foreground mb-6">
                  Inizia creando categorie come "Pizze", "Antipasti", "Bevande"
                </p>
                <Button 
                  onClick={() => setShowAddCategory(true)}
                  className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Crea Prima Categoria
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 items-start">
              {filteredCategories.map((category) => {
                const q = trimmedSearch.toLowerCase();
                const categoryMatches = trimmedSearch
                  ? (
                      String(category?.nome ?? category?.name ?? "").toLowerCase().includes(q) ||
                      String(category?.descrizione ?? category?.description ?? "").toLowerCase().includes(q)
                    )
                  : false;

                const categoryItems = trimmedSearch
                  ? (categoryMatches
                      ? menuItems.filter((item) => item.category_id === category.id)
                      : filteredMenuItems.filter((item) => item.category_id === category.id))
                  : menuItems.filter((item) => item.category_id === category.id);

                const isExpanded = trimmedSearch ? true : expandedCategories.has(category.id);

                return (
                  <Card key={category.id} className="hover:shadow-md transition-shadow">
                    <div 
                      className="p-4 md:p-6 cursor-pointer"
                      onClick={() => {
                        if (trimmedSearch) return;
                        toggleCategory(category.id);
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                          {category.immagine_url && (
                            <img 
                              src={category.immagine_url} 
                              alt={category.nome}
                              className="w-12 h-12 md:w-16 md:h-16 object-cover rounded-lg flex-shrink-0"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <h3 className="text-lg md:text-2xl font-bold truncate">{category.nome}</h3>
                            {category.descrizione && (
                              <p className="text-xs md:text-sm text-muted-foreground mt-1 line-clamp-1">{category.descrizione}</p>
                            )}
                            <p className="text-xs md:text-sm text-muted-foreground mt-1">
                              {categoryItems.length} prodotti
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (duplicateCategoryMutation.isPending) return;
                              setConfirmAction({ type: 'duplicate', category });
                            }}
                            className="text-xs md:text-sm hidden sm:flex h-9 md:h-10"
                            disabled={duplicateCategoryMutation.isPending}
                            title="Duplica questa categoria (con prodotti e modificatori)"
                          >
                            <CopyPlus className="w-3 h-3 md:w-4 md:h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCopySourceCategory(category);
                              setCopyTargetEventId('');
                              setShowCopyToEventDialog(true);
                            }}
                            className="text-xs md:text-sm hidden sm:flex h-9 md:h-10"
                            disabled={copyToEventMutation.isPending}
                            title="Copia questa categoria in un evento"
                          >
                            <Calendar className="w-3 h-3 md:w-4 md:h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (deleteCategoryMutation.isPending) return;
                              setConfirmAction({ type: 'delete', category });
                            }}
                            className="text-xs md:text-sm hidden sm:flex h-9 md:h-10"
                            disabled={deleteCategoryMutation.isPending}
                          >
                            <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddItem(category);
                            }}
                            className="bg-red-600 hover:bg-red-700 text-xs md:text-sm hidden sm:flex h-9 md:h-10"
                          >
                            <Plus className="w-3 h-3 md:w-4 md:h-4 md:mr-1" />
                            <span className="hidden md:inline">Prodotto</span>
                          </Button>
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 md:w-6 md:h-6 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-5 h-5 md:w-6 md:h-6 text-muted-foreground" />
                          )}
                        </div>
                      </div>

                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddItem(category);
                        }}
                        className="bg-red-600 hover:bg-red-700 w-full mt-3 sm:hidden text-xs"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Aggiungi Prodotto
                      </Button>

                      <div className="grid grid-cols-2 gap-2 mt-2 sm:hidden">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (duplicateCategoryMutation.isPending) return;
                            setConfirmAction({ type: 'duplicate', category });
                          }}
                          disabled={duplicateCategoryMutation.isPending}
                          className="text-xs"
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          Duplica
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (deleteCategoryMutation.isPending) return;
                            setConfirmAction({ type: 'delete', category });
                          }}
                          disabled={deleteCategoryMutation.isPending}
                          className="text-xs"
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Rimuovi
                        </Button>
                      </div>
                    </div>

                    {isExpanded && (
                      <CategorySection
                        category={category}
                        menuItems={categoryItems}
                        onAddItem={() => handleAddItem(category)}
                        isExpanded={isExpanded}
                        enableBulkActions
                      />
                    )}
                  </Card>
                );
              })}
            </div>
          )}

          <AddCategoryDialog
            open={showAddCategory}
            onClose={() => setShowAddCategory(false)}
            restaurantId={restaurant?.id}
          />

          <AddMenuItemDialog
            open={showAddItem}
            onClose={() => {
              setShowAddItem(false);
              setSelectedCategory(null);
            }}
            category={selectedCategory}
            restaurantId={restaurant?.id}
          />
        </div>
      </div>
    </div>
  );
}