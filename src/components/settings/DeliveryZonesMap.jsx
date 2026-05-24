import React, { useMemo, useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Circle, Polygon, Marker, useMap, useMapEvents } from 'react-leaflet';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, MapPin } from "lucide-react";
import 'leaflet/dist/leaflet.css';
import { supabase } from '@/api/supabaseClient';

function MapUpdater({ center }) {
  const map = useMap();

  useEffect(() => {
    if (center) {
      map.setView(center, 13);
    }
  }, [center, map]);
  return null;
}

function PolygonClickCapture({ enabled, onAddPoint }) {
  useMapEvents({
    click(e) {
      if (!enabled) return;
      const lat = e?.latlng?.lat;
      const lng = e?.latlng?.lng;
      if (typeof lat !== 'number' || typeof lng !== 'number') return;
      onAddPoint({ lat, lng });
    },
  });
  return null;
}

export default function DeliveryZonesMap({ zones = [], onZonesChange, restaurantCoords, restaurantAddress, restaurantCity }) {
  const [mapMode, setMapMode] = useState("concentric");
  const [concentricZones, setConcentricZones] = useState([]);
  const [polygonZones, setPolygonZones] = useState([]);
  const [coordinates, setCoordinates] = useState(restaurantCoords);
  const [geocoding, setGeocoding] = useState(false);
  const lastGeocodeKeyRef = useRef(null);
  const [newZone, setNewZone] = useState({
    nome: "",
    distanza_max_km: 0,
    costo: 0,
    ordine_minimo: 0
  });

  const [draftPolygon, setDraftPolygon] = useState({
    nome: "",
    costo: 0,
    ordine_minimo: 0,
    points: [],
  });

  const defaultCenter = coordinates || { lat: 40.8518, lng: 14.2681 };

  const normalizedZones = useMemo(() => {
    const safe = Array.isArray(zones) ? zones : [];
    return safe.map((z) => ({
      ...(z || {}),
      distanza_max_km: Number(z?.distanza_max_km ?? 0) || 0,
      costo: Number(z?.costo ?? 0) || 0,
      ordine_minimo: Number(z?.ordine_minimo ?? 0) || 0,
      points: Array.isArray(z?.points) ? z.points : z?.points?.coordinates,
    }));
  }, [zones]);

  useEffect(() => {
    if (!restaurantAddress) return;
    const key = `${restaurantAddress}||${restaurantCity || ''}`;
    if (lastGeocodeKeyRef.current === key) return;
    lastGeocodeKeyRef.current = key;
    geocodeAddress(restaurantAddress, restaurantCity);
  }, [restaurantAddress, restaurantCity]);

  const geocodeAddress = async (address, city) => {
    setGeocoding(true);
    try {
      const { data, error } = await supabase.functions.invoke('geocode-address', {
        body: {
          address,
          city,
          country: 'Italia',
        },
      });

      if (!error && !data?.error) {
        const lat = data?.result?.lat;
        const lng = data?.result?.lng;
        if (typeof lat === 'number' && typeof lng === 'number') {
          setCoordinates({ lat, lng });
          return;
        }
      }

      const q = [address, city, 'Italia'].filter(Boolean).join(', ');
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=it&accept-language=it&q=${encodeURIComponent(q)}`
      );

      const fallback = await response.json().catch(() => []);
      if (fallback && fallback.length > 0) {
        const coords = {
          lat: parseFloat(fallback[0].lat),
          lng: parseFloat(fallback[0].lon)
        };
        setCoordinates(coords);
      }
    } catch (error) {
      console.error("Geocoding error:", error);
    } finally {
      setGeocoding(false);
    }
  };

  useEffect(() => {
    const concentric = normalizedZones.filter((z) => z?.tipo === 'concentric' || !z?.tipo);
    const polygon = normalizedZones
      .filter((z) => z?.tipo === 'polygon')
      .map((z) => ({
        ...z,
        points: Array.isArray(z?.points)
          ? z.points
          : (Array.isArray(z?.coordinates) ? z.coordinates : []),
      }));
    setConcentricZones(concentric);
    setPolygonZones(polygon);
  }, [normalizedZones]);

  const addConcentricZone = () => {
    const nome = String(newZone?.nome ?? '').trim();
    const distanza = Number(newZone?.distanza_max_km ?? 0) || 0;
    if (!nome || distanza <= 0) {
      alert("Inserisci nome e distanza della zona");
      return;
    }

    const zone = {
      ...newZone,
      nome,
      distanza_max_km: distanza,
      costo: Number(newZone?.costo ?? 0) || 0,
      ordine_minimo: Number(newZone?.ordine_minimo ?? 0) || 0,
      tipo: 'concentric',
      center: coordinates
    };

    const updated = [...concentricZones, zone].sort((a, b) => a.distanza_max_km - b.distanza_max_km);
    setConcentricZones(updated);
    onZonesChange([...updated, ...polygonZones]);

    setNewZone({
      nome: "",
      distanza_max_km: 0,
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

  const updateConcentricZone = (index, patch) => {
    const updated = (concentricZones || [])
      .map((z, i) => (i === index ? { ...(z || {}), ...(patch || {}) } : z))
      .map((z) => ({
        ...z,
        distanza_max_km: Number(z?.distanza_max_km ?? 0) || 0,
        costo: Number(z?.costo ?? 0) || 0,
        ordine_minimo: Number(z?.ordine_minimo ?? 0) || 0,
      }))
      .sort((a, b) => (a.distanza_max_km ?? 0) - (b.distanza_max_km ?? 0));
    setConcentricZones(updated);
    onZonesChange([...updated, ...polygonZones]);
  };

  const addDraftPoint = (p) => {
    setDraftPolygon((prev) => ({
      ...(prev || {}),
      points: [...(Array.isArray(prev?.points) ? prev.points : []), p],
    }));
  };

  const undoDraftPoint = () => {
    setDraftPolygon((prev) => ({
      ...(prev || {}),
      points: (Array.isArray(prev?.points) ? prev.points : []).slice(0, -1),
    }));
  };

  const resetDraftPolygon = () => {
    setDraftPolygon({ nome: "", costo: 0, ordine_minimo: 0, points: [] });
  };

  const saveDraftPolygonZone = () => {
    const nome = String(draftPolygon?.nome ?? '').trim();
    const points = Array.isArray(draftPolygon?.points) ? draftPolygon.points : [];
    if (!nome) {
      alert('Inserisci il nome della zona');
      return;
    }
    if (points.length < 3) {
      alert('Per salvare un poligono servono almeno 3 punti (clicca sulla mappa)');
      return;
    }

    const zone = {
      tipo: 'polygon',
      nome,
      costo: Number(draftPolygon?.costo ?? 0) || 0,
      ordine_minimo: Number(draftPolygon?.ordine_minimo ?? 0) || 0,
      points,
    };

    const updated = [...(polygonZones || []), zone];
    setPolygonZones(updated);
    onZonesChange([...(concentricZones || []), ...updated]);
    resetDraftPolygon();
  };

  const updatePolygonZone = (index, patch) => {
    const updated = (polygonZones || []).map((z, i) => {
      if (i !== index) return z;
      const next = { ...(z || {}), ...(patch || {}) };
      return {
        ...next,
        nome: String(next?.nome ?? ''),
        costo: Number(next?.costo ?? 0) || 0,
        ordine_minimo: Number(next?.ordine_minimo ?? 0) || 0,
        points: Array.isArray(next?.points) ? next.points : [],
      };
    });
    setPolygonZones(updated);
    onZonesChange([...(concentricZones || []), ...updated]);
  };

  const removePolygonZone = (index) => {
    const updated = (polygonZones || []).filter((_, i) => i !== index);
    setPolygonZones(updated);
    onZonesChange([...(concentricZones || []), ...updated]);
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
        {!restaurantAddress && (
          <div className="bg-yellow-50 border border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-900 rounded-lg p-4 text-sm text-yellow-800 dark:text-yellow-100">
            ⚠️ Inserisci prima l'indirizzo del ristorante nella sezione "Informazioni Generali" e salva
          </div>
        )}

        {geocoding && (
          <div className="bg-blue-50 border border-blue-200 dark:bg-blue-950/30 dark:border-blue-900 rounded-lg p-4 text-sm text-blue-800 dark:text-blue-100">
            🔍 Ricerca delle coordinate per l'indirizzo...
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

        {coordinates && (
          <div className="relative h-96 rounded-xl overflow-hidden border bg-background shadow-sm">
            <MapContainer
              center={[defaultCenter.lat, defaultCenter.lng]}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
              className="z-0"
            >
              <MapUpdater center={[defaultCenter.lat, defaultCenter.lng]} />
              <PolygonClickCapture enabled={mapMode === 'polygon'} onAddPoint={addDraftPoint} />
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
              />
              
              <Marker position={[defaultCenter.lat, defaultCenter.lng]} />

              {mapMode === 'concentric' && concentricZones.map((zone, index) => (
                <Circle
                  key={index}
                  center={[defaultCenter.lat, defaultCenter.lng]}
                  radius={(Number(zone.distanza_max_km ?? 0) || 0) * 1000}
                  pathOptions={{
                    color: getZoneColor(index),
                    fillColor: getZoneColor(index),
                    fillOpacity: 0.2,
                    weight: 2
                  }}
                />
              ))}

              {polygonZones.map((zone, index) => (
                <Polygon
                  key={`poly-${index}`}
                  positions={(Array.isArray(zone?.points) ? zone.points : []).map((p) => [p.lat, p.lng])}
                  pathOptions={{
                    color: getZoneColor(index),
                    fillColor: getZoneColor(index),
                    fillOpacity: 0.18,
                    weight: 2,
                  }}
                />
              ))}

              {mapMode === 'polygon' && Array.isArray(draftPolygon?.points) && draftPolygon.points.length >= 2 && (
                <Polygon
                  positions={draftPolygon.points.map((p) => [p.lat, p.lng])}
                  pathOptions={{
                    color: '#111827',
                    fillColor: '#111827',
                    fillOpacity: 0.08,
                    weight: 2,
                    dashArray: '6 6',
                  }}
                />
              )}
            </MapContainer>

            {mapMode === 'concentric' && concentricZones.length > 0 && (
              <div className="absolute top-3 left-3 right-3 md:right-auto md:w-80 bg-background/95 backdrop-blur rounded-xl border shadow-sm p-3 space-y-2 z-10">
                <div className="text-sm font-semibold text-foreground">Legenda zone</div>
                <div className="space-y-2">
                  {concentricZones
                    .slice()
                    .sort((a, b) => (a.distanza_max_km ?? 0) - (b.distanza_max_km ?? 0))
                    .map((zone, index) => (
                      <div key={`${zone.nome}-${index}`} className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2 min-w-0">
                          <div
                            className="mt-1 h-3 w-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: getZoneColor(index) }}
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{zone.nome}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              Fino a {zone.distanza_max_km} km • €{Number(zone.costo ?? 0).toFixed(2)}
                              {Number(zone.ordine_minimo ?? 0) > 0 && ` • Min. €${Number(zone.ordine_minimo ?? 0).toFixed(2)}`}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {mapMode === 'polygon' && (
              <div className="absolute top-3 left-3 right-3 md:right-auto md:w-[22rem] bg-background/95 backdrop-blur rounded-xl border shadow-sm p-3 space-y-3 z-10">
                <div className="text-sm font-semibold text-foreground">Disegna zona poligonale</div>
                <div className="text-xs text-muted-foreground">
                  Clicca sulla mappa per aggiungere punti. Servono almeno 3 punti.
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Nome</Label>
                    <Input
                      value={draftPolygon.nome}
                      onChange={(e) => setDraftPolygon((p) => ({ ...(p || {}), nome: e.target.value }))}
                      placeholder="es: Centro storico"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Costo (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={Number(draftPolygon.costo ?? 0)}
                      onChange={(e) => setDraftPolygon((p) => ({ ...(p || {}), costo: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <Label className="text-xs">Ordine minimo (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={Number(draftPolygon.ordine_minimo ?? 0)}
                      onChange={(e) => setDraftPolygon((p) => ({ ...(p || {}), ordine_minimo: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs text-muted-foreground">
                    Punti: <span className="font-semibold">{Array.isArray(draftPolygon.points) ? draftPolygon.points.length : 0}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="secondary" size="sm" onClick={undoDraftPoint} disabled={(draftPolygon.points || []).length === 0}>
                      Undo
                    </Button>
                    <Button type="button" variant="secondary" size="sm" onClick={resetDraftPolygon} disabled={(draftPolygon.points || []).length === 0}>
                      Reset
                    </Button>
                    <Button type="button" size="sm" onClick={saveDraftPolygonZone} className="font-semibold bg-foreground text-background hover:bg-foreground/90 disabled:opacity-60 disabled:text-background disabled:bg-foreground" disabled={(draftPolygon.points || []).length < 3 || !String(draftPolygon?.nome ?? '').trim()}>
                      Salva Zona
                    </Button>
                  </div>
                </div>
              </div>

            )}
          </div>
        )}

        {mapMode === 'concentric' && (
          <>
            {concentricZones.length > 0 && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Zone Concentriche Configurate</Label>
                {concentricZones.map((zone, index) => (
                  <div
                    key={`conc-edit-${index}`}
                    className="flex items-center justify-between p-3 rounded-lg border-2"
                    style={{ borderColor: getZoneColor(index), backgroundColor: `${getZoneColor(index)}10` }}
                  >
                    <div className="flex-1 space-y-2">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                        <div className="md:col-span-2">
                          <Label className="text-xs">Nome</Label>
                          <Input value={String(zone?.nome ?? '')} onChange={(e) => updateConcentricZone(index, { nome: e.target.value })} />
                        </div>
                        <div>
                          <Label className="text-xs">Distanza max (km)</Label>
                          <Input type="number" step="0.1" value={Number(zone?.distanza_max_km ?? 0)} onChange={(e) => updateConcentricZone(index, { distanza_max_km: parseFloat(e.target.value) || 0 })} />
                        </div>
                        <div>
                          <Label className="text-xs">Costo (€)</Label>
                          <Input type="number" step="0.01" value={Number(zone?.costo ?? 0)} onChange={(e) => updateConcentricZone(index, { costo: parseFloat(e.target.value) || 0 })} />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                        <div>
                          <Label className="text-xs">Ordine minimo (€)</Label>
                          <Input type="number" step="0.01" value={Number(zone?.ordine_minimo ?? 0)} onChange={(e) => updateConcentricZone(index, { ordine_minimo: parseFloat(e.target.value) || 0 })} />
                        </div>
                        <div className="md:col-span-3 flex items-end">
                          <div className="text-xs text-muted-foreground">
                            Fino a {Number(zone?.distanza_max_km ?? 0)} km • €{Number(zone?.costo ?? 0).toFixed(2)} consegna
                            {Number(zone?.ordine_minimo ?? 0) > 0 && ` • Min. €${Number(zone?.ordine_minimo ?? 0).toFixed(2)}`}
                          </div>
                        </div>
                      </div>
                    </div>

                    <Button size="sm" variant="ghost" onClick={() => removeZone(index, 'concentric')}>
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
                    <Input value={newZone.nome} onChange={(e) => setNewZone(prev => ({ ...prev, nome: e.target.value }))} placeholder="es: Centro, Periferia" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Distanza Max (km)</Label>
                    <Input type="number" step="0.1" value={Number(newZone.distanza_max_km ?? 0)} onChange={(e) => setNewZone(prev => ({ ...prev, distanza_max_km: parseFloat(e.target.value) || 0 }))} placeholder="5" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Costo Consegna (€)</Label>
                    <Input type="number" step="0.01" value={Number(newZone.costo ?? 0)} onChange={(e) => setNewZone(prev => ({ ...prev, costo: parseFloat(e.target.value) || 0 }))} placeholder="2.50" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Ordine Minimo (€)</Label>
                    <Input type="number" step="0.01" value={Number(newZone.ordine_minimo ?? 0)} onChange={(e) => setNewZone(prev => ({ ...prev, ordine_minimo: parseFloat(e.target.value) || 0 }))} placeholder="10.00" />
                  </div>
                </div>
                <Button type="button" onClick={addConcentricZone} className="w-full font-semibold bg-foreground text-background hover:bg-foreground/90 disabled:opacity-60 disabled:text-background disabled:bg-foreground" disabled={!coordinates || !String(newZone?.nome ?? '').trim() || (Number(newZone?.distanza_max_km ?? 0) || 0) <= 0}>
                  <Plus className="w-4 h-4 mr-2" />
                  Aggiungi Zona Concentrica
                </Button>
              </div>
            </div>
          </>
        )}

        {mapMode === 'polygon' && (
          <>
            {polygonZones.length > 0 && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Zone Poligonali Configurate</Label>
                {polygonZones.map((zone, index) => (
                  <div
                    key={`poly-edit-${index}`}
                    className="flex items-center justify-between p-3 rounded-lg border-2"
                    style={{ borderColor: getZoneColor(index), backgroundColor: `${getZoneColor(index)}10` }}
                  >
                    <div className="flex-1 space-y-2">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                        <div className="md:col-span-2">
                          <Label className="text-xs">Nome</Label>
                          <Input value={String(zone?.nome ?? '')} onChange={(e) => updatePolygonZone(index, { nome: e.target.value })} />
                        </div>
                        <div>
                          <Label className="text-xs">Costo (€)</Label>
                          <Input type="number" step="0.01" value={Number(zone?.costo ?? 0)} onChange={(e) => updatePolygonZone(index, { costo: parseFloat(e.target.value) || 0 })} />
                        </div>
                        <div>
                          <Label className="text-xs">Ordine minimo (€)</Label>
                          <Input type="number" step="0.01" value={Number(zone?.ordine_minimo ?? 0)} onChange={(e) => updatePolygonZone(index, { ordine_minimo: parseFloat(e.target.value) || 0 })} />
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground">Punti poligono: {Array.isArray(zone?.points) ? zone.points.length : 0}</div>
                    </div>

                    <Button size="sm" variant="ghost" onClick={() => removePolygonZone(index)}>
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <div className="bg-blue-50 border border-blue-200 dark:bg-blue-950/30 dark:border-blue-900 rounded-lg p-4 text-sm text-blue-800 dark:text-blue-100">
          <strong>💡 Suggerimento:</strong> Le zone concentriche sono perfette per la maggior parte dei ristoranti. 
          Crea cerchi di consegna con costi progressivi (es: 0-3km gratis, 3-5km €2, 5-10km €4)
        </div>
      </CardContent>
    </Card>
  );
}