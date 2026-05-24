import { Core } from '@/api/integrations';
import { Category } from '@/api/entities';
import React, { useState, useEffect } from 'react';
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
import { Upload, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "../ui/use-toast";

import CategoryModifierManager from "./CategoryModifierManager";

export default function EditCategoryDialog({ open, onClose, category }) {
  const [formData, setFormData] = useState({
    nome: "",
    descrizione: "",
    immagine_url: ""
  });
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("dettagli");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (category) {
      setFormData({
        nome: category.nome || "",
        descrizione: category.descrizione || "",
        immagine_url: category.immagine_url || ""
      });
      setActiveTab("dettagli");
    }
  }, [category]);

  const updateMutation = useMutation({
    mutationFn: (data) => Category.update(category.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({
        title: "Categoria aggiornata",
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

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate({
      name: formData.nome,
      description: formData.descrizione,
      image_url: formData.immagine_url,
    });
  };

  if (!category) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifica Categoria</DialogTitle>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dettagli">Dettagli</TabsTrigger>
            <TabsTrigger value="modificatori">Modificatori</TabsTrigger>
          </TabsList>

          <TabsContent value="dettagli">
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome Categoria *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="descrizione">Descrizione</Label>
                  <Textarea
                    id="descrizione"
                    value={formData.descrizione}
                    onChange={(e) => setFormData(prev => ({ ...prev, descrizione: e.target.value }))}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Immagine Categoria</Label>
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
                <Button type="submit" className="bg-red-600 hover:bg-red-700">
                  Salva Modifiche
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>

          <TabsContent value="modificatori" className="py-4">
            <CategoryModifierManager
              category={category}
              onClose={() => setActiveTab("dettagli")}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}