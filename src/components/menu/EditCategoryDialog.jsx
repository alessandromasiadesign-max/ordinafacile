import { Core } from '@/api/integrations';
import { Category } from '@/api/entities';
import React, { useState, useEffect, useRef } from 'react';
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
  const [autosaveState, setAutosaveState] = useState('saved');
  const autosaveInitRef = useRef(true);
  const autosaveTimerRef = useRef(null);
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
      setAutosaveState('saved');
      autosaveInitRef.current = true;
    }
  }, [category]);

  const updateMutation = useMutation({
    mutationFn: (data) => Category.update(category.id, data),
  });

  const buildUpdatePayload = (fd) => ({
    name: String(fd?.nome ?? '').trim(),
    description: fd?.descrizione,
    image_url: fd?.immagine_url,
  });

  useEffect(() => {
    if (!category?.id) return;
    if (!open) return;
    if (activeTab !== 'dettagli') return;

    if (autosaveInitRef.current) {
      autosaveInitRef.current = false;
      return;
    }

    setAutosaveState('dirty');
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);

    autosaveTimerRef.current = setTimeout(() => {
      setAutosaveState('saving');
      const payload = buildUpdatePayload(formData);
      if (!payload?.name) {
        setAutosaveState('dirty');
        return;
      }
      updateMutation.mutate(payload, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['categories'] });
          setAutosaveState('saved');
        },
        onError: (error) => {
          console.error('Errore aggiornamento categoria:', error);
          setAutosaveState('error');
        },
      });
    }, 700);

    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [category?.id, open, activeTab, formData, queryClient, updateMutation]);

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
    const payload = buildUpdatePayload(formData);
    if (!payload?.name) {
      toast({
        title: "Errore",
        description: "Inserisci un nome categoria",
        type: "error",
      });
      return;
    }
    updateMutation.mutate(payload, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['categories'] });
        toast({
          title: "Categoria aggiornata",
          type: "success"
        });
        onClose();
      },
    });
  };

  if (!category) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-start justify-between gap-3">
            <DialogTitle>Modifica Categoria</DialogTitle>
            <div className="text-xs text-muted-foreground pt-1">
              {autosaveState === 'saving'
                ? 'Salvataggio...'
                : autosaveState === 'dirty'
                  ? 'Modifiche non salvate'
                  : autosaveState === 'error'
                    ? 'Errore salvataggio'
                    : 'Salvato'}
            </div>
          </div>
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
                <Button type="submit" className="bg-red-600 hover:bg-red-700" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Salvataggio...' : 'Salva Modifiche'}
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