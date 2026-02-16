import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "../ui/use-toast";

export default function AddDiscountCodeDialog({ open, onClose }) {
  const [formData, setFormData] = useState({
    codice: "",
    descrizione: "",
    tipo_sconto: "percentuale",
    valore_sconto: 0,
    piani_applicabili: [],
    durata_sconto: "singolo",
    data_inizio: "",
    data_scadenza: "",
    max_utilizzi_totali: 0,
    attivo: true
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SubscriptionDiscountCode.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discount-codes'] });
      toast({
        title: "✅ Codice sconto creato",
        type: "success"
      });
      onClose();
      resetForm();
    },
  });

  const resetForm = () => {
    setFormData({
      codice: "",
      descrizione: "",
      tipo_sconto: "percentuale",
      valore_sconto: 0,
      piani_applicabili: [],
      durata_sconto: "singolo",
      data_inizio: "",
      data_scadenza: "",
      max_utilizzi_totali: 0,
      attivo: true
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.codice) {
      toast({
        title: "⚠️ Inserisci il codice",
        type: "error"
      });
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crea Nuovo Codice Sconto</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Codice Sconto *</Label>
              <Input
                value={formData.codice}
                onChange={(e) => setFormData(prev => ({ ...prev, codice: e.target.value.toUpperCase() }))}
                placeholder="SCONTO2024"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo Sconto</Label>
              <Select
                value={formData.tipo_sconto}
                onValueChange={(value) => setFormData(prev => ({ ...prev, tipo_sconto: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentuale">Percentuale</SelectItem>
                  <SelectItem value="fisso">Fisso (€)</SelectItem>
                  <SelectItem value="mesi_gratis">Mesi Gratis</SelectItem>
                  <SelectItem value="gratis_completo">Abbonamento Gratuito</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrizione</Label>
            <Textarea
              value={formData.descrizione}
              onChange={(e) => setFormData(prev => ({ ...prev, descrizione: e.target.value }))}
              placeholder="Descrizione del codice sconto..."
              rows={2}
            />
          </div>

          {formData.tipo_sconto !== "gratis_completo" && (
            <div className="space-y-2">
              <Label>
                Valore Sconto 
                {formData.tipo_sconto === "percentuale" ? " (%)" :
                 formData.tipo_sconto === "fisso" ? " (€)" :
                 " (numero mesi)"}
              </Label>
              <Input
                type="number"
                step={formData.tipo_sconto === "fisso" ? "0.01" : "1"}
                value={formData.valore_sconto}
                onChange={(e) => setFormData(prev => ({ ...prev, valore_sconto: parseFloat(e.target.value) || 0 }))}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Durata Sconto</Label>
            <Select
              value={formData.durata_sconto}
              onValueChange={(value) => setFormData(prev => ({ ...prev, durata_sconto: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="singolo">Singolo uso (solo primo pagamento)</SelectItem>
                <SelectItem value="ricorrente">Ricorrente (ogni rinnovo)</SelectItem>
                <SelectItem value="permanente">Permanente (finché attivo)</SelectItem>
              </SelectContent>
            </Select>
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
              <Label>Data Scadenza</Label>
              <Input
                type="date"
                value={formData.data_scadenza}
                onChange={(e) => setFormData(prev => ({ ...prev, data_scadenza: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Massimo Utilizzi Totali (0 = illimitato)</Label>
            <Input
              type="number"
              value={formData.max_utilizzi_totali}
              onChange={(e) => setFormData(prev => ({ ...prev, max_utilizzi_totali: parseInt(e.target.value) || 0 }))}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annulla
            </Button>
            <Button type="submit" className="bg-red-600 hover:bg-red-700">
              Crea Codice Sconto
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}