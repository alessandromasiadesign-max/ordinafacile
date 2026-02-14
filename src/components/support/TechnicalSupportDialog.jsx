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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Upload, X, Send } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function TechnicalSupportDialog({ open, onClose, restaurant }) {
  const [formData, setFormData] = useState({
    nome_contatto: "",
    email_contatto: "",
    telefono_contatto: "",
    descrizione: "",
    disponibilita_oraria: "",
    screenshot_urls: []
  });
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open) {
      loadUserData();
    }
  }, [open]);

  const loadUserData = async () => {
    try {
      const user = await base44.auth.me();
      setFormData(prev => ({
        ...prev,
        nome_contatto: user.full_name || "",
        email_contatto: user.email || ""
      }));
    } catch (error) {
      console.error("Errore caricamento dati utente:", error);
    }
  };

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      
      // Crea la richiesta
      const request = await base44.entities.TechnicalSupport.create({
        ...data,
        restaurant_id: restaurant.id,
        user_id: user.id
      });

      // Invia email all'admin
      try {
        const settings = await base44.entities.PlatformSettings.list();
        const emailAssistenza = settings[0]?.email_assistenza || "supporto@ordinafacile.it";
        
        await base44.integrations.Core.SendEmail({
          to: emailAssistenza,
          subject: `🆘 Nuova Richiesta Assistenza - ${restaurant.nome}`,
          body: `
            <h2>Nuova Richiesta di Assistenza</h2>
            <p><strong>Ristorante:</strong> ${restaurant.nome}</p>
            <p><strong>Contatto:</strong> ${data.nome_contatto}</p>
            <p><strong>Email:</strong> ${data.email_contatto}</p>
            <p><strong>Telefono:</strong> ${data.telefono_contatto || "Non fornito"}</p>
            <hr>
            <h3>Descrizione:</h3>
            <p>${data.descrizione.replace(/\n/g, '<br>')}</p>
            ${data.disponibilita_oraria ? `<p><strong>Disponibilità:</strong> ${data.disponibilita_oraria}</p>` : ''}
            ${data.screenshot_urls.length > 0 ? `
              <h3>Screenshot allegati:</h3>
              ${data.screenshot_urls.map((url, i) => `<p><a href="${url}">Screenshot ${i + 1}</a></p>`).join('')}
            ` : ''}
          `
        });
      } catch (emailError) {
        console.error("Errore invio email:", emailError);
      }

      return request;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-requests'] });
      alert("✅ Richiesta inviata con successo! Ti contatteremo presto.");
      onClose();
      resetForm();
    },
  });

  const resetForm = () => {
    setFormData({
      nome_contatto: "",
      email_contatto: "",
      telefono_contatto: "",
      descrizione: "",
      disponibilita_oraria: "",
      screenshot_urls: []
    });
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = files.map(file => 
        base44.integrations.Core.UploadFile({ file })
      );
      const results = await Promise.all(uploadPromises);
      const urls = results.map(r => r.file_url);
      setFormData(prev => ({
        ...prev,
        screenshot_urls: [...prev.screenshot_urls, ...urls]
      }));
    } catch (error) {
      alert("Errore caricamento immagini");
    }
    setUploading(false);
  };

  const removeImage = (index) => {
    setFormData(prev => ({
      ...prev,
      screenshot_urls: prev.screenshot_urls.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.descrizione || !formData.email_contatto) {
      alert("Compila i campi obbligatori");
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            🆘 Richiedi Assistenza
          </DialogTitle>
          <p className="text-sm text-gray-500 mt-2">
            Hai bisogno di aiuto? Compila il form e ti contatteremo presto!
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={formData.nome_contatto}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome_contatto: e.target.value }))}
                  placeholder="Il tuo nome"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Telefono</Label>
                <Input
                  type="tel"
                  value={formData.telefono_contatto}
                  onChange={(e) => setFormData(prev => ({ ...prev, telefono_contatto: e.target.value }))}
                  placeholder="Es: 333 1234567"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={formData.email_contatto}
                onChange={(e) => setFormData(prev => ({ ...prev, email_contatto: e.target.value }))}
                placeholder="tua@email.it"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Descrivi il tuo problema o richiesta *</Label>
              <Textarea
                value={formData.descrizione}
                onChange={(e) => setFormData(prev => ({ ...prev, descrizione: e.target.value }))}
                placeholder="Spiega nel dettaglio cosa ti serve o quale problema stai riscontrando..."
                rows={6}
                required
                className="text-base"
              />
              <p className="text-xs text-gray-500">
                💡 Più dettagli fornisci, più velocemente potremo aiutarti!
              </p>
            </div>

            <div className="space-y-2">
              <Label>Quando sei disponibile per essere contattato? (opzionale)</Label>
              <Input
                value={formData.disponibilita_oraria}
                onChange={(e) => setFormData(prev => ({ ...prev, disponibilita_oraria: e.target.value }))}
                placeholder="Es: Lun-Ven pomeriggio, Sabato mattina"
              />
            </div>

            <div className="space-y-2">
              <Label>Screenshot (opzionale - max 3 immagini)</Label>
              <p className="text-xs text-gray-500 mb-2">
                📸 Allega screenshot se può aiutarci a capire meglio il problema
              </p>
              
              {formData.screenshot_urls.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {formData.screenshot_urls.map((url, index) => (
                    <div key={index} className="relative group">
                      <img src={url} alt={`Screenshot ${index + 1}`} className="w-full h-24 object-cover rounded-lg border" />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeImage(index)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {formData.screenshot_urls.length < 3 && (
                <label className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center cursor-pointer hover:border-gray-400 transition-colors">
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-500">
                    {uploading ? "Caricamento..." : "Clicca per caricare"}
                  </span>
                  <span className="text-xs text-gray-400 mt-1">
                    PNG, JPG (max 2MB ciascuna)
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Annulla
            </Button>
            <Button 
              type="submit" 
              className="bg-red-600 hover:bg-red-700"
              disabled={!formData.descrizione || !formData.email_contatto || createMutation.isPending}
            >
              {createMutation.isPending ? (
                "Invio..."
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Invia Richiesta
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}