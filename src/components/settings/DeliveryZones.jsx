import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, MapPin } from "lucide-react";

export default function DeliveryZones({ zones = [], onZonesChange, restaurantAddress }) {
  const [newZone, setNewZone] = useState({
    nome: "",
    distanza_max_km: 0,
    costo: 0,
    ordine_minimo: 0
  });

  const addZone = () => {
    if (!newZone.nome || newZone.distanza_max_km <= 0) {
      alert("Inserisci nome e distanza della zona");
      return;
    }

    const updatedZones = [...zones, newZone].sort((a, b) => a.distanza_max_km - b.distanza_max_km);
    onZonesChange(updatedZones);
    setNewZone({
      nome: "",
      distanza_max_km: 0,
      costo: 0,
      ordine_minimo: 0
    });
  };

  const removeZone = (index) => {
    onZonesChange(zones.filter((_, i) => i !== index));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Zone di Consegna
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!restaurantAddress && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
            ⚠️ Inserisci prima l'indirizzo del ristorante nella sezione "Informazioni Generali"
          </div>
        )}

        {zones.length > 0 && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Zone Configurate</Label>
            {zones.map((zone, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="font-semibold">{zone.nome}</div>
                  <div className="text-sm text-gray-600">
                    Fino a {zone.distanza_max_km} km • €{zone.costo.toFixed(2)} consegna
                    {zone.ordine_minimo > 0 && ` • Min. €${zone.ordine_minimo.toFixed(2)}`}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeZone(index)}
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="border-t pt-4">
          <Label className="text-sm font-medium mb-3 block">Aggiungi Nuova Zona</Label>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Nome Zona</Label>
                <Input
                  value={newZone.nome}
                  onChange={(e) => setNewZone(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="es: Centro, Periferia"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Distanza Max (km)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={newZone.distanza_max_km}
                  onChange={(e) => setNewZone(prev => ({ ...prev, distanza_max_km: parseFloat(e.target.value) || 0 }))}
                  placeholder="5"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Costo Consegna (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newZone.costo}
                  onChange={(e) => setNewZone(prev => ({ ...prev, costo: parseFloat(e.target.value) || 0 }))}
                  placeholder="2.50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Ordine Minimo (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newZone.ordine_minimo}
                  onChange={(e) => setNewZone(prev => ({ ...prev, ordine_minimo: parseFloat(e.target.value) || 0 }))}
                  placeholder="10.00"
                />
              </div>
            </div>
            <Button
              onClick={addZone}
              className="w-full"
              variant="outline"
              disabled={!restaurantAddress}
            >
              <Plus className="w-4 h-4 mr-2" />
              Aggiungi Zona
            </Button>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          <strong>💡 Suggerimento:</strong> Crea zone concentriche (es: 0-3km, 3-5km, 5-10km) con costi crescenti per ottimizzare le consegne
        </div>
      </CardContent>
    </Card>
  );
}