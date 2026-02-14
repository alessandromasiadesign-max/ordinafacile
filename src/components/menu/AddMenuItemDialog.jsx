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
import { base44 } from "@/api/base44Client";
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

export default function AddMenuItemDialog({ open, onClose, category, restaurantId }) {
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
    mutationFn: (data) => base44.entities.MenuItem.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
      toast({
        title: "✅ Prodotto creato!",
        description: "Il prodotto è stato aggiunto al menu con successo",
        type: "success"
      });
      onClose();
      setFormData({ nome: "", descrizione: "", prezzo: 0, immagine_url: "", allergeni: [] });
    },
    onError: () => {
      toast({
        title: "❌ Errore",
        description: "Impossibile creare il prodotto",
        type: "error"
      });
    }
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
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
    createMutation.mutate({
      ...formData,
      restaurant_id: restaurantId,
      category_id: category.id,
      disponibile: true
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
                  <div
                    key={allergene.value}
                    className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-all ${
                      formData.allergeni.includes(allergene.value)
                        ? 'bg-red-50 border-2 border-red-500'
                        : 'bg-gray-50 border-2 border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => toggleAllergene(allergene.value)}
                  >
                    <span className="text-lg">{allergene.icon}</span>
                    <span className="text-sm font-medium">{allergene.label}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500">
                Seleziona gli allergeni presenti in questo prodotto
              </p>
            </div>
            {/* End New Allergeni Section */}

          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annulla
            </Button>
            <Button type="submit" className="bg-red-600 hover:bg-red-700">
              Aggiungi Prodotto
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}