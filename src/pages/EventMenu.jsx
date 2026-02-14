import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, ArrowLeft, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

import AddCategoryDialog from "../components/menu/AddCategoryDialog";
import AddMenuItemDialog from "../components/menu/AddMenuItemDialog";
import CategorySection from "../components/menu/CategorySection";

export default function EventMenu() {
  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get('id');
  const navigate = useNavigate();
  
  const [restaurant, setRestaurant] = useState(null);
  const [event, setEvent] = useState(null);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const { data: categories = [] } = useQuery({
    queryKey: ['event-categories', eventId],
    queryFn: () => base44.entities.Category.filter({ event_id: eventId }),
    enabled: !!eventId,
    initialData: [],
  });

  useEffect(() => {
    loadData();
  }, [eventId]);

  const loadData = async () => {
    try {
      const user = await base44.auth.me();
      const restaurants = await base44.entities.Restaurant.filter({
        user_id: user.id
      });
      if (restaurants.length > 0) {
        setRestaurant(restaurants[0]);
      }

      if (eventId) {
        const events = await base44.entities.Event.filter({ id: eventId });
        if (events.length > 0) {
          setEvent(events[0]);
        }
      }
    } catch (error) {
      console.error("Errore:", error);
    }
  };

  if (!event) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-500">Caricamento evento...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl("Events"))}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Torna agli Eventi
          </Button>
          
          <div className="flex items-center gap-4 mb-4">
            <Calendar className="w-8 h-8 text-red-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{event.nome}</h1>
              <p className="text-gray-500">Menu Evento</p>
            </div>
            <Badge className={event.attivo ? "bg-green-500" : "bg-gray-500"}>
              {event.attivo ? "Attivo" : "Disattivato"}
            </Badge>
          </div>
        </div>

        <div className="flex justify-end gap-3 mb-6">
          <Button
            onClick={() => setShowAddCategory(true)}
            variant="outline"
            className="border-red-600 text-red-600 hover:bg-red-50"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuova Categoria
          </Button>
          <Button
            onClick={() => setShowAddItem(true)}
            className="bg-red-600 hover:bg-red-700"
            disabled={categories.length === 0}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuovo Prodotto
          </Button>
        </div>

        {categories.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <h2 className="text-2xl font-bold mb-2">Crea il menu per questo evento</h2>
              <p className="text-gray-600 mb-6">
                Inizia creando le categorie (es: Antipasti, Primi, Secondi)
              </p>
              <Button
                onClick={() => setShowAddCategory(true)}
                className="bg-red-600 hover:bg-red-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Crea Prima Categoria
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {categories.map(category => (
              <CategorySection
                key={category.id}
                category={category}
                restaurantId={restaurant?.id}
                eventId={eventId}
              />
            ))}
          </div>
        )}

        <AddCategoryDialog
          open={showAddCategory}
          onClose={() => setShowAddCategory(false)}
          restaurantId={restaurant?.id}
          eventId={eventId}
        />

        <AddMenuItemDialog
          open={showAddItem}
          onClose={() => setShowAddItem(false)}
          categories={categories}
          restaurantId={restaurant?.id}
          eventId={eventId}
        />
      </div>
    </div>
  );
}