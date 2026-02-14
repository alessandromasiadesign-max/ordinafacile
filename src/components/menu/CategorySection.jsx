import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil } from "lucide-react";
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { useToast } from "../ui/toast";

import EditCategoryDialog from "./EditCategoryDialog";
import EditMenuItemDialog from "./EditMenuItemDialog";


export default function CategorySection({ category, menuItems, onAddItem, isExpanded }) {
  const [showEditCategory, setShowEditCategory] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const toggleEsauritoMutation = useMutation({
    mutationFn: ({ id, esaurito }) => base44.entities.MenuItem.update(id, { esaurito }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
      toast({
        title: "✅ Stato aggiornato!",
        type: "success"
      });
    },
    onError: (error) => {
      console.error("Errore aggiornamento:", error);
      toast({
        title: "❌ Errore",
        description: "Impossibile aggiornare lo stato del prodotto",
        type: "error"
      });
    },
  });

  // Handler for toggling 'esaurito' status
  const handleToggleEsaurito = (item, e) => {
    e.stopPropagation(); // Prevent the card's onClick from firing
    toggleEsauritoMutation.mutate({ 
      id: item.id, 
      esaurito: !item.esaurito 
    });
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            {category.immagine_url && (
              <img 
                src={category.immagine_url} 
                alt={category.nome}
                className="w-16 h-16 object-cover rounded-lg"
              />
            )}
            <div>
              <CardTitle className="text-2xl">{category.nome}</CardTitle>
              {category.descrizione && (
                <p className="text-sm text-gray-600 mt-1">{category.descrizione}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setShowEditCategory(true)}
            >
              <Pencil className="w-4 h-4" />
            </Button>
            <Button onClick={onAddItem} className="bg-red-600 hover:bg-red-700">
              <Plus className="w-4 h-4 mr-2" />
              Aggiungi Prodotto
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {menuItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nessun prodotto in questa categoria
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {menuItems.map(item => (
                <Card 
                  key={item.id} 
                  className={`hover:shadow-md transition-shadow cursor-pointer ${
                    item.esaurito ? 'opacity-60' : ''
                  }`}
                  onClick={() => setEditingItem(item)}
                >
                  <CardContent className="p-4">
                    {item.immagine_url && (
                      <div className="relative">
                        <img 
                          src={item.immagine_url}
                          alt={item.nome}
                          className="w-full h-32 object-cover rounded-lg mb-3"
                        />
                        {item.esaurito && (
                          <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                            <Badge className="bg-red-600 text-white text-lg">
                              ESAURITO
                            </Badge>
                          </div>
                        )}
                      </div>
                    )}
                    {!item.immagine_url && item.esaurito && (
                        <div className="w-full h-32 bg-gray-200 rounded-lg mb-3 flex items-center justify-center relative">
                            <Badge className="bg-red-600 text-white text-lg">
                                ESAURITO
                            </Badge>
                        </div>
                    )}
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-lg">{item.nome}</h3>
                      <div className="flex gap-1">
                        {item.esaurito && (
                          <Badge variant="destructive" className="text-xs">
                            Esaurito
                          </Badge>
                        )}
                        {!item.disponibile && (
                          <Badge variant="secondary" className="text-xs">
                            Non disponibile
                          </Badge>
                        )}
                      </div>
                    </div>
                    {item.descrizione && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {item.descrizione}
                      </p>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-xl font-bold text-red-600">
                        €{item.prezzo.toFixed(2)}
                      </span>
                      <div className="flex gap-2">
                        <Button 
                          variant={item.esaurito ? "default" : "outline"}
                          size="sm"
                          onClick={(e) => handleToggleEsaurito(item, e)}
                          className={item.esaurito ? "bg-green-600 hover:bg-green-700" : ""}
                          disabled={toggleEsauritoMutation.isPending} // Disable button while mutation is in progress
                        >
                          {toggleEsauritoMutation.isPending && toggleEsauritoMutation.variables?.id === item.id 
                            ? "Aggiornamento..." 
                            : (item.esaurito ? "Rendi Disponibile" : "Segna come Esaurito")
                          }
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingItem(item);
                          }}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Floating Add Button - visible only when expanded */}
      {isExpanded && menuItems.length > 0 && (
        <div className="flex justify-center -mt-4 mb-4">
          <Button 
            onClick={onAddItem}
            className="bg-red-600 hover:bg-red-700 shadow-lg"
            size="lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            Aggiungi Altro Prodotto
          </Button>
        </div>
      )}

      <EditCategoryDialog
        open={showEditCategory}
        onClose={() => setShowEditCategory(false)}
        category={category}
      />

      <EditMenuItemDialog
        open={!!editingItem}
        onClose={() => setEditingItem(null)}
        menuItem={editingItem}
      />
    </>
  );
}