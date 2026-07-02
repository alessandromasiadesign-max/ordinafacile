import { Core } from '@/api/integrations';
import { Category } from '@/api/entities';
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
import { Upload, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "../ui/use-toast";

export default function AddCategoryDialog({ open, onClose, restaurantId, eventId }) {

  const [formData, setFormData] = useState({
    nome: "",
    descrizione: "",
    immagine_url: "",
    ordine: 0
  });
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: (data) => Category.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      if (restaurantId) {
        queryClient.invalidateQueries({ queryKey: ['categories', restaurantId] });
      }
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
      if (restaurantId) {
        queryClient.invalidateQueries({ queryKey: ['menuItems', restaurantId] });
      }
      if (eventId) {
        queryClient.invalidateQueries({ queryKey: ['event-categories', eventId] });
      }
      toast({
        title: "Categoria aggiunta",
        type: "success"
      });
      onClose();

      setFormData({ nome: "", descrizione: "", immagine_url: "", ordine: 0 });
    },
    onError: (error) => {
      console.error('Errore creazione categoria:', {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        raw: error,
      });
      const details = [
        error?.message,
        error?.details,
        error?.hint,
        error?.code ? `code: ${error.code}` : null,
      ].filter(Boolean).join(' | ');
      toast({
        title: "Errore",
        description: details || "Impossibile creare la categoria",
        type: "error",
      });
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
      console.error('Errore caricamento immagine:', error);
      toast({
        title: "Errore",
        description: error?.message || "Impossibile caricare l'immagine",
        type: "error",
      });
    }

    setUploading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!restaurantId) {
      toast({
        title: "Errore",
        description: "Ristorante non caricato. Riprova tra qualche secondo.",
        type: "error",
      });
      return;
    }

    const payload = {
      restaurant_id: restaurantId,
      event_id: eventId || null,
      name: formData.nome,
      description: formData.descrizione,
      image_url: formData.immagine_url,
      sort_order: Number.isFinite(Number(formData.ordine)) ? Number(formData.ordine) : 0,
      is_active: true,
    };

    console.log('Creazione categoria payload:', payload);
    createMutation.mutate(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Aggiungi Categoria</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome Categoria *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="Es: Pizze, Antipasti, Bevande"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descrizione">Descrizione</Label>
              <Textarea
                id="descrizione"
                value={formData.descrizione}
                onChange={(e) => setFormData(prev => ({ ...prev, descrizione: e.target.value }))}
                placeholder="Descrizione della categoria..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Immagine Categoria (opzionale)</Label>
              {formData.immagine_url ? (
                <div className="relative">
                  <img 
                    src={formData.immagine_url} 
                    alt="Preview"
                    className="w-full h-40 object-cover rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => setFormData(prev => ({ ...prev, immagine_url: "" }))}
                    aria-label="Rimuovi immagine categoria"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <label className="border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:border-muted-foreground transition-colors">
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
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annulla
            </Button>
            <Button type="submit" className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/20">
              Crea Categoria
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}