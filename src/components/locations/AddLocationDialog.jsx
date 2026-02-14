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
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useToast } from "../ui/use-toast";

export default function AddLocationDialog({ open, onClose, restaurantId }) {
  const [formData, setFormData] = useState({
    nome: "",
    indirizzo: "",
    citta: "",
    cap: "",
    telefono: "",
    email: "",
    immagine_url: "",
    menu_condiviso: true,
    responsabile_nome: "",
    responsabile_telefono: "",
    orari_apertura: {
      lunedi: "",
      martedi: "",
      mercoledi: "",
      giovedi: "",
      venerdi: "",
      sabato: "",
      domenica: ""
    },
    modalita_consegna: [],
    attiva: true
  });
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Location.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast({
        title: "✅ Sede aggiunta!",
        type: "success"
      });
      onClose();
      setFormData({
        nome: "",
        indirizzo: "",
        citta: "",
        cap: "",
        telefono: "",
        email: "",
        immagine_url: "",
        menu_condiviso: true,
        responsabile_nome: "",
        responsabile_telefono: "",
        orari_apertura: {
          lunedi: "", martedi: "", mercoledi: "", giovedi: "", venerdi: "", sabato: "", domenica: ""
        },
        modalita_consegna: [],
        attiva: true
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

  const toggleModalita = (modalita) => {
    setFormData(prev => ({
      ...prev,
      modalita_consegna: prev.modalita_consegna.includes(modalita)
        ? prev.modalita_consegna.filter(m => m !== modalita)
        : [...prev.modalita_consegna, modalita]
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Aggiungi Nuova Sede</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome Sede *</Label>
                <Input
                  value={formData.nome}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="es: Sede Centro, Filiale Nord"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>CAP</Label>
                <Input
                  value={formData.cap}
                  onChange={(e) => setFormData(prev => ({ ...prev, cap: e.target.value }))}
                  placeholder="00100"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Indirizzo *</Label>
                <Input
                  value={formData.indirizzo}
                  onChange={(e) => setFormData(prev => ({ ...prev, indirizzo: e.target.value }))}
                  placeholder="Via Roma, 123"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Città *</Label>
                <Input
                  value={formData.citta}
                  onChange={(e) => setFormData(prev => ({ ...prev, citta: e.target.value }))}
                  placeholder="Milano"
                  required
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Telefono</Label>
                <Input
                  type="tel"
                  value={formData.telefono}
                  onChange={(e) => setFormData(prev => ({ ...prev, telefono: e.target.value }))}
                  placeholder="02 1234567"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="sede@ristorante.it"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Immagine Sede</Label>
              <p className="text-xs text-gray-500 mb-2">
                📸 Formato consigliato: JPG/PNG | Risoluzione: 1200x600px | Max 2MB
              </p>
              {formData.immagine_url ? (
                <div className="relative group">
                  <img 
                    src={formData.immagine_url}
                    alt="Sede"
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
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

            <div className="border-t pt-4">
              <Label className="text-lg font-semibold mb-3 block">Responsabile Sede</Label>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome Responsabile</Label>
                  <Input
                    value={formData.responsabile_nome}
                    onChange={(e) => setFormData(prev => ({ ...prev, responsabile_nome: e.target.value }))}
                    placeholder="Mario Rossi"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefono Responsabile</Label>
                  <Input
                    type="tel"
                    value={formData.responsabile_telefono}
                    onChange={(e) => setFormData(prev => ({ ...prev, responsabile_telefono: e.target.value }))}
                    placeholder="333 1234567"
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <Label className="text-lg font-semibold mb-3 block">Modalità Ordini</Label>
              <div className="flex gap-4">
                <div 
                  className={`flex-1 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                    formData.modalita_consegna.includes("consegna") 
                      ? 'border-red-500 bg-red-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => toggleModalita("consegna")}
                >
                  <Checkbox 
                    checked={formData.modalita_consegna.includes("consegna")}
                    className="mr-2"
                  />
                  Consegna a Domicilio
                </div>
                <div 
                  className={`flex-1 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                    formData.modalita_consegna.includes("asporto") 
                      ? 'border-red-500 bg-red-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => toggleModalita("asporto")}
                >
                  <Checkbox 
                    checked={formData.modalita_consegna.includes("asporto")}
                    className="mr-2"
                  />
                  Asporto
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center space-x-2 mb-4">
                <Checkbox
                  checked={formData.menu_condiviso}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, menu_condiviso: checked }))}
                />
                <Label>Usa menu condiviso (stesso del ristorante principale)</Label>
              </div>
              <p className="text-sm text-gray-500">
                {formData.menu_condiviso 
                  ? "Questa sede userà lo stesso menu del ristorante principale"
                  : "Questa sede avrà un menu personalizzato. Potrai clonare il menu principale e modificarlo."
                }
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm">
              <p className="font-semibold text-amber-900 mb-1">💰 Abbonamento Sede</p>
              <p className="text-amber-800">
                Ogni sede aggiuntiva richiede un abbonamento pari al 50% del piano base.
                L'abbonamento verrà attivato dopo il pagamento.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annulla
            </Button>
            <Button type="submit" className="bg-red-600 hover:bg-red-700">
              Crea Sede
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}