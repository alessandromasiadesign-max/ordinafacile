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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useToast } from "../ui/use-toast";
import LazyImage from "../ui/lazy-image";

import ModifierManager from "./ModifierManager";

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

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.MenuItem.update(menuItem.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
      toast({
        title: "✅ Prodotto aggiornato!",
        type: "success"
      });
      onClose();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.MenuItem.delete(menuItem.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
      toast({
        title: "✅ Prodotto eliminato",
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
      allergeni: (prev.allergeni || []).includes(allergene)
        ? prev.allergeni.filter(a => a !== allergene)
        : [...(prev.allergeni || []), allergene]
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate(formData);
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
                    <label className="border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors">
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-500">
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
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div 
                      className={`flex items-center space-x-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.disponibile 
                          ? 'border-green-500 bg-green-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setFormData(prev => ({ ...prev, disponibile: !prev.disponibile }))}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                        formData.disponibile 
                          ? 'border-green-500 bg-green-500' 
                          : 'border-gray-300'
                      }`}>
                        {formData.disponibile && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1">
                        <label className="text-sm font-medium cursor-pointer">
                          Prodotto attivo nel menu
                        </label>
                        <p className="text-xs text-gray-500">
                          Se disattivato, non appare nel menu
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div 
                      className={`flex items-center space-x-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.esaurito 
                          ? 'border-red-500 bg-red-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setFormData(prev => ({ ...prev, esaurito: !prev.esaurito }))}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                        formData.esaurito 
                          ? 'border-red-500 bg-red-500' 
                          : 'border-gray-300'
                      }`}>
                        {formData.esaurito && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1">
                        <label className="text-sm font-medium cursor-pointer">
                          Prodotto esaurito
                        </label>
                        <p className="text-xs text-gray-500">
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
            <ModifierManager 
              menuItem={menuItem}
              onClose={() => setActiveTab("dettagli")}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}