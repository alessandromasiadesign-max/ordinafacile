import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, AlertCircle, CheckCircle2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function AddressValidator({ restaurant, onAddressValidated }) {
  const [address, setAddress] = useState("");
  const [validating, setValidating] = useState(false);
  const [result, setResult] = useState(null);

  const validateAddress = async () => {
    if (!address.trim()) {
      alert("Inserisci un indirizzo");
      return;
    }

    setValidating(true);
    setResult(null);

    try {
      // Geocode customer address
      const customerGeocode = await base44.integrations.Core.InvokeLLM({
        prompt: `Get GPS coordinates (latitude and longitude) for this address: "${address}, ${restaurant.citta}, Italia". Return ONLY a JSON object with lat and lng as numbers, no other text.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            lat: { type: "number" },
            lng: { type: "number" }
          }
        }
      });

      // Get restaurant coordinates if not set
      let restaurantCoords = restaurant.coordinate_ristorante;
      if (!restaurantCoords?.lat || !restaurantCoords?.lng) {
        const restaurantGeocode = await base44.integrations.Core.InvokeLLM({
          prompt: `Get GPS coordinates (latitude and longitude) for this address: "${restaurant.indirizzo}, ${restaurant.citta}, Italia". Return ONLY a JSON object with lat and lng as numbers, no other text.`,
          add_context_from_internet: true,
          response_json_schema: {
            type: "object",
            properties: {
              lat: { type: "number" },
              lng: { type: "number" }
            }
          }
        });
        restaurantCoords = restaurantGeocode;
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
      const applicableZone = zones
        .sort((a, b) => a.distanza_max_km - b.distanza_max_km)
        .find(zone => distance <= zone.distanza_max_km);

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
    <Card className="border-2 border-blue-200 bg-blue-50">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-2 text-blue-900 font-semibold">
          <Navigation className="w-5 h-5" />
          <span>Verifica Zona di Consegna</span>
        </div>

        <div className="space-y-2">
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Inserisci il tuo indirizzo completo (via, numero civico)"
            className="bg-white"
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
          <div className={`p-4 rounded-lg ${result.success ? 'bg-green-100 border border-green-300' : 'bg-red-100 border border-red-300'}`}>
            {result.success ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-green-800 font-semibold">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Consegniamo al tuo indirizzo!</span>
                </div>
                <div className="text-sm text-green-700 space-y-1">
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
                <div className="flex items-center gap-2 text-red-800 font-semibold">
                  <AlertCircle className="w-5 h-5" />
                  <span>Zona non coperta</span>
                </div>
                <div className="text-sm text-red-700">
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