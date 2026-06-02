import { Restaurant, MenuItem, Category, Promotion, Event } from '@/api/entities';
import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ThemeToggle from "@/components/layout/ThemeToggle";
import { useTheme } from "@/lib/ThemeContext";

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
  Tag, // Added Tag icon
  ChevronLeft,
  ChevronRight,
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
  const { resolvedTheme } = useTheme();
  const params = useParams();
  const urlParams = new URLSearchParams(window.location.search);
  const restaurantId = params?.restaurantId ?? urlParams.get('id');
  const eventId = urlParams.get('event'); // Added eventId
  
  const [restaurant, setRestaurant] = useState(null);
  const [event, setEvent] = useState(null); // Added event state
  const [deliveryType, setDeliveryType] = useState("consegna");
  const [cart, setCart] = useState(() => {
    const savedCart = localStorage.getItem(`cart_${restaurantId}`);
    return savedCart ? JSON.parse(savedCart) : [];
  });
  const [showCart, setShowCart] = useState(false);
  const [cartOpenMode, setCartOpenMode] = useState("cart");
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeCategoryId, setActiveCategoryId] = useState(null);

  useEffect(() => {
    if (restaurantId) {
      localStorage.setItem(`cart_${restaurantId}`, JSON.stringify(cart));
    }
  }, [cart, restaurantId]);

  useEffect(() => {
    setActiveCategoryId(null);
  }, [restaurantId, eventId]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAllergeni, setSelectedAllergeni] = useState([]);
  const [showAllergeniFilter, setShowAllergeniFilter] = useState(false);

  const isRestaurantBlocked = useMemo(() => {
    if (!restaurant) return false;
    if (restaurant.abbonamento_attivo !== true) return true;
    if (!restaurant.abbonamento_scadenza) return false;
    const expiry = new Date(restaurant.abbonamento_scadenza);
    expiry.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return expiry < today;
  }, [restaurant]);

  useEffect(() => {
    if (!isRestaurantBlocked) return;
    setShowCart(false);
    setSelectedItem(null);
    if (cart.length > 0) {
      setCart([]);
    }
  }, [isRestaurantBlocked, cart.length]);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', restaurantId, eventId], // Added eventId to queryKey
    queryFn: async () => {
      const rows = await Category.filter(
        { restaurant_id: restaurantId, is_active: true, event_id: eventId || null },
        "sort_order"
      );

      return (rows || []).map((c) => ({
        ...c,
        nome: c?.nome ?? c?.name,
        descrizione: c?.descrizione ?? c?.description,
        immagine_url: c?.immagine_url ?? c?.image_url,
        ordine: c?.ordine ?? c?.sort_order,
        attivo: c?.attivo ?? c?.is_active,
      }));
    },
    enabled: !!restaurantId,
    initialData: [],
  });

  const { data: menuItems = [] } = useQuery({
    queryKey: ['menuItems', restaurantId, eventId], // Added eventId to queryKey
    queryFn: async () => {
      const rows = await MenuItem.filter(
        { restaurant_id: restaurantId, is_available: true }
      );

      return (rows || []).map((r) => ({
        ...r,
        nome: r?.nome ?? r?.name,
        descrizione: r?.descrizione ?? r?.description,
        prezzo: r?.prezzo ?? r?.price,
        allergeni: r?.allergeni ?? r?.allergens,
        disponibile: r?.disponibile ?? r?.is_available,
        immagine_url: r?.immagine_url ?? r?.image_url,
      }));
    },
    enabled: !!restaurantId,
    initialData: [],
  });

  const { data: promotions = [] } = useQuery({
    queryKey: ['promotions', restaurantId],
    queryFn: () => Promotion.filter({ 
      restaurant_id: restaurantId,
      is_active: true // Changed from attiva to is_active
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
      const restaurants = await Restaurant.filter({
        id: restaurantId
      });
      if (restaurants.length > 0) {
        setRestaurant(restaurants[0]);
        if (restaurants[0].modalita_consegna?.length > 0) {
          setDeliveryType(restaurants[0].modalita_consegna[0]);
        }
      }

      if (eventId) { // New: Fetch event details if eventId is present
        const events = await Event.filter({ id: eventId });
        if (events.length > 0) {
          setEvent(events[0]);
        }
      }
    } catch (error) {
      console.error("Errore:", error);
    }
    setLoading(false);
  };

  const addToCart = (item, modifiers = [], note = "") => {
    if (isRestaurantBlocked) {
      alert("❌ Questo ristorante non può ricevere ordini perché l’abbonamento non risulta attivo o è scaduto.");
      return;
    }
    const basePrice = Number(item?.prezzo ?? 0);
    const safeModifiers = Array.isArray(modifiers) ? modifiers : [];
    const modifiersPrice = safeModifiers.reduce((sum, modifier) => {
      if (typeof modifier === 'string') return sum;
      const extra = Number(modifier?.priceExtra ?? modifier?.prezzo_extra ?? 0);
      return sum + (Number.isFinite(extra) ? extra : 0);
    }, 0);

    const unitPrice = basePrice + modifiersPrice;
    const cartItem = {
      ...item,
      cart_id: Date.now(),
      quantita: 1,
      modificatori: safeModifiers,
      note: note || "",
      prezzo_totale: unitPrice,
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

  const categoriesWithItems = useMemo(() => {
    const catMap = new Map((categories || []).map((c) => [c.id, c]));
    const counts = new Map();
    for (const item of filteredMenuItems) {
      const catId = item?.category_id;
      if (!catId || !catMap.has(catId)) continue;
      counts.set(catId, (counts.get(catId) || 0) + 1);
    }

    return (categories || [])
      .map((c) => ({ category: c, count: counts.get(c.id) || 0 }))
      .filter((x) => x.count > 0);
  }, [categories, filteredMenuItems]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground p-4">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-64 bg-muted rounded-lg"></div>
            <div className="h-12 bg-muted rounded w-3/4"></div>
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
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Errore: ID ristorante non specificato</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Ristorante non trovato</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const primaryColor = restaurant.colore_primario || "#e74c3c";
  const bgColor = restaurant.colore_sfondo;
  const shouldUseThemeBg =
    resolvedTheme === 'dark' && (!bgColor || String(bgColor).toLowerCase() === '#f8f9fa');

  return (
    <div 
      className="min-h-screen" 
      style={{ 
        backgroundColor: restaurant.immagine_sfondo_url
          ? 'transparent'
          : (shouldUseThemeBg ? 'hsl(var(--background))' : (bgColor || 'hsl(var(--background))')),
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
        className="text-white py-8 px-4 relative"
        style={{ 
          background: `linear-gradient(135deg, #2c3e50, ${primaryColor})`,
        }}
      >
        <div className="absolute top-4 right-4 z-20">
          <ThemeToggle compact />
        </div>
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
              className="w-24 h-24 object-contain mx-auto mb-4 bg-background rounded-full p-2"
            />
          )}
          <h1 className="text-4xl font-bold mb-2">
            {restaurant.nome}
            {event && ( // New: Display event name if available
              <Badge className="ml-3 bg-background/20 dark:bg-black/30 text-white text-lg">
                {event?.nome}
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

      {isRestaurantBlocked && (
        <div className="max-w-6xl mx-auto px-4 mt-4">
          <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-4 text-sm text-red-900 dark:text-red-100">
            Questo ristorante al momento <strong>non può ricevere ordini</strong>.
          </div>
        </div>
      )}

      {deliveryType === "consegna" && (restaurant?.zone_consegna?.length || 0) > 0 && !isRestaurantBlocked && (
        <div className="max-w-6xl mx-auto px-4 mt-4">
          <Card className="border-2 border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30">
            <CardContent className="p-4 md:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 mt-0.5 text-blue-700 dark:text-blue-200" />
                <div>
                  <div className="font-semibold text-blue-900 dark:text-blue-100">Verifica Zona di Consegna</div>
                  <div className="text-sm text-blue-800/90 dark:text-blue-100/80">
                    Inserisci il tuo indirizzo per vedere se consegniamo e il costo.
                  </div>
                </div>
              </div>
              <Button
                type="button"
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => {
                  setCartOpenMode("checkout");
                  setShowCart(true);
                }}
              >
                Verifica ora
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {restaurant.modalita_consegna?.length > 0 && (
        <div className="bg-background border-b border-border py-4 px-4 sticky top-0 z-10">
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
                <div key={promo.id} className="flex-shrink-0 flex items-center gap-3 bg-background/20 dark:bg-black/30 backdrop-blur-sm rounded-lg p-3">
                  <Tag className="w-6 h-6" />
                  <div>
                    <div className="font-bold">{promo.nome}</div>
                    <div className="text-sm opacity-90">{promo.descrizione}</div>
                    {promo.codice && (
                      <div className="text-xs mt-1 bg-background/30 dark:bg-black/30 px-2 py-1 rounded inline-block">
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
        <Card className="mb-4 md:mb-6 bg-background/95 backdrop-blur-sm">
          <CardContent className="p-3 md:p-4 space-y-3 md:space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 md:w-5 md:h-5" />
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
                        ? 'bg-red-50 dark:bg-red-950/30 border-2 border-red-500'
                        : 'bg-muted border border-border hover:bg-accent'
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
              <div className="bg-accent/20 dark:bg-accent/30 border border-accent/50 dark:border-accent/70 rounded-lg p-3 text-sm">
                <p className="font-semibold text-accent dark:text-accent/100">⚠️ Filtro Allergeni Attivo</p>
                <p className="text-accent/80 dark:text-accent/100">
                  I prodotti contenenti {selectedAllergeni.map(a => ALLERGENI.find(al => al.value === a)?.label).join(', ')} saranno nascosti
                </p>
              </div>
            )}
          </CardContent>
        </Card>
       {categories.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">Il menu non è ancora disponibile</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {!activeCategoryId ? (
              <div className="space-y-4">
                {categoriesWithItems.map(({ category, count }) => (
                  <Card
                    key={category.id}
                    className="hover:shadow-md transition-shadow cursor-pointer bg-background/95 backdrop-blur-sm"
                    onClick={() => setActiveCategoryId(category.id)}
                  >
                    <CardContent className="p-4 md:p-6">
                      <div className="flex items-center gap-4">
                        {category.immagine_url && (
                          <LazyImage
                            src={category.immagine_url}
                            alt={category.nome}
                            className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-3">
                            <h2 className="text-lg md:text-xl font-bold truncate">{category.nome}</h2>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Badge className="bg-muted text-muted-foreground">{count}</Badge>
                              <ChevronRight className="w-5 h-5 text-muted-foreground" />
                            </div>
                          </div>
                          {category.descrizione && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{category.descrizione}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {categoriesWithItems.length === 0 && (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <p className="text-muted-foreground">Nessun prodotto disponibile con i filtri attivi</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              (() => {
                const activeCategory = (categories || []).find((c) => c.id === activeCategoryId);
                const items = filteredMenuItems.filter((item) => item.category_id === activeCategoryId);

                return (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between gap-3">
                      <Button variant="outline" onClick={() => setActiveCategoryId(null)}>
                        <ChevronLeft className="w-4 h-4 mr-2" />
                        Categorie
                      </Button>
                      <div className="flex-1 text-center">
                        <div className="font-bold text-lg md:text-xl truncate">{activeCategory?.nome}</div>
                        {activeCategory?.descrizione && (
                          <div className="text-sm text-muted-foreground line-clamp-1">{activeCategory.descrizione}</div>
                        )}
                      </div>
                      <div className="w-[98px]" />
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {items.map(item => {
                        const hasProhibitedAllergeni = selectedAllergeni.length > 0 && 
                          selectedAllergeni.some(a => (item.allergeni || []).includes(a));

                        const isUnavailable = item.esaurito || hasProhibitedAllergeni || isRestaurantBlocked;

                        return (
                          <Card 
                            key={item.id}
                            className={`hover:shadow-xl transition-all duration-300 ${
                              isUnavailable ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                            } bg-background/95 backdrop-blur-sm`}
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
                                <h3 className="text-base md:text-xl font-bold">
                                  {item.nome}
                                </h3>
                                {item.esaurito && !item.immagine_url && (
                                  <Badge className="ml-2 bg-red-600 text-white font-bold">
                                    🚫 ESAURITO
                                  </Badge>
                                )}
                              </div>
                              {item.descrizione && (
                                <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
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
                                  {isRestaurantBlocked ? 'Chiuso' : item.esaurito ? 'Esaurito' : hasProhibitedAllergeni ? 'Non disponibile' : 'Scegli'}
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                );
              })()
            )}
          </>
        )}

        {restaurant.orari_apertura && (
          <Card className="mt-8">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold mb-4">Orari di Apertura</h3>
              <div className="grid md:grid-cols-2 gap-3">
                {Object.entries(restaurant.orari_apertura).map(([giorno, orario]) => (
                  <div key={giorno} className="flex justify-between">
                    <span className="capitalize font-medium">{giorno}:</span>
                    <span className="text-muted-foreground">{orario || "Chiuso"}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {restaurant?.modalita_consegna?.includes('consegna') && restaurant?.settings?.delivery_hours && (
          <Card className="mt-6">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold mb-4">Orari di Consegna</h3>
              <div className="grid md:grid-cols-2 gap-3">
                {Object.entries(restaurant.settings.delivery_hours).map(([giorno, orario]) => (
                  <div key={giorno} className="flex justify-between">
                    <span className="capitalize font-medium">{giorno}:</span>
                    <span className="text-muted-foreground">{orario || "Non disponibile"}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {cartCount > 0 && !isRestaurantBlocked && (
        <div 
          className="fixed bottom-4 md:bottom-6 right-4 md:right-6 text-white px-4 md:px-6 py-3 md:py-4 rounded-full shadow-2xl cursor-pointer hover:scale-105 transition-transform z-50"
          style={{ backgroundColor: primaryColor }}
          onClick={() => {
            setCartOpenMode("cart");
            setShowCart(true);
          }}
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
        onAdd={(item, modifiers, note) => {
          addToCart(item, modifiers, note);
          setSelectedItem(null);
        }}
      />

      <CartDrawer
        open={showCart}
        onClose={() => {
          setShowCart(false);
          setCartOpenMode("cart");
        }}
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
        startInCheckout={cartOpenMode === "checkout"}
      />
    </div>
  );
}