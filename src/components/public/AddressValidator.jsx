import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from '@/api/supabaseClient';

export default function AddressValidator({ restaurant, onAddressValidated }) {
  const [address, setAddress] = useState("");
  const [validating, setValidating] = useState(false);
  const [result, setResult] = useState(null);

  const geocode = async (addr) => {
    const { data, error } = await supabase.functions.invoke('geocode-address', {
      body: {
        address: addr,
        city: restaurant?.citta,
        country: 'Italia',
      },
    });

    if (error) {
      throw new Error(error?.message || 'Errore geocoding');
    }

    if (data?.error) {
      throw new Error(String(data.error));
    }

    const lat = data?.result?.lat;
    const lng = data?.result?.lng;

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      throw new Error('Coordinate non disponibili');
    }

    return { lat, lng };
  };

  const isPointInPolygon = (point, polygonPoints) => {
    const pts = Array.isArray(polygonPoints) ? polygonPoints : [];
    if (pts.length < 3) return false;
    const x = Number(point?.lng);
    const y = Number(point?.lat);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return false;

    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const xi = Number(pts[i]?.lng);
      const yi = Number(pts[i]?.lat);
      const xj = Number(pts[j]?.lng);
      const yj = Number(pts[j]?.lat);
      if (!Number.isFinite(xi) || !Number.isFinite(yi) || !Number.isFinite(xj) || !Number.isFinite(yj)) {
        continue;
      }

      const intersect =
        (yi > y) !== (yj > y) &&
        x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

      if (intersect) inside = !inside;
    }
    return inside;
  };

  const validateAddress = async () => {
    if (!address.trim()) {
      alert("Inserisci un indirizzo");
      return;
    }

    setValidating(true);
    setResult(null);

    try {
      // Geocode customer address
      const customerGeocode = await geocode(address);

      // Get restaurant coordinates if not set
      let restaurantCoords = restaurant.coordinate_ristorante;
      if (!restaurantCoords?.lat || !restaurantCoords?.lng) {
        restaurantCoords = await geocode(restaurant.indirizzo);
      }

      // Calculate distance using Haversine formula
      const distance = calculateDistance(
        restaurantCoords.lat,
        restaurantCoords.lng,
        customerGeocode.lat,
        customerGeocode.lng
      );

      // Find applicable zone
      const zones = restaurant.zone_consegna || [];

      const polygonZones = zones.filter((z) => z?.tipo === 'polygon' && Array.isArray(z?.points));
      const concentricZones = zones
        .filter((z) => z?.tipo === 'concentric' || !z?.tipo)
        .slice();

      const customerPoint = { lat: customerGeocode.lat, lng: customerGeocode.lng };

      const polygonMatch = polygonZones.find((z) => isPointInPolygon(customerPoint, z.points));
      const concentricMatch = concentricZones
        .filter((z) => {
          const maxKm = Number(z?.distanza_max_km ?? 0) || 0;
          return maxKm > 0 && distance <= maxKm;
        })
        .sort((a, b) => (Number(a?.distanza_max_km ?? 0) || 0) - (Number(b?.distanza_max_km ?? 0) || 0))[0];

      const applicableZone = polygonMatch || concentricMatch;

      if (!applicableZone) {
        setResult({
          success: false,
          message: "Siamo spiacenti, non consegnamo in questa zona",
          distance: distance.toFixed(2)
        });
      } else {
        setResult({
          success: true,
          zone: applicableZone,
          distance: distance.toFixed(2),
          deliveryCost: applicableZone.costo,
          minOrder: applicableZone.ordine_minimo
        });
        onAddressValidated(address, applicableZone, distance);
      }
    } catch (error) {
      console.error("Validation error:", error);
      setResult({
        success: false,
        message: "Errore nella validazione dell'indirizzo. Verifica l'indirizzo inserito."
      });
    }

    setValidating(false);
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth radius in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const toRad = (degrees) => {
    return degrees * (Math.PI / 180);
  };

  return (
    <Card className="border-2 border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-2 text-blue-900 dark:text-blue-100 font-semibold">
          <Navigation className="w-5 h-5" />
          <span>Verifica Zona di Consegna</span>
        </div>

        <div className="space-y-2">
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Inserisci il tuo indirizzo completo (via, numero civico)"
            className="bg-background"
            onKeyPress={(e) => e.key === 'Enter' && validateAddress()}
          />

          <Button
            onClick={validateAddress}
            disabled={validating || !address.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {validating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Verifica in corso...
              </>
            ) : (
              <>
                <MapPin className="w-4 h-4 mr-2" />
                Verifica Indirizzo
              </>
            )}
          </Button>
        </div>

        {result && (
          <div className={`p-4 rounded-lg ${result.success ? 'bg-green-100 border border-green-300 dark:bg-green-950/30 dark:border-green-900' : 'bg-red-100 border border-red-300 dark:bg-red-950/30 dark:border-red-900'}`}>
            {result.success ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-green-800 dark:text-green-200 font-semibold">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Consegniamo al tuo indirizzo!</span>
                </div>
                <div className="text-sm text-green-700 dark:text-green-200 space-y-1">
                  <div>📍 Distanza: {result.distance} km</div>
                  <div>🚚 Zona: {result.zone.nome}</div>
                  <div>💰 Costo consegna: €{result.deliveryCost.toFixed(2)}</div>
                  {result.minOrder > 0 && (
                    <div>📦 Ordine minimo: €{result.minOrder.toFixed(2)}</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-red-800 dark:text-red-200 font-semibold">
                  <AlertCircle className="w-5 h-5" />
                  <span>Zona non coperta</span>
                </div>
                <div className="text-sm text-red-700 dark:text-red-200">
                  {result.message}
                  {result.distance && ` (Distanza: ${result.distance} km)`}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}