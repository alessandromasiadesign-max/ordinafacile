import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input"; // Added Input component
import {
  ShoppingCart,
  Phone,
  MapPin,
  Clock,
  Package,
  Truck,
  Search, // Added Search icon
  Filter, // Added Filter icon
  Tag // Added Tag icon
} from "lucide-react";

import OrderModal from "../components/public/OrderModal";
import CartDrawer from "../components/public/CartDrawer";
import LazyImage from "../components/ui/lazy-image";
import { SkeletonCard } from "../components/ui/loading-spinner";

const ALLERGENI = [
  { value: "glutine", label: "Glutine", icon: "🌾" },
  { value: "crostacei", label: "Crostacei", icon: "🦐" },
  { value: "uova", label: "Uova", icon: "🥚" },
  { value: "pesce", label: "Pesce", icon: "🐟" },
  { value: "arachidi", label: "Arachidi", icon: "🥜" },
  { value: "soia", label: "Soia", icon: "🫘" },
  { value: "latte", label: "Latte", icon: "🥛" },
  { value: "frutta_a_guscio", label: "Frutta a guscio", icon: "🌰" },
  { value: "sedano", label: "Sedano", icon: "🥬" },
  { value: "senape", label: "Senape", icon: "🌭" },
  { value: "sesamo", label: "Sesamo", icon: "🫘" },
  { value: "solfiti", label: "Solfiti", icon: "🍷" },
  { value: "lupini", label: "Lupini", icon: "🫘" },
  { value: "molluschi", label: "Molluschi", icon: "🦪" }
];

export default function RestaurantPublic() {
  const urlParams = new URLSearchParams(window.location.search);
  const restaurantId = urlParams.get('id');
  const eventId = urlParams.get('event'); // Added eventId
  
  const [restaurant, setRestaurant] = useState(null);
  const [event, setEvent] = useState(null); // Added event state
  const [deliveryType, setDeliveryType] = useState("consegna");
  const [cart, setCart] = useState(() => {
    const savedCart = localStorage.getItem(`cart_${restaurantId}`);
    return savedCart ? JSON.parse(savedCart) : [];
  });
  const [showCart, setShowCart] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (restaurantId) {
      localStorage.setItem(`cart_${restaurantId}`, JSON.stringify(cart));
    }
  }, [cart, restaurantId]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAllergeni, setSelectedAllergeni] = useState([]);
  const [showAllergeniFilter, setShowAllergeniFilter] = useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', restaurantId, eventId], // Added eventId to queryKey
    queryFn: () => base44.entities.Category.filter(
      eventId 
        ? { restaurant_id: restaurantId, event_id: eventId, attiva: true }
        : { restaurant_id: restaurantId, attiva: true, event_id: null }, // Conditional filter for event_id
      "ordine"
    ),
    enabled: !!restaurantId,
    initialData: [],
  });

  const { data: menuItems = [] } = useQuery({
    queryKey: ['menuItems', restaurantId, eventId], // Added eventId to queryKey
    queryFn: () => base44.entities.MenuItem.filter(
      eventId
        ? { restaurant_id: restaurantId, event_id: eventId, disponibile: true }
        : { restaurant_id: restaurantId, disponibile: true, event_id: null } // Conditional filter for event_id
    ),
    enabled: !!restaurantId,
    initialData: [],
  });

  const { data: promotions = [] } = useQuery({
    queryKey: ['promotions', restaurantId],
    queryFn: () => base44.entities.Promotion.filter({ 
      restaurant_id: restaurantId,
      attiva: true 
    }),
    enabled: !!restaurantId,
    initialData: [],
  });

  useEffect(() => {
    if (restaurantId) {
      loadRestaurant();
    } else {
      setLoading(false);
    }
  }, [restaurantId, eventId]); // Added eventId to dependencies

  const loadRestaurant = async () => {
    setLoading(true);
    try {
      const restaurants = await base44.entities.Restaurant.filter({
        id: restaurantId
      });
      if (restaurants.length > 0) {
        setRestaurant(restaurants[0]);
        if (restaurants[0].modalita_consegna?.length > 0) {
          setDeliveryType(restaurants[0].modalita_consegna[0]);
        }
      }

      if (eventId) { // New: Fetch event details if eventId is present
        const events = await base44.entities.Event.filter({ id: eventId });
        if (events.length > 0) {
          setEvent(events[0]);
        }
      }
    } catch (error) {
      console.error("Errore:", error);
    }
    setLoading(false);
  };

  const addToCart = (item, modifiers = []) => {
    // Calculate total price based on item price and modifiers price
    let itemPrice = item.prezzo;
    const modifiersPrice = modifiers.reduce((sum, modifier) => sum + modifier.prezzo, 0);

    const cartItem = {
      ...item,
      cart_id: Date.now(), // Unique ID for this specific cart item instance
      quantita: 1,
      modificatori: modifiers,
      prezzo_totale: itemPrice + modifiersPrice // Use calculated total price
    };
    setCart(prev => [...prev, cartItem]);
  };

  const removeFromCart = (cartId) => {
    setCart(prev => prev.filter(item => item.cart_id !== cartId));
  };

  const updateQuantity = (cartId, newQuantity) => {
    if (newQuantity === 0) {
      removeFromCart(cartId);
    } else {
      setCart(prev => prev.map(item => 
        item.cart_id === cartId 
          ? { ...item, quantita: newQuantity }
          : item
      ));
    }
  };

  const cartTotal = cart.reduce((sum, item) => 
    sum + (item.prezzo_totale * item.quantita), 0
  );

  const cartCount = cart.reduce((sum, item) => sum + item.quantita, 0);

  const toggleAllergene = (allergene) => {
    setSelectedAllergeni(prev =>
      prev.includes(allergene)
        ? prev.filter(a => a !== allergene)
        : [...prev, allergene]
    );
  };

  const filteredMenuItems = menuItems.filter(item => {
    const matchesSearch = item.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.descrizione?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Check if any selected allergen is present in the item's allergeni list
    const hasProhibitedAllergeni = selectedAllergeni.length > 0 && 
      selectedAllergeni.some(a => (item.allergeni || []).includes(a));
    
    return matchesSearch && !hasProhibitedAllergeni;
  });

  const featuredPromotions = promotions.filter(p => 
    restaurant?.promozioni_evidenza?.includes(p.id)
  ).slice(0, 2);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-64 bg-gray-300 rounded-lg"></div>
            <div className="h-12 bg-gray-300 rounded w-3/4"></div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!restaurantId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500">Errore: ID ristorante non specificato</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500">Ristorante non trovato</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const primaryColor = restaurant.colore_primario || "#e74c3c";
  const bgColor = restaurant.colore_sfondo || "#f8f9fa";

  return (
    <div 
      className="min-h-screen" 
      style={{ 
        backgroundColor: restaurant.immagine_sfondo_url ? 'transparent' : bgColor,
        backgroundImage: restaurant.immagine_sfondo_url ? `url(${restaurant.immagine_sfondo_url})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      <style>{`
        :root {
          --restaurant-primary: ${primaryColor};
        }
      `}</style>

      <header 
        className="text-white py-8 px-4"
        style={{ 
          background: `linear-gradient(135deg, #2c3e50, ${primaryColor})`,
        }}
      >
        {restaurant.immagine_header_url && (
          <div 
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: `url(${restaurant.immagine_header_url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              maxHeight: '300px'
            }}
          />
        )}
        <div className="max-w-6xl mx-auto text-center relative z-10">
          {restaurant.logo_url && (
            <LazyImage 
              src={restaurant.logo_url}
              alt={restaurant.nome}
              className="w-24 h-24 object-contain mx-auto mb-4 bg-white rounded-full p-2"
            />
          )}
          <h1 className="text-4xl font-bold mb-2">
            {restaurant.nome}
            {event && ( // New: Display event name if available
              <Badge className="ml-3 bg-white/20 text-white text-lg">
                {event.nome}
              </Badge>
            )}
          </h1>
          {restaurant.descrizione && (
            <p className="text-lg opacity-90 mb-4 max-w-2xl mx-auto">
              {restaurant.descrizione}
            </p>
          )}
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            {restaurant.telefono && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                <span>{restaurant.telefono}</span>
              </div>
            )}
            {restaurant.indirizzo && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>{restaurant.indirizzo}, {restaurant.citta}</span>
              </div>
            )}
            {restaurant.orari_apertura && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>Orari: Vedi sotto</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {restaurant.modalita_consegna?.length > 0 && (
        <div className="bg-white border-b border-gray-200 py-4 px-4 sticky top-0 z-10">
          <div className="max-w-6xl mx-auto flex justify-center gap-4">
            {restaurant.modalita_consegna.includes("consegna") && (
              <Button
                variant={deliveryType === "consegna" ? "default" : "outline"}
                style={deliveryType === "consegna" ? {
                  backgroundColor: primaryColor,
                  borderColor: primaryColor
                } : {}}
                onClick={() => setDeliveryType("consegna")}
              >
                <Truck className="w-4 h-4 mr-2" />
                Consegna
              </Button>
            )}
            {restaurant.modalita_consegna.includes("asporto") && (
              <Button
                variant={deliveryType === "asporto" ? "default" : "outline"}
                style={deliveryType === "asporto" ? {
                  backgroundColor: primaryColor,
                  borderColor: primaryColor
                } : {}}
                onClick={() => setDeliveryType("asporto")}
              >
                <Package className="w-4 h-4 mr-2" />
                Asporto
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Promozioni in Evidenza */}
      {featuredPromotions.length > 0 && (
        <div className="bg-gradient-to-r from-red-500 to-red-600 text-white py-4 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-4 overflow-x-auto">
              {featuredPromotions.map(promo => (
                <div key={promo.id} className="flex-shrink-0 flex items-center gap-3 bg-white/20 backdrop-blur-sm rounded-lg p-3">
                  <Tag className="w-6 h-6" />
                  <div>
                    <div className="font-bold">{promo.nome}</div>
                    <div className="text-sm opacity-90">{promo.descrizione}</div>
                    {promo.codice && (
                      <div className="text-xs mt-1 bg-white/30 px-2 py-1 rounded inline-block">
                        Codice: <strong>{promo.codice}</strong>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto p-4">
        {/* Barra di Ricerca e Filtri */}
        <Card className="mb-4 md:mb-6 bg-white/95 backdrop-blur-sm">
          <CardContent className="p-3 md:p-4 space-y-3 md:space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 md:w-5 md:h-5" />
              <Input
                placeholder="Cerca prodotti nel menu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 md:pl-10 text-sm md:text-lg"
              />
            </div>

            <Button
              variant="outline"
              onClick={() => setShowAllergeniFilter(!showAllergeniFilter)}
              className="w-full"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filtra per Allergeni
              {selectedAllergeni.length > 0 && (
                <Badge className="ml-2 bg-red-500">{selectedAllergeni.length}</Badge>
              )}
            </Button>

            {showAllergeniFilter && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-2 border rounded-lg">
                {ALLERGENI.map(allergene => (
                  <div
                    key={allergene.value}
                    className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-all ${
                      selectedAllergeni.includes(allergene.value)
                        ? 'bg-red-50 border-2 border-red-500'
                        : 'bg-gray-50 border border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => toggleAllergene(allergene.value)}
                  >
                    <span>{allergene.icon}</span>
                    <span className="text-sm">{allergene.label}</span>
                  </div>
                ))}
              </div>
            )}

            {selectedAllergeni.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
                <p className="font-semibold text-yellow-900">⚠️ Filtro Allergeni Attivo</p>
                <p className="text-yellow-800">
                  I prodotti contenenti {selectedAllergeni.map(a => ALLERGENI.find(al => al.value === a)?.label).join(', ')} saranno nascosti
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {categories.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-gray-500">Il menu non è ancora disponibile</p>
            </CardContent>
          </Card>
        ) : (
          categories.map(category => {
            const items = filteredMenuItems.filter(item => item.category_id === category.id);
            if (items.length === 0) return null;

            return (
              <div key={category.id} className="mb-12">
                <div className="flex items-center gap-4 mb-6">
                  {category.immagine_url && (
                    <LazyImage 
                      src={category.immagine_url}
                      alt={category.nome}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                  )}
                  <div>
                    <h2 
                      className="text-3xl font-bold pb-2 border-b-4"
                      style={{ color: '#2c3e50', borderColor: primaryColor }}
                    >
                      {category.nome}
                    </h2>
                    {category.descrizione && (
                      <p className="text-gray-600 mt-1">{category.descrizione}</p>
                    )}
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {items.map(item => {
                    const hasProhibitedAllergeni = selectedAllergeni.length > 0 && 
                      selectedAllergeni.some(a => (item.allergeni || []).includes(a));
                    
                    const isUnavailable = item.esaurito || hasProhibitedAllergeni;

                    return (
                      <Card 
                        key={item.id}
                        className={`hover:shadow-xl transition-all duration-300 ${
                          isUnavailable ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                        } bg-white/95 backdrop-blur-sm`}
                        onClick={() => !isUnavailable && setSelectedItem(item)}
                      >
                        <CardContent className="p-4 md:p-6">
                          <div className="relative">
                            {item.immagine_url && (
                              <LazyImage 
                                src={item.immagine_url}
                                alt={item.nome}
                                className="w-full h-48 object-cover rounded-lg mb-4"
                              />
                            )}
                            {item.esaurito && (
                              <div className={`absolute ${item.immagine_url ? 'inset-0' : 'top-0 right-0'} ${item.immagine_url ? 'bg-black bg-opacity-60 rounded-lg flex items-center justify-center' : ''}`}>
                                <Badge className="bg-red-600 text-white font-bold text-lg px-4 py-2 shadow-lg border-2 border-white">
                                  🚫 ESAURITO
                                </Badge>
                              </div>
                            )}
                          </div>
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="text-base md:text-xl font-bold text-gray-900">
                              {item.nome}
                            </h3>
                            {item.esaurito && !item.immagine_url && (
                              <Badge className="ml-2 bg-red-600 text-white font-bold">
                                🚫 ESAURITO
                              </Badge>
                            )}
                          </div>
                          {item.descrizione && (
                            <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                              {item.descrizione}
                            </p>
                          )}

                          {item.allergeni && item.allergeni.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                              {item.allergeni.map(a => {
                                const allergene = ALLERGENI.find(al => al.value === a);
                                return allergene ? (
                                  <span key={a} className="text-lg" title={allergene.label}>
                                    {allergene.icon}
                                  </span>
                                ) : null;
                              })}
                            </div>
                          )}

                          <div className="flex items-center justify-between gap-2">
                            <span 
                              className="text-xl md:text-2xl font-bold"
                              style={{ color: item.esaurito ? '#999' : primaryColor }}
                            >
                              €{item.prezzo.toFixed(2)}
                            </span>
                            <Button 
                              size="sm"
                              className="text-xs md:text-sm"
                              style={{ backgroundColor: isUnavailable ? '#ccc' : primaryColor }}
                              disabled={isUnavailable}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!isUnavailable) setSelectedItem(item);
                              }}
                            >
                              {item.esaurito ? 'Esaurito' : hasProhibitedAllergeni ? 'Non disponibile' : 'Scegli'}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}

        {restaurant.orari_apertura && (
          <Card className="mt-8">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold mb-4">Orari di Apertura</h3>
              <div className="grid md:grid-cols-2 gap-3">
                {Object.entries(restaurant.orari_apertura).map(([giorno, orario]) => (
                  <div key={giorno} className="flex justify-between">
                    <span className="capitalize font-medium">{giorno}:</span>
                    <span className="text-gray-600">{orario || "Chiuso"}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {cartCount > 0 && (
        <div 
          className="fixed bottom-4 md:bottom-6 right-4 md:right-6 text-white px-4 md:px-6 py-3 md:py-4 rounded-full shadow-2xl cursor-pointer hover:scale-105 transition-transform z-50"
          style={{ backgroundColor: primaryColor }}
          onClick={() => setShowCart(true)}
        >
          <div className="flex items-center gap-2 md:gap-3">
            <ShoppingCart className="w-5 h-5 md:w-6 md:h-6" />
            <div className="text-left">
              <div className="font-bold text-sm md:text-base">€{cartTotal.toFixed(2)}</div>
              <div className="text-xs md:text-sm opacity-90">{cartCount} articoli</div>
            </div>
          </div>
        </div>
      )}

      <OrderModal
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onAdd={(item, modifiers) => {
          addToCart(item, modifiers);
          setSelectedItem(null);
        }}
      />

      <CartDrawer
        open={showCart}
        onClose={() => setShowCart(false)}
        cart={cart}
        restaurant={restaurant}
        deliveryType={deliveryType}
        onUpdateQuantity={updateQuantity}
        onRemove={removeFromCart}
        onClearCart={() => {
          setCart([]);
          localStorage.removeItem(`cart_${restaurantId}`);
        }}
        eventId={eventId}
      />
    </div>
  );
}