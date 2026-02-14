import React, { useState, useEffect } from 'react';
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
import { useToast } from "../ui/toast";

export default function EditLocationDialog({ open, onClose, location }) {
  const [formData, setFormData] = useState(location || {});
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (location) {
      setFormData(location);
    }
  }, [location]);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Location.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      onClose();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate({ id: location.id, data: formData });
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
      modalita_consegna: (prev.modalita_consegna || []).includes(modalita)
        ? (prev.modalita_consegna || []).filter(m => m !== modalita)
        : [...(prev.modalita_consegna || []), modalita]
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifica Sede</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome Sede *</Label>
                <Input
                  value={formData.nome || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>CAP</Label>
                <Input
                  value={formData.cap || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, cap: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Indirizzo *</Label>
                <Input
                  value={formData.indirizzo || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, indirizzo: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Città *</Label>
                <Input
                  value={formData.citta || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, citta: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Telefono</Label>
                <Input
                  type="tel"
                  value={formData.telefono || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, telefono: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
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
                    value={formData.responsabile_nome || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, responsabile_nome: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefono Responsabile</Label>
                  <Input
                    type="tel"
                    value={formData.responsabile_telefono || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, responsabile_telefono: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <Label className="text-lg font-semibold mb-3 block">Modalità Ordini</Label>
              <div className="flex gap-4">
                <div 
                  className={`flex-1 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                    (formData.modalita_consegna || []).includes("consegna") 
                      ? 'border-red-500 bg-red-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => toggleModalita("consegna")}
                >
                  <Checkbox 
                    checked={(formData.modalita_consegna || []).includes("consegna")}
                    className="mr-2"
                  />
                  Consegna a Domicilio
                </div>
                <div 
                  className={`flex-1 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                    (formData.modalita_consegna || []).includes("asporto") 
                      ? 'border-red-500 bg-red-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => toggleModalita("asporto")}
                >
                  <Checkbox 
                    checked={(formData.modalita_consegna || []).includes("asporto")}
                    className="mr-2"
                  />
                  Asporto
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <Label className="text-lg font-semibold mb-3 block">Configurazione Fiscale</Label>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Checkbox
                    checked={!formData.configurazione_fiscale || formData.configurazione_fiscale.usa_principale !== false}
                    onCheckedChange={(checked) => setFormData(prev => ({ 
                      ...prev, 
                      configurazione_fiscale: { 
                        ...(prev.configurazione_fiscale || {}),
                        usa_principale: checked 
                      }
                    }))}
                  />
                  <Label>Usa dati fiscali della sede principale</Label>
                </div>
                <p className="text-xs text-blue-700">
                  {(!formData.configurazione_fiscale || formData.configurazione_fiscale.usa_principale !== false)
                    ? "La sede userà i dati fiscali del ristorante principale"
                    : "Configura dati fiscali specifici per questa sede"}
                </p>
              </div>

              {formData.configurazione_fiscale?.usa_principale === false && (
                <div className="space-y-3 mb-4">
                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Ragione Sociale</Label>
                      <Input
                        value={formData.configurazione_fiscale?.ragione_sociale || ""}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          configurazione_fiscale: {
                            ...(prev.configurazione_fiscale || {}),
                            ragione_sociale: e.target.value
                          }
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>P. IVA</Label>
                      <Input
                        value={formData.configurazione_fiscale?.partita_iva || ""}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          configurazione_fiscale: {
                            ...(prev.configurazione_fiscale || {}),
                            partita_iva: e.target.value
                          }
                        }))}
                      />
                    </div>
                  </div>
                </div>
              )}

              <Label className="text-lg font-semibold mb-3 block">Configurazione Pagamenti</Label>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Checkbox
                    checked={!formData.configurazione_pagamenti || formData.configurazione_pagamenti.usa_principale !== false}
                    onCheckedChange={(checked) => setFormData(prev => ({ 
                      ...prev, 
                      configurazione_pagamenti: { 
                        ...(prev.configurazione_pagamenti || {}),
                        usa_principale: checked 
                      }
                    }))}
                  />
                  <Label>Usa configurazione pagamenti principale</Label>
                </div>
                <p className="text-xs text-blue-700">
                  {(!formData.configurazione_pagamenti || formData.configurazione_pagamenti.usa_principale !== false)
                    ? "I pagamenti verranno accreditati al conto principale"
                    : "Configura conto bancario/PayPal specifico per questa sede"}
                </p>
              </div>

              {formData.configurazione_pagamenti?.usa_principale === false && (
                <div className="space-y-3 mb-4">
                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>IBAN</Label>
                      <Input
                        value={formData.configurazione_pagamenti?.iban || ""}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          configurazione_pagamenti: {
                            ...(prev.configurazione_pagamenti || {}),
                            iban: e.target.value
                          }
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>PayPal Email</Label>
                      <Input
                        type="email"
                        value={formData.configurazione_pagamenti?.paypal_email || ""}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          configurazione_pagamenti: {
                            ...(prev.configurazione_pagamenti || {}),
                            paypal_email: e.target.value
                          }
                        }))}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={formData.attiva}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, attiva: checked }))}
                />
                <Label>Sede attiva</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annulla
            </Button>
            <Button type="submit" className="bg-red-600 hover:bg-red-700">
              Salva Modifiche
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}