import { Restaurant, Event } from '@/api/entities';

import React, { useState, useEffect } from "react";
import { supabase } from '@/api/supabaseClient';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, Clock, Repeat, Trash2, Power, PowerOff, QrCode, ExternalLink, Menu } from "lucide-react";
import { createPageUrl } from "@/utils";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import AddEventDialog from "../components/events/AddEventDialog";

export default function Events() {
  const [restaurant, setRestaurant] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);
  const queryClient = useQueryClient();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events', restaurant?.id],
    queryFn: async () => {
      if (!restaurant) return [];
      return Event.filter({ restaurant_id: restaurant.id });
    },
    enabled: !!restaurant,
    initialData: [],
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, attivo }) => Event.update(id, { attivo }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => Event.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });

  useEffect(() => {
    loadRestaurant();
  }, []);

  const loadRestaurant = async () => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return;
      const isAdmin = user?.app_metadata?.role === 'admin' || user?.user_metadata?.role === 'admin';
      const storedId = localStorage.getItem('selected_restaurant_id');

      const restaurants = isAdmin
        ? await Restaurant.list('-created_at')
        : await Restaurant.filter({ user_id: user.id });

      if (restaurants.length > 0) {
        const selected = restaurants.find((r) => r.id === storedId) || restaurants[0];
        if (selected?.id) {
          localStorage.setItem('selected_restaurant_id', selected.id);
        }
        setRestaurant(selected);
      }
    } catch (error) {
      console.error("Errore:", error);
    }
  };

  return (
    <div className="p-4 md:p-8 bg-background text-foreground min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 md:mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Gestione <span className="gradient-text">Eventi</span></h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">Crea menu speciali per eventi e occasioni</p>
          </div>
          <Button
            data-tour="events-add"
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/20"
            onClick={() => setShowAddDialog(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuovo Evento
          </Button>
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-5 w-2/3 bg-muted rounded mb-4" />
                  <div className="h-4 w-1/3 bg-muted rounded mb-6" />
                  <div className="h-32 bg-muted rounded mb-4" />
                  <div className="h-9 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : events.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Calendar className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Crea il tuo primo evento</h2>
              <p className="text-muted-foreground mb-6">
                Gestisci menu speciali per matrimoni, feste, banchetti e altre occasioni
              </p>
              <Button
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/20"
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
              const eventMenuUrl = restaurant?.id ? `${window.location.origin}/r/${restaurant.id}?event=${event.id}` : "#";
              const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(eventMenuUrl)}`;
              const isActive = !!event?.attivo;
              const eventName = event?.nome;
              const eventDescription = event?.descrizione;
              const eventImageUrl = event?.immagine_url;
              const startDate = event?.data_inizio;
              const endDate = event?.data_fine;
              const startTime = event?.orario_inizio;
              const endTime = event?.orario_fine;
              const weekdays = event?.giorni_settimana;
              
              return (
                <Card key={event.id} className="transition-all hover:shadow-lg hover:shadow-orange-500/5 border-border/50 overflow-hidden">
                  <CardContent className="p-6">
                    {eventImageUrl && (
                      <img
                        src={eventImageUrl}
                        alt={eventName}
                        className="w-full h-32 object-cover rounded-xl mb-4"
                      />
                    )}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-lg md:text-xl font-bold mb-2 truncate gradient-text">{eventName}</h3>
                        <Badge
                          className={
                            isActive
                              ? "bg-green-500 text-white dark:bg-green-950/30 dark:text-green-100"
                              : "bg-muted text-muted-foreground"
                          }
                        >
                          {isActive ? "Attivo" : "Disattivato"}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="icon" 
                          variant="outline"
                          aria-label={isActive ? "Disattiva evento" : "Attiva evento"}
                          title={isActive ? "Disattiva evento" : "Attiva evento"}
                          onClick={() => toggleActiveMutation.mutate({ 
                            id: event.id, 
                            attivo: !isActive 
                          })}
                          disabled={toggleActiveMutation.isPending}
                        >
                          {isActive ? (
                            <PowerOff className="w-4 h-4 text-red-600" />
                          ) : (
                            <Power className="w-4 h-4 text-green-600" />
                          )}
                        </Button>
                        <Button 
                          size="icon" 
                          variant="outline"
                          aria-label="Elimina evento"
                          title="Elimina evento"
                          onClick={() => setEventToDelete(event)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                    {eventDescription && (
                      <p className="text-muted-foreground text-sm mb-4">{eventDescription}</p>
                    )}
                    <div className="space-y-1.5 text-sm text-muted-foreground mb-4">
                      {startDate && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>
                            Dal {new Date(startDate).toLocaleDateString('it-IT')}
                            {endDate && ` al ${new Date(endDate).toLocaleDateString('it-IT')}`}
                          </span>
                        </div>
                      )}
                      {startTime && (
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>
                            {startTime} - {endTime || "Fine giornata"}
                          </span>
                        </div>
                      )}
                      {weekdays && weekdays.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Repeat className="w-4 h-4" />
                          <span>
                            {weekdays.map(g => g.charAt(0).toUpperCase() + g.slice(1, 3)).join(', ')}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* QR Code e Link */}
                    <div className="border-t border-border pt-4">
                      <div className="grid grid-cols-1 sm:grid-cols-[128px_1fr] gap-4 items-start">
                        <div className="flex justify-center sm:justify-start">
                          <img 
                            src={qrCodeUrl}
                            alt="QR Code Evento"
                            className="w-32 h-32 border-2 border-border rounded-lg p-2 bg-background"
                          />
                        </div>

                        <div className="space-y-2">
                          <Button
                            variant="outline"
                            className="w-full justify-start"
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = qrCodeUrl;
                              link.download = `qr-evento-${String(eventName || 'evento').replace(/\s/g, '-')}.png`;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            }}
                          >
                            <QrCode className="w-4 h-4 mr-2" />
                            Scarica QR Code
                          </Button>
                          
                          <Button
                            variant="outline"
                            className="w-full justify-start"
                            onClick={() => window.open(eventMenuUrl, '_blank')}
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Apri Menu Evento
                          </Button>

                          <Button
                            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white justify-start shadow-md shadow-orange-500/15"
                            onClick={() => window.location.href = createPageUrl(`EventMenu?id=${event.id}`)}
                          >
                            <Menu className="w-4 h-4 mr-2" />
                            Gestisci Menu Evento
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <AlertDialog open={!!eventToDelete} onOpenChange={(open) => !open && setEventToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminare evento?</AlertDialogTitle>
              <AlertDialogDescription>
                Vuoi eliminare l'evento "{eventToDelete?.nome}"? L'operazione è definitiva.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteMutation.isPending}>Annulla</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                disabled={deleteMutation.isPending}
                onClick={() => {
                  const id = eventToDelete?.id;
                  setEventToDelete(null);
                  if (!id) return;
                  deleteMutation.mutate(id);
                }}
              >
                Elimina
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AddEventDialog
          open={showAddDialog}
          onClose={() => setShowAddDialog(false)}
          restaurantId={restaurant?.id}
        />
      </div>
    </div>
  );
}
