import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Circle, Polygon, Marker, useMap } from 'react-leaflet';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, MapPin, Save } from "lucide-react";
import 'leaflet/dist/leaflet.css';

function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 13);
    }
  }, [center, map]);
  return null;
}

export default function DeliveryZonesMap({ zones = [], onZonesChange, restaurantCoords }) {
  const [mapMode, setMapMode] = useState("concentric");
  const [concentricZones, setConcentricZones] = useState([]);
  const [polygonZones, setPolygonZones] = useState([]);
  const [newZone, setNewZone] = useState({
    nome: "",
    raggio_km: 0,
    costo: 0,
    ordine_minimo: 0
  });

  const defaultCenter = restaurantCoords || { lat: 40.8518, lng: 14.2681 };

  useEffect(() => {
    if (zones.length > 0) {
      const concentric = zones.filter(z => z.tipo === 'concentric' || !z.tipo);
      const polygon = zones.filter(z => z.tipo === 'polygon');
      setConcentricZones(concentric);
      setPolygonZones(polygon);
    }
  }, [zones]);

  const addConcentricZone = () => {
    if (!newZone.nome || newZone.raggio_km <= 0) {
      alert("Inserisci nome e raggio della zona");
      return;
    }

    const zone = {
      ...newZone,
      tipo: 'concentric',
      center: restaurantCoords
    };

    const updated = [...concentricZones, zone].sort((a, b) => a.raggio_km - b.raggio_km);
    setConcentricZones(updated);
    onZonesChange([...updated, ...polygonZones]);
    
    setNewZone({
      nome: "",
      raggio_km: 0,
      costo: 0,
      ordine_minimo: 0
    });
  };

  const removeZone = (index, type) => {
    if (type === 'concentric') {
      const updated = concentricZones.filter((_, i) => i !== index);
      setConcentricZones(updated);
      onZonesChange([...updated, ...polygonZones]);
    } else {
      const updated = polygonZones.filter((_, i) => i !== index);
      setPolygonZones(updated);
      onZonesChange([...concentricZones, ...updated]);
    }
  };

  const getZoneColor = (index) => {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    return colors[index % colors.length];
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Zone di Consegna - Mappa Interattiva
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!restaurantCoords && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
            ⚠️ Inserisci prima l'indirizzo del ristorante e salva per visualizzare la mappa
          </div>
        )}

        <div className="space-y-2">
          <Label>Modalità Mappa</Label>
          <Select value={mapMode} onValueChange={setMapMode}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="concentric">Zone Concentriche (Cerchi)</SelectItem>
              <SelectItem value="polygon">Zone Personalizzate (Poligoni)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {restaurantCoords && (
          <div className="h-96 rounded-lg overflow-hidden border-2 border-gray-200">
            <MapContainer 
              center={[defaultCenter.lat, defaultCenter.lng]} 
              zoom={13} 
              style={{ height: '100%', width: '100%' }}
            >
              <MapUpdater center={[defaultCenter.lat, defaultCenter.lng]} />
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />
              
              <Marker position={[defaultCenter.lat, defaultCenter.lng]} />

              {mapMode === 'concentric' && concentricZones.map((zone, index) => (
                <Circle
                  key={index}
                  center={[defaultCenter.lat, defaultCenter.lng]}
                  radius={zone.raggio_km * 1000}
                  pathOptions={{
                    color: getZoneColor(index),
                    fillColor: getZoneColor(index),
                    fillOpacity: 0.2,
                    weight: 2
                  }}
                />
              ))}
            </MapContainer>
          </div>
        )}

        {mapMode === 'concentric' && (
          <>
            {concentricZones.length > 0 && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Zone Configurate</Label>
                {concentricZones.map((zone, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-3 rounded-lg border-2"
                    style={{ borderColor: getZoneColor(index), backgroundColor: `${getZoneColor(index)}10` }}
                  >
                    <div className="flex-1">
                      <div className="font-semibold">{zone.nome}</div>
                      <div className="text-sm text-gray-600">
                        Raggio {zone.raggio_km} km • €{zone.costo.toFixed(2)} consegna
                        {zone.ordine_minimo > 0 && ` • Min. €${zone.ordine_minimo.toFixed(2)}`}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeZone(index, 'concentric')}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t pt-4">
              <Label className="text-sm font-medium mb-3 block">Aggiungi Zona Concentrica</Label>
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
                    <Label className="text-xs">Raggio (km)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={newZone.raggio_km}
                      onChange={(e) => setNewZone(prev => ({ ...prev, raggio_km: parseFloat(e.target.value) || 0 }))}
                      placeholder="3"
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
                  onClick={addConcentricZone}
                  className="w-full"
                  disabled={!restaurantCoords}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Aggiungi Zona Concentrica
                </Button>
              </div>
            </div>
          </>
        )}

        {mapMode === 'polygon' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
            <strong>📍 Modalità Poligonale</strong>
            <p className="mt-2">
              La modalità poligonale richiede strumenti avanzati di disegno mappa. 
              Per ora utilizza le zone concentriche, oppure contatta l'assistenza per configurare zone personalizzate.
            </p>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          <strong>💡 Suggerimento:</strong> Le zone concentriche sono perfette per la maggior parte dei ristoranti. 
          Crea cerchi di consegna con costi progressivi (es: 0-3km gratis, 3-5km €2, 5-10km €4)
        </div>
      </CardContent>
    </Card>
  );
}