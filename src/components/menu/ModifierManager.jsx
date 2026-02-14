import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Check } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function ModifierManager({ menuItem, onClose }) {
  const [newModifier, setNewModifier] = useState({
    nome: "",
    tipo: "singolo",
    obbligatorio: false,
    opzioni: []
  });
  const [newOption, setNewOption] = useState({ nome: "", prezzo_extra: 0 });
  const queryClient = useQueryClient();

  const { data: modifiers = [] } = useQuery({
    queryKey: ['modifiers', menuItem?.id],
    queryFn: () => base44.entities.Modifier.filter({ menu_item_id: menuItem.id }),
    enabled: !!menuItem,
    initialData: [],
  });

  const createModifierMutation = useMutation({
    mutationFn: (data) => base44.entities.Modifier.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modifiers'] });
      setNewModifier({
        nome: "",
        tipo: "singolo",
        obbligatorio: false,
        opzioni: []
      });
    },
  });

  const deleteModifierMutation = useMutation({
    mutationFn: (id) => base44.entities.Modifier.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modifiers'] });
    },
  });

  const addOption = () => {
    if (!newOption.nome.trim()) return;
    setNewModifier(prev => ({
      ...prev,
      opzioni: [...prev.opzioni, { ...newOption }]
    }));
    setNewOption({ nome: "", prezzo_extra: 0 });
  };

  const removeOption = (index) => {
    setNewModifier(prev => ({
      ...prev,
      opzioni: prev.opzioni.filter((_, i) => i !== index)
    }));
  };

  const handleSaveModifier = () => {
    if (!newModifier.nome.trim() || newModifier.opzioni.length === 0) {
      alert("Inserisci nome modificatore e almeno un'opzione");
      return;
    }

    createModifierMutation.mutate({
      ...newModifier,
      menu_item_id: menuItem.id
    });
  };

  if (!menuItem) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold">Modificatori per: {menuItem.nome}</h3>
        <Button variant="outline" onClick={onClose}>Chiudi</Button>
      </div>

      {/* Lista modificatori esistenti */}
      {modifiers.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold">Modificatori Attivi</h4>
          {modifiers.map(mod => (
            <Card key={mod.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h5 className="font-bold text-lg">{mod.nome}</h5>
                    <div className="flex gap-2 mt-1">
                      <Badge variant={mod.tipo === "singolo" ? "default" : "secondary"}>
                        {mod.tipo === "singolo" ? "Selezione Singola" : "Selezione Multipla"}
                      </Badge>
                      {mod.obbligatorio && (
                        <Badge variant="destructive">Obbligatorio</Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      if (confirm("Eliminare questo modificatore?")) {
                        deleteModifierMutation.mutate(mod.id);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-1">
                  {mod.opzioni?.map((opt, i) => (
                    <div key={i} className="flex justify-between text-sm border-b pb-1">
                      <span>{opt.nome}</span>
                      {opt.prezzo_extra > 0 && (
                        <span className="text-red-600 font-semibold">
                          +€{opt.prezzo_extra.toFixed(2)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Form nuovo modificatore */}
      <Card>
        <CardHeader>
          <CardTitle>Aggiungi Nuovo Modificatore</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nome Modificatore</Label>
            <Input
              value={newModifier.nome}
              onChange={(e) => setNewModifier(prev => ({ ...prev, nome: e.target.value }))}
              placeholder="es: Formato Pizza, Ingredienti Extra..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo Selezione</Label>
              <Select
                value={newModifier.tipo}
                onValueChange={(value) => setNewModifier(prev => ({ ...prev, tipo: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="singolo">Singola (radio)</SelectItem>
                  <SelectItem value="multiplo">Multipla (checkbox)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 flex items-end">
              <div 
                className={`flex items-center space-x-2 p-3 border-2 rounded-lg cursor-pointer transition-all w-full ${
                  newModifier.obbligatorio 
                    ? 'border-red-500 bg-red-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setNewModifier(prev => ({ ...prev, obbligatorio: !prev.obbligatorio }))}
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                  newModifier.obbligatorio 
                    ? 'border-red-500 bg-red-500' 
                    : 'border-gray-300'
                }`}>
                  {newModifier.obbligatorio && <Check className="w-3 h-3 text-white" />}
                </div>
                <label className="text-sm cursor-pointer">
                  Obbligatorio
                </label>
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h5 className="font-semibold mb-3">Opzioni</h5>
            
            {newModifier.opzioni.length > 0 && (
              <div className="space-y-2 mb-4">
                {newModifier.opzioni.map((opt, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span>{opt.nome}</span>
                    <div className="flex items-center gap-3">
                      {opt.prezzo_extra > 0 && (
                        <span className="text-red-600 font-semibold">
                          +€{opt.prezzo_extra.toFixed(2)}
                        </span>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeOption(i)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <Input
                  value={newOption.nome}
                  onChange={(e) => setNewOption(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="Nome opzione"
                />
              </div>
              <Input
                type="number"
                step="0.01"
                value={newOption.prezzo_extra}
                onChange={(e) => setNewOption(prev => ({ ...prev, prezzo_extra: parseFloat(e.target.value) || 0 }))}
                placeholder="€ extra"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full mt-2"
              onClick={addOption}
            >
              <Plus className="w-4 h-4 mr-2" />
              Aggiungi Opzione
            </Button>
          </div>

          <Button
            className="w-full bg-red-600 hover:bg-red-700"
            onClick={handleSaveModifier}
            disabled={createModifierMutation.isPending}
          >
            Salva Modificatore
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}