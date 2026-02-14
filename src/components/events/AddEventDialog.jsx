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
import { base44 } from "@/api/base44Client";
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
    mutationFn: (data) => base44.entities.Event.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast({
        title: "✅ Evento creato!",
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
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      restaurant_id: restaurantId
    });
  };

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

  const toggleGiorno = (giorno) => {
    setFormData(prev => ({
      ...prev,
      giorni_settimana: prev.giorni_settimana.includes(giorno)
        ? prev.giorni_settimana.filter(g => g !== giorno)
        : [...prev.giorni_settimana, giorno]
    }));
  };

  const giorniSettimana = [
    { value: 'lunedi', label: 'Lun' },
    { value: 'martedi', label: 'Mar' },
    { value: 'mercoledi', label: 'Mer' },
    { value: 'giovedi', label: 'Gio' },
    { value: 'venerdi', label: 'Ven' },
    { value: 'sabato', label: 'Sab' },
    { value: 'domenica', label: 'Dom' }
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
                <label className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center cursor-pointer hover:border-gray-400">
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-500">
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
                  <div
                    key={giorno.value}
                    className={`px-4 py-2 rounded-lg border-2 cursor-pointer transition-all ${
                      formData.giorni_settimana.includes(giorno.value)
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => toggleGiorno(giorno.value)}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                        formData.giorni_settimana.includes(giorno.value)
                          ? 'border-red-500 bg-red-500'
                          : 'border-gray-300'
                      }`}>
                        {formData.giorni_settimana.includes(giorno.value) && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <span className="font-medium">{giorno.label}</span>
                    </div>
                  </div>
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

            <div 
              className={`flex items-center space-x-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                formData.attivo 
                  ? 'border-red-500 bg-red-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setFormData(prev => ({ ...prev, attivo: !prev.attivo }))}
            >
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                formData.attivo 
                  ? 'border-red-500 bg-red-500' 
                  : 'border-gray-300'
              }`}>
                {formData.attivo && <Check className="w-3 h-3 text-white" />}
              </div>
              <label className="text-sm cursor-pointer flex-1">
                Attiva immediatamente
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annulla
            </Button>
            <Button type="submit" className="bg-red-600 hover:bg-red-700">
              Crea Evento
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}