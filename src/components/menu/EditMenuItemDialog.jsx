import { Core } from '@/api/integrations';
import { MenuItem } from '@/api/entities';
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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

const ALLERGENI = [
  { value: "glutine", label: "Glutine", icon: "🌾" },
  { value: "crostacei", label: "Crostacei", icon: "🦐" },
  { value: "uova", label: "Uova", icon: "🥚" },
  { value: "pesce", label: "Pesce", icon: "🐟" },
  { value: "arachidi", label: "Arachidi", icon: "🥜" },
  { value: "soia", label: "Soia", icon: "🫘" },
  { value: "latte", label: "Latte", icon: "🥛" },
  { value: "frutta_a_guscio", label: "Frutta a guscio", icon: "🌰" },
  { value: "sedano", label: "Sedano", icon: "🥬" },
  { value: "senape", label: "Senape", icon: "🌭" },
  { value: "sesamo", label: "Sesamo", icon: "🫘" },
  { value: "solfiti", label: "Solfiti", icon: "🍷" },
  { value: "lupini", label: "Lupini", icon: "🫘" },
  { value: "molluschi", label: "Molluschi", icon: "🦪" }
];

export default function EditMenuItemDialog({ open, onClose, menuItem }) {
  const [formData, setFormData] = useState(menuItem || {});
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("dettagli");
  const [selectedCategoryModifierIds, setSelectedCategoryModifierIds] = useState([]);
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
    const price = Number(formData.prezzo);
    updateMutation.mutate({
      name: formData.nome,
      description: formData.descrizione,
      price: Number.isFinite(price) ? price : 0,
      image_url: formData.immagine_url,
      allergens: Array.isArray(formData.allergeni) ? formData.allergeni : [],
      is_available: !!formData.disponibile,
    });
  };

  const handleDelete = () => {
    if (confirm(`Eliminare "${menuItem.nome}"?`)) {
      deleteMutation.mutate();
    }
  };

  if (!menuItem) return null;

  return (
    <Dialog open={open && !!menuItem} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifica Prodotto</DialogTitle>
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
                      <div
                        key={allergene.value}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-all ${
                          (formData.allergeni || []).includes(allergene.value)
                            ? 'bg-red-50 dark:bg-red-950/30 border-2 border-red-500'
                            : 'bg-muted border-2 border-border hover:bg-accent'
                        }`}
                        onClick={() => toggleAllergene(allergene.value)}
                      >
                        <span className="text-lg">{allergene.icon}</span>
                        <span className="text-sm font-medium">{allergene.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div 
                      className={`flex items-center space-x-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.disponibile 
                          ? 'border-green-500 bg-green-50 dark:bg-green-950/30' 
                          : 'border-border hover:bg-accent'
                      }`}
                      onClick={() => setFormData(prev => ({ ...prev, disponibile: !prev.disponibile }))}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                        formData.disponibile 
                          ? 'border-green-500 bg-green-500' 
                          : 'border-border'
                      }`}>
                        {formData.disponibile && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1">
                        <label className="text-sm font-medium cursor-pointer">
                          Prodotto attivo nel menu
                        </label>
                        <p className="text-xs text-muted-foreground">
                          Se disattivato, non appare nel menu
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div 
                      className={`flex items-center space-x-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.esaurito 
                          ? 'border-red-500 bg-red-50 dark:bg-red-950/30' 
                          : 'border-border hover:bg-accent'
                      }`}
                      onClick={() => setFormData(prev => ({ ...prev, esaurito: !prev.esaurito }))}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                        formData.esaurito 
                          ? 'border-red-500 bg-red-500' 
                          : 'border-border'
                      }`}>
                        {formData.esaurito && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1">
                        <label className="text-sm font-medium cursor-pointer">
                          Prodotto esaurito
                        </label>
                        <p className="text-xs text-muted-foreground">
                          Temporaneamente non disponibile
                        </p>
                      </div>
                    </div>
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
                <Button type="submit" className="bg-red-600 hover:bg-red-700">
                  Salva Modifiche
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
                  className="bg-red-600 hover:bg-red-700"
                  disabled={saveMenuItemModifiersMutation.isPending}
                  onClick={() => saveMenuItemModifiersMutation.mutate(selectedCategoryModifierIds)}
                >
                  {saveMenuItemModifiersMutation.isPending ? 'Salvataggio...' : 'Salva Modificatori'}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}