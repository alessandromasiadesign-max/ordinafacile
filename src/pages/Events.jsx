
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, Trash2, Power, PowerOff, QrCode, ExternalLink, Menu } from "lucide-react";
import { createPageUrl } from "@/utils";

import AddEventDialog from "../components/events/AddEventDialog";

export default function Events() {
  const [restaurant, setRestaurant] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const queryClient = useQueryClient();

  const { data: events = [] } = useQuery({
    queryKey: ['events', restaurant?.id],
    queryFn: async () => {
      if (!restaurant) return [];
      return base44.entities.Event.filter({ restaurant_id: restaurant.id });
    },
    enabled: !!restaurant,
    initialData: [],
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, attivo }) => base44.entities.Event.update(id, { attivo }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Event.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });

  useEffect(() => {
    loadRestaurant();
  }, []);

  const loadRestaurant = async () => {
    try {
      const user = await base44.auth.me();
      const restaurants = await base44.entities.Restaurant.filter({
        user_id: user.id
      });
      if (restaurants.length > 0) {
        setRestaurant(restaurants[0]);
      }
    } catch (error) {
      console.error("Errore:", error);
    }
  };

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestione Eventi</h1>
            <p className="text-gray-500 mt-1">Crea menu speciali per eventi e occasioni</p>
          </div>
          <Button 
            className="bg-red-600 hover:bg-red-700"
            onClick={() => setShowAddDialog(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuovo Evento
          </Button>
        </div>

        {events.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Crea il tuo primo evento</h2>
              <p className="text-gray-600 mb-6">
                Gestisci menu speciali per matrimoni, feste, banchetti e altre occasioni
              </p>
              <Button 
                className="bg-red-600 hover:bg-red-700"
                onClick={() => setShowAddDialog(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Crea Primo Evento
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map(event => {
              const eventMenuUrl = restaurant?.id ? `${window.location.origin}${createPageUrl(`RestaurantPublic?id=${restaurant.id}&event=${event.id}`)}` : "#";
              const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(eventMenuUrl)}`;
              
              return (
                <Card key={event.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    {event.immagine_url && (
                      <img 
                        src={event.immagine_url}
                        alt={event.nome}
                        className="w-full h-32 object-cover rounded-lg mb-4"
                      />
                    )}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold mb-2">{event.nome}</h3>
                        <Badge className={event.attivo ? "bg-green-500" : "bg-gray-500"}>
                          {event.attivo ? "Attivo" : "Disattivato"}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="icon" 
                          variant="ghost"
                          onClick={() => toggleActiveMutation.mutate({ 
                            id: event.id, 
                            attivo: !event.attivo 
                          })}
                        >
                          {event.attivo ? (
                            <PowerOff className="w-4 h-4 text-red-600" />
                          ) : (
                            <Power className="w-4 h-4 text-green-600" />
                          )}
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost"
                          onClick={() => {
                            if (confirm("Eliminare questo evento?")) {
                              deleteMutation.mutate(event.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                    {event.descrizione && (
                      <p className="text-gray-600 text-sm mb-4">{event.descrizione}</p>
                    )}
                    <div className="space-y-1 text-xs text-gray-500 mb-4">
                      {event.data_inizio && (
                        <p>
                          📅 Dal {new Date(event.data_inizio).toLocaleDateString('it-IT')}
                          {event.data_fine && ` al ${new Date(event.data_fine).toLocaleDateString('it-IT')}`}
                        </p>
                      )}
                      {event.orario_inizio && (
                        <p>
                          🕐 {event.orario_inizio} - {event.orario_fine || "Fine giornata"}
                        </p>
                      )}
                      {event.giorni_settimana && event.giorni_settimana.length > 0 && (
                        <p>
                          📆 {event.giorni_settimana.map(g => g.charAt(0).toUpperCase() + g.slice(1, 3)).join(', ')}
                        </p>
                      )}
                    </div>

                    {/* QR Code e Link */}
                    <div className="border-t pt-4 space-y-3">
                      <div className="flex justify-center mb-3">
                        <img 
                          src={qrCodeUrl}
                          alt="QR Code Evento"
                          className="w-32 h-32 border-2 border-gray-200 rounded-lg p-2"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = qrCodeUrl;
                            link.download = `qr-evento-${event.nome.replace(/\s/g, '-')}.png`;
                            document.body.appendChild(link); // Required for Firefox
                            link.click();
                            document.body.removeChild(link); // Clean up
                          }}
                        >
                          <QrCode className="w-4 h-4 mr-2" />
                          Scarica QR Code
                        </Button>
                        
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => window.open(eventMenuUrl, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Apri Menu Evento
                        </Button>

                        <Button
                          className="w-full bg-red-600 hover:bg-red-700"
                          onClick={() => window.location.href = createPageUrl(`EventMenu?id=${event.id}`)}
                        >
                          <Menu className="w-4 h-4 mr-2" />
                          Gestisci Menu Evento
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <AddEventDialog
          open={showAddDialog}
          onClose={() => setShowAddDialog(false)}
          restaurantId={restaurant?.id}
        />
      </div>
    </div>
  );
}
