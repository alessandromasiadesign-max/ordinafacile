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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Check } from 'lucide-react';
import StatusToggle from "../ui/status-toggle";
import { useToast } from "../ui/toast";

export default function EditPromotionDialog({ open, onClose, promotion }) {
  const [formData, setFormData] = useState(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (promotion) {
      setFormData({
        ...promotion,
        regole: promotion.regole || {
          ordine_minimo: 0,
          solo_primo_ordine: false,
          max_utilizzi_totali: 0,
          max_utilizzi_cliente: 1,
          cumulabile: false,
          data_inizio: "",
          data_fine: "",
          giorni_settimana: [],
          orario_inizio: "",
          orario_fine: ""
        }
      });
    }
  }, [promotion]);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Promotion.update(promotion.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      toast({
        title: "✅ Promozione aggiornata!",
        type: "success"
      });
      onClose();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.Promotion.delete(promotion.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      toast({
        title: "✅ Promozione eliminata",
        type: "success"
      });
      onClose();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const toggleGiorno = (giorno) => {
    setFormData(prev => ({
      ...prev,
      regole: {
        ...prev.regole,
        giorni_settimana: prev.regole.giorni_settimana.includes(giorno)
          ? prev.regole.giorni_settimana.filter(g => g !== giorno)
          : [...prev.regole.giorni_settimana, giorno]
      }
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

  const toggleAllGiorni = () => {
    const allDays = giorniSettimana.map(g => g.value);
    setFormData(prev => ({
      ...prev,
      regole: {
        ...prev.regole,
        giorni_settimana: prev.regole.giorni_settimana?.length === 7 ? [] : allDays
      }
    }));
  };

  if (!formData) return null;

  return (
    <Dialog open={open && !!formData} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifica Promozione</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome Promozione *</Label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                required
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <StatusToggle
                active={formData.attivazione === "automatica"}
                onToggle={() => setFormData(prev => ({
                  ...prev,
                  attivazione: prev.attivazione === "automatica" ? "codice" : "automatica",
                  codice: prev.attivazione === "automatica" ? "" : prev.codice
                }))}
                label="Applica automaticamente senza codice"
              />
              <p className="text-xs text-blue-700 mt-2">
                {formData.attivazione === "automatica" 
                  ? "✓ La promo verrà applicata automaticamente se le condizioni sono soddisfatte"
                  : "Il cliente dovrà inserire un codice promo"}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Descrizione</Label>
              <Textarea
                value={formData.descrizione}
                onChange={(e) => setFormData(prev => ({ ...prev, descrizione: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="grid md:grid-cols-3 gap-4">
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
                    <SelectItem value="fisso">Importo Fisso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Valore Sconto *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.valore_sconto}
                  onChange={(e) => setFormData(prev => ({ ...prev, valore_sconto: parseFloat(e.target.value) }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Codice Promo {formData.attivazione === "codice" && "*"}</Label>
                <Input
                  value={formData.codice}
                  onChange={(e) => setFormData(prev => ({ ...prev, codice: e.target.value.toUpperCase() }))}
                  placeholder={formData.attivazione === "automatica" ? "Opzionale" : "PROMO20"}
                  disabled={formData.attivazione === "automatica"}
                  className={formData.attivazione === "automatica" ? "bg-gray-100" : ""}
                />
              </div>
            </div>

            <div className="border-t pt-4 space-y-4">
              <h3 className="font-semibold">Regole di Utilizzo</h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ordine Minimo (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.regole.ordine_minimo}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      regole: { ...prev.regole, ordine_minimo: parseFloat(e.target.value) || 0 }
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Utilizzi Totali (0 = illimitato)</Label>
                  <Input
                    type="number"
                    value={formData.regole.max_utilizzi_totali}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      regole: { ...prev.regole, max_utilizzi_totali: parseInt(e.target.value) || 0 }
                    }))}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Max Utilizzi per Cliente</Label>
                  <Input
                    type="number"
                    value={formData.regole.max_utilizzi_cliente}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      regole: { ...prev.regole, max_utilizzi_cliente: parseInt(e.target.value) || 1 }
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Utilizzi Attuali</Label>
                  <Input
                    type="number"
                    value={formData.utilizzi_attuali}
                    onChange={(e) => setFormData(prev => ({ ...prev, utilizzi_attuali: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data Inizio</Label>
                  <Input
                    type="date"
                    value={formData.regole.data_inizio}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      regole: { ...prev.regole, data_inizio: e.target.value }
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data Fine</Label>
                  <Input
                    type="date"
                    value={formData.regole.data_fine}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      regole: { ...prev.regole, data_fine: e.target.value }
                    }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <Label>Giorni della Settimana</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={toggleAllGiorni}
                    className="text-xs bg-red-50 border-red-300 text-red-700 hover:bg-red-100"
                  >
                    {formData.regole.giorni_settimana?.length === 7 ? '✗ Deseleziona Tutti' : '✓ Seleziona Tutti'}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {giorniSettimana.map(giorno => (
                    <div
                      key={giorno.value}
                      className={`px-4 py-2 rounded-lg border-2 cursor-pointer transition-all ${
                        formData.regole.giorni_settimana?.includes(giorno.value)
                          ? 'border-red-500 bg-red-50 text-red-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => toggleGiorno(giorno.value)}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                          formData.regole.giorni_settimana?.includes(giorno.value)
                            ? 'border-red-500 bg-red-500'
                            : 'border-gray-300'
                        }`}>
                          {formData.regole.giorni_settimana?.includes(giorno.value) && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>
                        <span className="font-medium">{giorno.label}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500">
                  {!formData.regole.giorni_settimana || formData.regole.giorni_settimana.length === 0 
                    ? "Valida tutti i giorni" 
                    : "Valida solo nei giorni selezionati"}
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Orario Inizio</Label>
                  <Input
                    type="time"
                    value={formData.regole.orario_inizio || ""}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      regole: { ...prev.regole, orario_inizio: e.target.value }
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Orario Fine</Label>
                  <Input
                    type="time"
                    value={formData.regole.orario_fine || ""}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      regole: { ...prev.regole, orario_fine: e.target.value }
                    }))}
                  />
                </div>
              </div>
              {(formData.regole.orario_inizio || formData.regole.orario_fine) && (
                <p className="text-xs text-gray-500">
                  Promo valida dalle {formData.regole.orario_inizio || "00:00"} alle {formData.regole.orario_fine || "23:59"}
                </p>
              )}

              <div className="space-y-3">
                <div 
                  className={`flex items-center space-x-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                    formData.regole.solo_primo_ordine 
                      ? 'border-red-500 bg-red-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    regole: { ...prev.regole, solo_primo_ordine: !prev.regole.solo_primo_ordine }
                  }))}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                    formData.regole.solo_primo_ordine 
                      ? 'border-red-500 bg-red-500' 
                      : 'border-gray-300'
                  }`}>
                    {formData.regole.solo_primo_ordine && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <label className="text-sm cursor-pointer flex-1">
                    Valido solo per il primo ordine del cliente
                  </label>
                </div>
                
                <div 
                  className={`flex items-center space-x-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                    formData.regole.cumulabile 
                      ? 'border-red-500 bg-red-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    regole: { ...prev.regole, cumulabile: !prev.regole.cumulabile }
                  }))}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                    formData.regole.cumulabile 
                      ? 'border-red-500 bg-red-500' 
                      : 'border-gray-300'
                  }`}>
                    {formData.regole.cumulabile && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <label className="text-sm cursor-pointer flex-1">
                    Cumulabile con altre promozioni
                  </label>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="flex justify-between">
            <Button 
              type="button" 
              variant="destructive"
              onClick={() => {
                if (confirm("Sei sicuro di voler eliminare questa promozione?")) {
                  deleteMutation.mutate();
                }
              }}
            >
              Elimina
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Annulla
              </Button>
              <Button type="submit" className="bg-red-600 hover:bg-red-700">
                Salva Modifiche
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}