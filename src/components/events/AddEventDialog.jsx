import { Core } from '@/api/integrations';
import { Event } from '@/api/entities';
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
import { Check, Upload, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import LazyImage from "../ui/lazy-image";
import { useToast } from "../ui/use-toast";

export default function AddEventDialog({ open, onClose, restaurantId }) {
  const [formData, setFormData] = useState({
    nome: "",
    descrizione: "",
    immagine_url: "",
    data_inizio: "",
    data_fine: "",
    giorni_settimana: [],
    orario_inizio: "",
    orario_fine: "",
    attivo: true
  });
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: async (data) => {
      if (!restaurantId) {
        throw new Error("Ristorante non configurato");
      }

      const payload = {
        ...(data || {}),
        data_inizio: data?.data_inizio ? data.data_inizio : null,
        data_fine: data?.data_fine ? data.data_fine : null,
        orario_inizio: data?.orario_inizio ? data.orario_inizio : null,
        orario_fine: data?.orario_fine ? data.orario_fine : null,
        restaurant_id: restaurantId
      };

      return await Event.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast({
        title: "Evento creato",
        type: "success"
      });
      onClose();
      setFormData({
        nome: "",
        descrizione: "",
        immagine_url: "",
        data_inizio: "",
        data_fine: "",
        giorni_settimana: [],
        orario_inizio: "",
        orario_fine: "",
        attivo: true
      });
    },
    onError: (error) => {
      const msg =
        error?.message ??
        error?.details ??
        error?.error_description ??
        "Impossibile creare l'evento";
      toast({
        title: "Errore creazione evento",
        description: msg,
        type: "error"
      });
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!restaurantId) {
      toast({
        title: "Ristorante non configurato",
        description: "Configura prima il ristorante in Impostazioni.",
        type: "error"
      });
      return;
    }
    createMutation.mutate(formData);
  };

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

  const toggleGiorno = (giorno) => {
    setFormData(prev => ({
      ...prev,
      giorni_settimana: prev.giorni_settimana.includes(giorno)
        ? prev.giorni_settimana.filter(g => g !== giorno)
        : [...prev.giorni_settimana, giorno]
    }));
  };

  const giorniSettimana = [
    { value: 'monday', label: 'Lun' },
    { value: 'tuesday', label: 'Mar' },
    { value: 'wednesday', label: 'Mer' },
    { value: 'thursday', label: 'Gio' },
    { value: 'friday', label: 'Ven' },
    { value: 'saturday', label: 'Sab' },
    { value: 'sunday', label: 'Dom' }
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crea Nuovo Evento</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome Evento *</Label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="es: Matrimonio, Festa Aziendale"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Descrizione</Label>
              <Textarea
                value={formData.descrizione}
                onChange={(e) => setFormData(prev => ({ ...prev, descrizione: e.target.value }))}
                placeholder="Descrivi l'evento..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Immagine Evento</Label>
              {formData.immagine_url ? (
                <div className="relative group">
                  <LazyImage 
                    src={formData.immagine_url}
                    alt="Evento"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setFormData(prev => ({ ...prev, immagine_url: "" }))}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <label className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center cursor-pointer hover:border-muted-foreground">
                  <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">
                    {uploading ? "Caricamento..." : "Carica Immagine"}
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

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data Inizio</Label>
                <Input
                  type="date"
                  value={formData.data_inizio}
                  onChange={(e) => setFormData(prev => ({ ...prev, data_inizio: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Data Fine</Label>
                <Input
                  type="date"
                  value={formData.data_fine}
                  onChange={(e) => setFormData(prev => ({ ...prev, data_fine: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Giorni della Settimana (opzionale)</Label>
              <div className="flex flex-wrap gap-2">
                {giorniSettimana.map(giorno => (
                  <button
                    type="button"
                    key={giorno.value}
                    className={`px-4 py-2 rounded-lg border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                      formData.giorni_settimana.includes(giorno.value)
                        ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-100'
                        : 'border-border hover:bg-accent/60'
                    }`}
                    onClick={() => toggleGiorno(giorno.value)}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                        formData.giorni_settimana.includes(giorno.value)
                          ? 'border-red-500 bg-red-500'
                          : 'border-border'
                      }`}>
                        {formData.giorni_settimana.includes(giorno.value) && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <span className="font-medium">{giorno.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Orario Inizio</Label>
                <Input
                  type="time"
                  value={formData.orario_inizio}
                  onChange={(e) => setFormData(prev => ({ ...prev, orario_inizio: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Orario Fine</Label>
                <Input
                  type="time"
                  value={formData.orario_fine}
                  onChange={(e) => setFormData(prev => ({ ...prev, orario_fine: e.target.value }))}
                />
              </div>
            </div>

            <button
              type="button"
              className={`flex w-full items-center space-x-3 p-3 border-2 rounded-lg text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                formData.attivo 
                  ? 'border-red-500 bg-red-50 dark:bg-red-950/30' 
                  : 'border-border hover:bg-accent/60'
              }`}
              onClick={() => setFormData(prev => ({ ...prev, attivo: !prev.attivo }))}
            >
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                formData.attivo 
                  ? 'border-red-500 bg-red-500' 
                  : 'border-border'
              }`}>
                {formData.attivo && <Check className="w-3 h-3 text-white" />}
              </div>
              <span className="text-sm flex-1">
                Attiva immediatamente
              </span>
            </button>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annulla
            </Button>
            <Button
              type="submit"
              className="bg-red-600 hover:bg-red-700"
              disabled={createMutation.isPending || !restaurantId}
            >
              {createMutation.isPending ? "Creazione..." : "Crea Evento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}