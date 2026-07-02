import { Core } from '@/api/integrations';
import { MenuItem } from '@/api/entities';
import React, { useState, useRef } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Upload, X, Check } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@/api/supabaseClient';
import { useToast } from "../ui/use-toast";
import LazyImage from "../ui/lazy-image";
import { Checkbox } from "@/components/ui/checkbox";
import { safeAuditLog } from "@/lib/audit";

const ALLERGENI = [
  { value: "glutine", label: "Glutine", icon: "??" },
  { value: "crostacei", label: "Crostacei", icon: "??" },
  { value: "uova", label: "Uova", icon: "??" },
  { value: "pesce", label: "Pesce", icon: "??" },
  { value: "arachidi", label: "Arachidi", icon: "??" },
  { value: "soia", label: "Soia", icon: "??" },
  { value: "latte", label: "Latte", icon: "??" },
  { value: "frutta_a_guscio", label: "Frutta a guscio", icon: "??" },
  { value: "sedano", label: "Sedano", icon: "??" },
  { value: "senape", label: "Senape", icon: "??" },
  { value: "sesamo", label: "Sesamo", icon: "??" },
  { value: "solfiti", label: "Solfiti", icon: "??" },
  { value: "lupini", label: "Lupini", icon: "??" },
  { value: "molluschi", label: "Molluschi", icon: "??" }
];

export default function EditMenuItemDialog({ open, onClose, menuItem }) {
  const [formData, setFormData] = useState(menuItem || {});
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("dettagli");
  const [selectedCategoryModifierIds, setSelectedCategoryModifierIds] = useState([]);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [autosaveState, setAutosaveState] = useState('saved');
  const autosaveInitRef = useRef(true);
  const autosaveTimerRef = useRef(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  React.useEffect(() => {
    if (menuItem) {
      setFormData({
        ...menuItem,
        allergeni: menuItem.allergeni || [],
        esaurito: menuItem.esaurito || false // Initialize esaurito if not present
      });
      setActiveTab("dettagli");
      setAutosaveState('saved');
      autosaveInitRef.current = true;
    }
  }, [menuItem]);

  const { data: categoryModifiers = [] } = useQuery({
    queryKey: ['category_modifiers', menuItem?.category_id],
    queryFn: async () => {
      if (!menuItem?.category_id) return [];
      const { data, error } = await supabase
        .from('category_modifiers')
        .select('*')
        .eq('category_id', menuItem.category_id)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!menuItem?.category_id,
    initialData: [],
  });

  const { data: menuItemModifierLinks = [] } = useQuery({
    queryKey: ['menu_item_category_modifiers', menuItem?.id],
    queryFn: async () => {
      if (!menuItem?.id) return [];
      const { data, error } = await supabase
        .from('menu_item_category_modifiers')
        .select('category_modifier_id')
        .eq('menu_item_id', menuItem.id);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!menuItem?.id,
    initialData: [],
  });

  React.useEffect(() => {
    if (!menuItem?.id) return;
    const ids = (menuItemModifierLinks || [])
      .map((r) => r?.category_modifier_id)
      .filter(Boolean);
    setSelectedCategoryModifierIds(ids);
  }, [menuItem?.id, menuItemModifierLinks]);

  const updateMutation = useMutation({
    mutationFn: (data) => MenuItem.update(menuItem.id, data),
  });

  const buildUpdatePayload = (fd) => {
    const name = String(fd?.nome ?? '').trim();
    const price = Number(fd?.prezzo);
    const safePrice = Number.isFinite(price) ? Math.max(0, price) : 0;
    return {
      name,
      description: fd?.descrizione,
      price: safePrice,
      image_url: fd?.immagine_url,
      allergens: Array.isArray(fd?.allergeni) ? fd.allergeni : [],
      is_available: !!fd?.disponibile,
      esaurito: !!fd?.esaurito,
    };
  };

  React.useEffect(() => {
    if (!menuItem?.id) return;
    if (!open) return;
    if (activeTab !== 'dettagli') return;

    if (autosaveInitRef.current) {
      autosaveInitRef.current = false;
      return;
    }

    setAutosaveState('dirty');
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);

    autosaveTimerRef.current = setTimeout(() => {
      setAutosaveState('saving');
      const payload = buildUpdatePayload(formData);
      if (!payload?.name) {
        setAutosaveState('dirty');
        return;
      }
      updateMutation.mutate(payload, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['menuItems'] });
          setAutosaveState('saved');
        },
        onError: (error) => {
          console.error('Errore aggiornamento prodotto:', error);
          setAutosaveState('error');
        },
      });
    }, 700);

    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [menuItem?.id, open, activeTab, formData, queryClient, updateMutation]);

  const saveMenuItemModifiersMutation = useMutation({
    mutationFn: async (modifierIds) => {
      if (!menuItem?.id) return;

      const desired = new Set((modifierIds || []).filter(Boolean));
      const current = new Set(
        (menuItemModifierLinks || [])
          .map((r) => r?.category_modifier_id)
          .filter(Boolean)
      );

      const toInsert = Array.from(desired).filter((id) => !current.has(id));
      const toDelete = Array.from(current).filter((id) => !desired.has(id));

      if (toInsert.length > 0) {
        const payload = toInsert.map((category_modifier_id) => ({
          menu_item_id: menuItem.id,
          category_modifier_id,
        }));
        const { error } = await supabase
          .from('menu_item_category_modifiers')
          .insert(payload);
        if (error) throw error;
      }

      if (toDelete.length > 0) {
        const { error } = await supabase
          .from('menu_item_category_modifiers')
          .delete()
          .eq('menu_item_id', menuItem.id)
          .in('category_modifier_id', toDelete);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu_item_category_modifiers', menuItem?.id] });
      toast({ title: 'Modificatori aggiornati', type: 'success' });
    },
    onError: (error) => {
      console.error('Errore salvataggio modificatori prodotto:', error);
      toast({
        title: 'Errore',
        description: error?.message || 'Impossibile salvare i modificatori',
        type: 'error',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => MenuItem.delete(menuItem.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
      toast({
        title: "Prodotto eliminato",
        type: "success"
      });
      onClose();
    },
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, immagine_url: file_url }));
    } catch (error) {
      alert("Errore caricamento immagine");
    }
    setUploading(false);
  };

  const toggleAllergene = (allergene) => {
    setFormData(prev => ({
      ...prev,
      allergeni: (prev.allergeni || []).includes(allergene)
        ? prev.allergeni.filter(a => a !== allergene)
        : [...(prev.allergeni || []), allergene]
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = buildUpdatePayload(formData);
    if (!payload?.name) {
      toast({
        title: "Errore",
        description: "Inserisci un nome prodotto",
        type: "error",
      });
      return;
    }
    if (!Number.isFinite(payload?.price) || payload.price < 0) {
      toast({
        title: "Errore",
        description: "Inserisci un prezzo valido",
        type: "error",
      });
      return;
    }
    updateMutation.mutate(payload, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['menuItems'] });
        toast({
          title: "Prodotto aggiornato",
          type: "success"
        });
        onClose();
      },
      onError: (error) => {
        console.error('Errore aggiornamento prodotto:', error);
        toast({
          title: "Errore",
          description: error?.message || "Impossibile aggiornare il prodotto",
          type: "error",
        });
      },
    });
  };

  const handleDelete = () => {
    setIsDeleteConfirmOpen(true);
  };

  if (!menuItem) return null;

  return (
    <Dialog open={open && !!menuItem} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3">
            <DialogTitle>Modifica Prodotto</DialogTitle>
            <div className="text-xs text-muted-foreground pt-1">
              {autosaveState === 'saving'
                ? 'Salvataggio...'
                : autosaveState === 'dirty'
                  ? 'Modifiche non salvate'
                  : autosaveState === 'error'
                    ? 'Errore salvataggio'
                    : 'Salvato'}
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dettagli">Dettagli Prodotto</TabsTrigger>
            <TabsTrigger value="modificatori">Modificatori</TabsTrigger>
          </TabsList>

          <TabsContent value="dettagli">
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nome Prodotto *</Label>
                  <Input
                    value={formData.nome || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Descrizione</Label>
                  <Textarea
                    value={formData.descrizione || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, descrizione: e.target.value }))}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Prezzo (€) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.prezzo || 0}
                    onChange={(e) => setFormData(prev => ({ ...prev, prezzo: parseFloat(e.target.value) }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Immagine Prodotto</Label>
                  {formData.immagine_url ? (
                    <div className="relative">
                      <LazyImage 
                        src={formData.immagine_url} 
                        alt="Preview"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={() => setFormData(prev => ({ ...prev, immagine_url: "" }))}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-accent transition-colors">
                      <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">
                        {uploading ? "Caricamento..." : "Clicca per caricare"}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={uploading}
                      />
                    </label>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Allergeni Presenti</Label>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border rounded-lg">
                    {ALLERGENI.map(allergene => (
                      <button type="button"
                        key={allergene.value}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                          (formData.allergeni || []).includes(allergene.value)
                            ? 'bg-red-50 dark:bg-red-950/30 border-2 border-red-500'
                            : 'bg-muted border-2 border-border hover:bg-accent'
                        }`}
                        onClick={() => toggleAllergene(allergene.value)}
                        aria-pressed={(formData.allergeni || []).includes(allergene.value)}
                      >
                        <span className="text-lg">{allergene.icon}</span>
                        <span className="text-sm font-medium">{allergene.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <button type="button" 
                      className={`flex items-center space-x-3 p-3 border-2 rounded-lg cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                        formData.disponibile 
                          ? 'border-green-500 bg-green-50 dark:bg-green-950/30' 
                          : 'border-border hover:bg-accent'
                      }`}
                      onClick={() => setFormData(prev => ({ ...prev, disponibile: !prev.disponibile }))}
                      aria-pressed={!!formData.disponibile}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                        formData.disponibile 
                          ? 'border-green-500 bg-green-500' 
                          : 'border-border'
                      }`}>
                        {formData.disponibile && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1">
                        <span className="text-sm font-medium">
                          Prodotto attivo nel menu
                        </span>
                        <p className="text-xs text-muted-foreground">
                          Se disattivato, non appare nel menu
                        </p>
                      </div>
                    </button>
                  </div>

                  <div className="space-y-2">
                    <button type="button" 
                      className={`flex items-center space-x-3 p-3 border-2 rounded-lg cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                        formData.esaurito 
                          ? 'border-red-500 bg-red-50 dark:bg-red-950/30' 
                          : 'border-border hover:bg-accent'
                      }`}
                      onClick={() => setFormData(prev => ({ ...prev, esaurito: !prev.esaurito }))}
                      aria-pressed={!!formData.esaurito}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                        formData.esaurito 
                          ? 'border-red-500 bg-red-500' 
                          : 'border-border'
                      }`}>
                        {formData.esaurito && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1">
                        <span className="text-sm font-medium">
                          Prodotto esaurito
                        </span>
                        <p className="text-xs text-muted-foreground">
                          Temporaneamente non disponibile
                        </p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button type="button" variant="destructive" onClick={handleDelete}>
                  Elimina Prodotto
                </Button>
                <Button type="button" variant="outline" onClick={onClose}>
                  Annulla
                </Button>
                <Button type="submit" className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/20" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Salvataggio...' : 'Salva Modifiche'}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>

          <TabsContent value="modificatori" className="py-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold">Modificatori del prodotto</h3>
                  <p className="text-sm text-muted-foreground">
                    Seleziona quali modificatori di categoria sono attivi per questo prodotto.
                  </p>
                </div>
                <Button variant="outline" onClick={() => setActiveTab("dettagli")}>
                  Chiudi
                </Button>
              </div>

              {categoryModifiers.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  Nessun modificatore definito per la categoria. Creali dalla categoria (icona matita) nella tab "Modificatori".
                </div>
              ) : (
                <div className="space-y-3">
                  {categoryModifiers.map((m) => {
                    const checked = selectedCategoryModifierIds.includes(m.id);
                    return (
                      <div
                        key={m.id}
                        className="flex items-start gap-3 p-3 border rounded-lg"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) => {
                            const nextChecked = Boolean(value);
                            setSelectedCategoryModifierIds((prev) => {
                              if (nextChecked) return Array.from(new Set([...prev, m.id]));
                              return prev.filter((id) => id !== m.id);
                            });
                          }}
                        />
                        <div className="flex-1">
                          <div className="font-semibold">{m.nome}</div>
                          <div className="text-xs text-muted-foreground">
                            {m.tipo === 'singolo' ? 'Selezione singola' : 'Selezione multipla'}
                            {m.obbligatorio ? ' • obbligatorio' : ''}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/20"
                  disabled={saveMenuItemModifiersMutation.isPending}
                  onClick={() => saveMenuItemModifiersMutation.mutate(selectedCategoryModifierIds)}
                >
                  {saveMenuItemModifiersMutation.isPending ? 'Salvataggio...' : 'Salva Modificatori'}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>


        <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminare prodotto?</AlertDialogTitle>
              <AlertDialogDescription>
                Vuoi eliminare "{menuItem?.nome}"? L’operazione è definitiva.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteMutation.isPending}>Annulla</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                disabled={deleteMutation.isPending}
                onClick={() => {
                  deleteMutation.mutate(undefined, {
                    onSuccess: () => {
                      safeAuditLog({
                        action: 'menu_item_deleted',
                        entity_type: 'menu_item',
                        entity_id: menuItem?.id ?? null,
                        restaurant_id: menuItem?.restaurant_id ?? null,
                        meta: { name: menuItem?.nome ?? null },
                      });
                    },
                  });
                  setIsDeleteConfirmOpen(false);
                }}
              >
                Elimina
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </DialogContent>
    </Dialog>
  );
}
