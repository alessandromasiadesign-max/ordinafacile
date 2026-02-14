import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, UtensilsCrossed, ChevronDown, ChevronUp } from "lucide-react";

import CategorySection from "../components/menu/CategorySection";
import AddCategoryDialog from "../components/menu/AddCategoryDialog";
import AddMenuItemDialog from "../components/menu/AddMenuItemDialog";

export default function MenuManagement() {
  const [restaurant, setRestaurant] = useState(null);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const queryClient = useQueryClient();

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', restaurant?.id],
    queryFn: async () => {
      if (!restaurant) return [];
      return base44.entities.Category.filter(
        { restaurant_id: restaurant.id },
        "ordine"
      );
    },
    enabled: !!restaurant,
    initialData: [],
  });

  const { data: menuItems = [] } = useQuery({
    queryKey: ['menuItems', restaurant?.id],
    queryFn: async () => {
      if (!restaurant) return [];
      return base44.entities.MenuItem.filter({
        restaurant_id: restaurant.id
      });
    },
    enabled: !!restaurant,
    initialData: [],
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

  const handleAddItem = (category) => {
    setSelectedCategory(category);
    setShowAddItem(true);
  };

  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 md:mb-8">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Gestione Menu</h1>
              <p className="text-sm md:text-base text-gray-500 mt-1">Organizza il tuo menu in categorie</p>
            </div>
            <Button 
              onClick={() => setShowAddCategory(true)}
              className="bg-red-600 hover:bg-red-700 w-full sm:w-auto text-sm md:text-base"
            >
              <Plus className="w-4 h-4 mr-2" />
              Aggiungi Categoria
            </Button>
          </div>

          {categories.length === 0 ? (
            <Card>
              <CardContent className="p-8 md:p-12 text-center">
                <UtensilsCrossed className="w-12 h-12 md:w-16 md:h-16 text-gray-300 mx-auto mb-4" />
                <h2 className="text-xl md:text-2xl font-bold mb-2">Crea il tuo primo menu</h2>
                <p className="text-sm md:text-base text-gray-600 mb-6">
                  Inizia creando categorie come "Pizze", "Antipasti", "Bevande"
                </p>
                <Button 
                  onClick={() => setShowAddCategory(true)}
                  className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Crea Prima Categoria
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {categories.map((category) => {
                const categoryItems = menuItems.filter(item => item.category_id === category.id);
                const isExpanded = expandedCategories.has(category.id);

                return (
                  <Card key={category.id} className="hover:shadow-md transition-shadow">
                    <div 
                      className="p-4 md:p-6 cursor-pointer"
                      onClick={() => toggleCategory(category.id)}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                          {category.immagine_url && (
                            <img 
                              src={category.immagine_url} 
                              alt={category.nome}
                              className="w-12 h-12 md:w-16 md:h-16 object-cover rounded-lg flex-shrink-0"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <h3 className="text-lg md:text-2xl font-bold truncate">{category.nome}</h3>
                            {category.descrizione && (
                              <p className="text-xs md:text-sm text-gray-600 mt-1 line-clamp-1">{category.descrizione}</p>
                            )}
                            <p className="text-xs md:text-sm text-gray-500 mt-1">
                              {categoryItems.length} prodotti
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddItem(category);
                            }}
                            className="bg-red-600 hover:bg-red-700 text-xs md:text-sm hidden sm:flex"
                          >
                            <Plus className="w-3 h-3 md:w-4 md:h-4 md:mr-1" />
                            <span className="hidden md:inline">Prodotto</span>
                          </Button>
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 md:w-6 md:h-6 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 md:w-6 md:h-6 text-gray-400" />
                          )}
                        </div>
                      </div>

                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddItem(category);
                        }}
                        className="bg-red-600 hover:bg-red-700 w-full mt-3 sm:hidden text-xs"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Aggiungi Prodotto
                      </Button>
                    </div>

                    {isExpanded && (
                      <CategorySection
                        category={category}
                        menuItems={categoryItems}
                        onAddItem={() => handleAddItem(category)}
                        isExpanded={isExpanded}
                      />
                    )}
                  </Card>
                );
              })}
            </div>
          )}

          <AddCategoryDialog
            open={showAddCategory}
            onClose={() => setShowAddCategory(false)}
            restaurantId={restaurant?.id}
          />

          <AddMenuItemDialog
            open={showAddItem}
            onClose={() => {
              setShowAddItem(false);
              setSelectedCategory(null);
            }}
            category={selectedCategory}
            restaurantId={restaurant?.id}
          />
        </div>
      </div>
    </div>
  );
}