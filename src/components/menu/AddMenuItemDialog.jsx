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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "../ui/use-toast";
import ImageUpload from "../ui/image-upload";

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

export default function AddMenuItemDialog({ open, onClose, category, restaurantId, eventId }) {
  const [formData, setFormData] = useState({
    nome: "",
    descrizione: "",
    prezzo: 0,
    immagine_url: "",
    allergeni: [] // Added new field for allergens
  });
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: (data) => MenuItem.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
      toast({
        title: "Prodotto creato",
        description: "Il prodotto è stato aggiunto al menu con successo",
        type: "success"
      });
      onClose();
      setFormData({ nome: "", descrizione: "", prezzo: 0, immagine_url: "", allergeni: [] });
    },
    onError: (error) => {
      console.error('Errore creazione prodotto:', error);
      toast({
        title: "Errore",
        description: error?.message || "Impossibile creare il prodotto",
        type: "error"
      });
    }
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
      allergeni: prev.allergeni.includes(allergene)
        ? prev.allergeni.filter(a => a !== allergene)
        : [...prev.allergeni, allergene]
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const price = Number(formData.prezzo);
    createMutation.mutate({
      restaurant_id: restaurantId,
      event_id: eventId || null,
      category_id: category.id,
      name: formData.nome,
      description: formData.descrizione,
      price: Number.isFinite(price) ? price : 0,
      image_url: formData.immagine_url,
      allergens: Array.isArray(formData.allergeni) ? formData.allergeni : [],
      is_available: true,
    });
  };

  if (!category) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Aggiungi Prodotto a "{category?.nome}"</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome Prodotto *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="Es: Margherita, Carbonara"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descrizione">Descrizione</Label>
              <Textarea
                id="descrizione"
                value={formData.descrizione}
                onChange={(e) => setFormData(prev => ({ ...prev, descrizione: e.target.value }))}
                placeholder="Ingredienti e descrizione..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prezzo">Prezzo (€) *</Label>
              <Input
                id="prezzo"
                type="number"
                step="0.01"
                min="0"
                value={formData.prezzo}
                onChange={(e) => setFormData(prev => ({ ...prev, prezzo: parseFloat(e.target.value) }))}
                required
              />
            </div>
            <ImageUpload
              value={formData.immagine_url}
              onChange={handleImageUpload}
              onRemove={() => setFormData(prev => ({ ...prev, immagine_url: "" }))}
              uploading={uploading}
              label="Immagine Prodotto (opzionale)"
              recommendedFormat="JPG/PNG"
              recommendedResolution="800x600px"
              maxSize="2MB"
            />

            {/* New Allergeni Section */}
            <div className="space-y-2">
              <Label>Allergeni Presenti</Label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border rounded-lg">
                {ALLERGENI.map(allergene => (
                  <button
                    type="button"
                    key={allergene.value}
                    className={`flex items-center gap-2 p-2 rounded border-2 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                      formData.allergeni.includes(allergene.value)
                        ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-100'
                        : 'border-border bg-muted hover:bg-accent/60'
                    }`}
                    onClick={() => toggleAllergene(allergene.value)}
                    aria-pressed={formData.allergeni.includes(allergene.value)}
                  >
                    <span className="text-lg">{allergene.icon}</span>
                    <span className="text-sm font-medium">{allergene.label}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Seleziona gli allergeni presenti in questo prodotto
              </p>
            </div>
            {/* End New Allergeni Section */}

          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annulla
            </Button>
            <Button type="submit" className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/20">
              Aggiungi Prodotto
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}