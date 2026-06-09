import { Restaurant, MenuItem, Category, Promotion, Event } from '@/api/entities';
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ThemeToggle from "@/components/layout/ThemeToggle";
import { useTheme } from "@/lib/ThemeContext";
import { supabase } from '@/api/supabaseClient';

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
  Heart,
  X,
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

const normalizeSearchText = (value) =>
  String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const escapeRegExp = (value) => String(value ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const renderHighlightedText = (text, query) => {
  const q = String(query ?? "").trim();
  const source = String(text ?? "");
  if (!q) return source;

  try {
    const re = new RegExp(`(${escapeRegExp(q)})`, "ig");
    const parts = source.split(re);
    const qLower = q.toLowerCase();

    return parts.map((part, i) => {
      const isMatch = part.toLowerCase() === qLower;
      return isMatch ? (
        <span key={i} className="font-extrabold underline">
          {part}
        </span>
      ) : (
        <span key={i}>{part}</span>
      );
    });
  } catch {
    return source;
  }
};

export default function RestaurantPublic() {
  const { resolvedTheme } = useTheme();
  const params = useParams();
  const urlParams = new URLSearchParams(window.location.search);
  const restaurantId = params?.restaurantId ?? urlParams.get('id');
  const eventId = urlParams.get('event'); // Added eventId

  const favoritesStorageKey = useMemo(() => {
    if (!restaurantId) return null;
    return `favorites_${restaurantId}_${eventId || "std"}`;
  }, [restaurantId, eventId]);
  
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
  const [favoriteItemIds, setFavoriteItemIds] = useState([]);
  const [activeCategoryId, setActiveCategoryId] = useState(null);
  const [activeMobileCategoryId, setActiveMobileCategoryId] = useState(null);
  const mobileCategorySectionsRef = useRef(new Map());
  const deliveryBarRef = useRef(null);
  const searchCardRef = useRef(null);
  const mobileTabsRef = useRef(null);
  const modifiersMetaCacheRef = useRef(new Map());

  const getMobileStickyOffsetPx = () => {
    if (typeof window === "undefined") return 190;
    if (!window.matchMedia || !window.matchMedia("(max-width: 767px)").matches) return 0;

    const bottoms = [
      deliveryBarRef.current?.getBoundingClientRect?.().bottom,
      searchCardRef.current?.getBoundingClientRect?.().bottom,
      mobileTabsRef.current?.getBoundingClientRect?.().bottom,
    ].filter((v) => typeof v === "number" && Number.isFinite(v));

    const maxBottom = bottoms.length > 0 ? Math.max(...bottoms) : 0;
    return Math.round(maxBottom + 12);
  };

  const scrollToMobileCategory = (categoryId) => {
    if (typeof window === "undefined") return;
    const el = mobileCategorySectionsRef.current.get(String(categoryId));
    if (!el) return;

    const offset = getMobileStickyOffsetPx();
    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: "smooth" });
  };

  useEffect(() => {
    if (restaurantId) {
      localStorage.setItem(`cart_${restaurantId}`, JSON.stringify(cart));
    }
  }, [cart, restaurantId]);

  useEffect(() => {
    setActiveCategoryId(null);
    setActiveMobileCategoryId(null);
  }, [restaurantId, eventId]);

  useEffect(() => {
    if (!favoritesStorageKey) {
      setFavoriteItemIds([]);
      return;
    }

    try {
      const raw = localStorage.getItem(favoritesStorageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) {
        setFavoriteItemIds([]);
        return;
      }
      setFavoriteItemIds(parsed.map((x) => String(x)));
    } catch {
      setFavoriteItemIds([]);
    }
  }, [favoritesStorageKey]);

  useEffect(() => {
    if (!favoritesStorageKey) return;
    try {
      localStorage.setItem(favoritesStorageKey, JSON.stringify(favoriteItemIds));
    } catch {
    }
  }, [favoritesStorageKey, favoriteItemIds]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAllergeni, setSelectedAllergeni] = useState([]);
  const [showAllergeniFilter, setShowAllergeniFilter] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchBlurTimeoutRef = useRef(null);
  const searchContainerRef = useRef(null);
  const searchInputRef = useRef(null);

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

  useEffect(() => {
    if (!isSearchFocused) return;

    const onKeyDown = (e) => {
      if (e.key !== "Escape") return;
      if (searchBlurTimeoutRef.current) {
        clearTimeout(searchBlurTimeoutRef.current);
        searchBlurTimeoutRef.current = null;
      }
      setIsSearchFocused(false);
      setSearchQuery("");
    };

    const onPointerDown = (e) => {
      const el = searchContainerRef.current;
      if (!el) return;
      if (el.contains(e.target)) return;
      if (searchBlurTimeoutRef.current) {
        clearTimeout(searchBlurTimeoutRef.current);
        searchBlurTimeoutRef.current = null;
      }
      setIsSearchFocused(false);
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [isSearchFocused]);

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

  const getItemModifiersMeta = async (menuItemId) => {
    const key = String(menuItemId ?? "");
    if (!key) return { hasAny: false, hasRequired: false, unknown: true };

    if (modifiersMetaCacheRef.current.has(key)) {
      return modifiersMetaCacheRef.current.get(key);
    }

    try {
      const { data, error } = await supabase
        .from('menu_item_category_modifiers')
        .select('category_modifier_id, category_modifiers(obbligatorio)')
        .eq('menu_item_id', menuItemId);

      if (error) throw error;

      const rows = Array.isArray(data) ? data : [];
      const hasAny = rows.length > 0;
      const hasRequired = rows.some((r) => r?.category_modifiers?.obbligatorio === true);
      const meta = { hasAny, hasRequired, unknown: false };
      modifiersMetaCacheRef.current.set(key, meta);
      return meta;
    } catch {
      const meta = { hasAny: true, hasRequired: true, unknown: true };
      modifiersMetaCacheRef.current.set(key, meta);
      return meta;
    }
  };

  const quickAddFromFavorites = async (item) => {
    if (!item) return;

    const hasProhibitedAllergeni = selectedAllergeni.length > 0 &&
      selectedAllergeni.some((a) => (item.allergeni || []).includes(a));
    const isUnavailable = item.esaurito || hasProhibitedAllergeni || isRestaurantBlocked;
    if (isUnavailable) return;

    const meta = await getItemModifiersMeta(item.id);
    if (meta?.hasRequired) {
      setSelectedItem(item);
      return;
    }

    addToCart(item, [], "");
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

  const favoriteIdSet = useMemo(() => {
    return new Set((favoriteItemIds || []).map((x) => String(x)));
  }, [favoriteItemIds]);

  const toggleFavorite = (itemId) => {
    const id = String(itemId ?? "");
    if (!id) return;
    setFavoriteItemIds((prev) => {
      const safePrev = Array.isArray(prev) ? prev : [];
      if (safePrev.includes(id)) return safePrev.filter((x) => x !== id);
      return [id, ...safePrev];
    });
  };

  const filteredMenuItems = menuItems.filter(item => {
    const matchesSearch = item.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.descrizione?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Check if any selected allergen is present in the item's allergeni list
    const hasProhibitedAllergeni = selectedAllergeni.length > 0 && 
      selectedAllergeni.some(a => (item.allergeni || []).includes(a));
    
    return matchesSearch && !hasProhibitedAllergeni;
  });

  const favoriteMenuItems = useMemo(() => {
    return filteredMenuItems.filter((item) => favoriteIdSet.has(String(item.id)));
  }, [filteredMenuItems, favoriteIdSet]);

  const showFavoritesSection = favoriteMenuItems.length > 0 && normalizeSearchText(searchQuery) === "";

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

  useEffect(() => {
    if (activeMobileCategoryId != null) return;
    if (showFavoritesSection) {
      setActiveMobileCategoryId("__favorites__");
      return;
    }
    if (categoriesWithItems.length === 0) return;
    setActiveMobileCategoryId(String(categoriesWithItems[0]?.category?.id ?? ""));
  }, [activeMobileCategoryId, categoriesWithItems, showFavoritesSection]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.matchMedia || !window.matchMedia("(max-width: 767px)").matches) return;

    const targets = Array.from(mobileCategorySectionsRef.current.values());
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        const first = visible[0];
        if (!first?.target) return;
        const id = first.target.getAttribute("data-category-id");
        if (!id) return;
        setActiveMobileCategoryId(String(id));
      },
      {
        threshold: [0.1, 0.25, 0.5],
        rootMargin: `-${getMobileStickyOffsetPx()}px 0px -65% 0px`,
      }
    );

    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [categoriesWithItems, showFavoritesSection, favoriteItemIds.length]);

  const categoryById = useMemo(() => {
    return new Map((categories || []).map((c) => [c.id, c]));
  }, [categories]);

  const searchSuggestions = useMemo(() => {
    const q = normalizeSearchText(searchQuery);
    if (!q) return [];

    const out = [];
    for (const item of menuItems || []) {
      const hasProhibitedAllergeni = selectedAllergeni.length > 0 &&
        selectedAllergeni.some((a) => (item.allergeni || []).includes(a));
      if (hasProhibitedAllergeni) continue;

      const name = normalizeSearchText(item?.nome);
      const desc = normalizeSearchText(item?.descrizione);
      const catName = normalizeSearchText(categoryById.get(item?.category_id)?.nome);

      if (name.includes(q) || desc.includes(q) || catName.includes(q)) {
        out.push(item);
      }
    }

    out.sort((a, b) => {
      const aName = normalizeSearchText(a?.nome);
      const bName = normalizeSearchText(b?.nome);
      const aStarts = aName.startsWith(q) ? 0 : 1;
      const bStarts = bName.startsWith(q) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      return aName.localeCompare(bName);
    });

    return out.slice(0, 8);
  }, [searchQuery, menuItems, selectedAllergeni, categoryById]);

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
        <div ref={deliveryBarRef} className="bg-background border-b border-border py-4 px-4 sticky top-0 z-10">
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
        <Card ref={searchCardRef} className="mb-4 md:mb-6 bg-background/95 backdrop-blur-sm sticky top-16 z-20 md:static">
          <CardContent className="p-3 md:p-4 space-y-3 md:space-y-4">
            <div ref={searchContainerRef} className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 md:w-5 md:h-5" />
              <Input
                ref={searchInputRef}
                placeholder="Cerca prodotti nel menu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => {
                  if (searchBlurTimeoutRef.current) {
                    clearTimeout(searchBlurTimeoutRef.current);
                    searchBlurTimeoutRef.current = null;
                  }
                  setIsSearchFocused(true);
                }}
                onBlur={() => {
                  searchBlurTimeoutRef.current = setTimeout(() => {
                    setIsSearchFocused(false);
                  }, 150);
                }}
                className="pl-9 pr-9 md:pl-10 text-sm md:text-lg"
              />

              {normalizeSearchText(searchQuery) !== "" && (
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setSearchQuery("");
                    setIsSearchFocused(true);
                    searchInputRef.current?.focus?.();
                  }}
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              {isSearchFocused && normalizeSearchText(searchQuery) !== "" && (
                <div className="absolute left-0 right-0 top-full mt-2 z-40 rounded-lg border border-border bg-background/95 backdrop-blur-sm shadow-lg overflow-hidden">
                  {searchSuggestions.length > 0 ? (
                    <div className="max-h-72 overflow-y-auto">
                      {searchSuggestions.map((item) => {
                        const catName = categoryById.get(item?.category_id)?.nome;
                        const isUnavailable = item.esaurito || isRestaurantBlocked;

                        return (
                          <button
                            key={item.id}
                            type="button"
                            className="w-full text-left px-3 py-2 hover:bg-accent/40 transition-colors disabled:opacity-60"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setSelectedItem(item);
                              if (item?.category_id) {
                                setActiveCategoryId(item.category_id);
                                setActiveMobileCategoryId(String(item.category_id));
                                scrollToMobileCategory(item.category_id);
                              }
                              setSearchQuery("");
                              setIsSearchFocused(false);
                            }}
                            disabled={isUnavailable}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="font-semibold truncate">{renderHighlightedText(item.nome, searchQuery)}</div>
                                {catName && (
                                  <div className="text-xs text-muted-foreground truncate">{catName}</div>
                                )}
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {item.esaurito && (
                                  <Badge className="bg-red-600 text-white">Esaurito</Badge>
                                )}
                                {Number.isFinite(Number(item?.prezzo)) && (
                                  <div className="text-sm font-bold">€{Number(item.prezzo).toFixed(2)}</div>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="px-3 py-3 text-sm text-muted-foreground">Nessun risultato</div>
                  )}
                </div>
              )}
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
            <div className="md:hidden">
              {categoriesWithItems.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <p className="text-muted-foreground">Nessun prodotto disponibile con i filtri attivi</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  <div className="h-[52px]" />
                  <div ref={mobileTabsRef} className="fixed top-32 left-0 right-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
                    <div className="max-w-6xl mx-auto px-4 py-2">
                      <div className="flex gap-2 overflow-x-auto whitespace-nowrap">
                        {showFavoritesSection && (
                          <Button
                            key="__favorites__"
                            type="button"
                            size="sm"
                            variant={String(activeMobileCategoryId) === "__favorites__" ? "default" : "outline"}
                            className="shrink-0"
                            style={String(activeMobileCategoryId) === "__favorites__" ? { backgroundColor: primaryColor, borderColor: primaryColor } : {}}
                            onClick={() => {
                              setActiveMobileCategoryId("__favorites__");
                              scrollToMobileCategory("__favorites__");
                            }}
                          >
                            Preferiti
                          </Button>
                        )}
                        {categoriesWithItems.map(({ category }) => {
                          const key = String(category.id);
                          const isActive = String(activeMobileCategoryId) === key;

                          return (
                            <Button
                              key={category.id}
                              type="button"
                              size="sm"
                              variant={isActive ? "default" : "outline"}
                              className="shrink-0"
                              style={isActive ? { backgroundColor: primaryColor, borderColor: primaryColor } : {}}
                              onClick={() => {
                                setActiveMobileCategoryId(key);
                                scrollToMobileCategory(key);
                              }}
                            >
                              {category.nome}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-10">
                    {showFavoritesSection && (
                      <div
                        data-category-id="__favorites__"
                        ref={(el) => {
                          if (el) mobileCategorySectionsRef.current.set("__favorites__", el);
                          else mobileCategorySectionsRef.current.delete("__favorites__");
                        }}
                      >
                        <div className="space-y-1">
                          <div className="font-bold text-lg truncate">Preferiti</div>
                        </div>

                        <div className="mt-4 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {favoriteMenuItems.map((item) => {
                            const hasProhibitedAllergeni = selectedAllergeni.length > 0 &&
                              selectedAllergeni.some((a) => (item.allergeni || []).includes(a));

                            const isUnavailable = item.esaurito || hasProhibitedAllergeni || isRestaurantBlocked;
                            const isFav = favoriteIdSet.has(String(item.id));

                            return (
                              <Card
                                key={item.id}
                                className={`hover:shadow-xl transition-all duration-300 ${
                                  isUnavailable ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                                } bg-background/95 backdrop-blur-sm`}
                                onClick={() => !isUnavailable && setSelectedItem(item)}
                              >
                                <CardContent className="p-4 md:p-6 relative">
                                  <button
                                    type="button"
                                    className="absolute top-3 right-3"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleFavorite(item.id);
                                    }}
                                  >
                                    <Heart
                                      className="w-5 h-5"
                                      style={isFav ? { color: primaryColor, fill: primaryColor } : { color: "hsl(var(--muted-foreground))", fill: "transparent" }}
                                    />
                                  </button>
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
                                      {item.allergeni.map((a) => {
                                        const allergene = ALLERGENI.find((al) => al.value === a);
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
                                        if (!isUnavailable) quickAddFromFavorites(item);
                                      }}
                                    >
                                      {isRestaurantBlocked ? 'Chiuso' : item.esaurito ? 'Esaurito' : hasProhibitedAllergeni ? 'Non disponibile' : 'Aggiungi'}
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {categoriesWithItems.map(({ category }) => {
                      const items = filteredMenuItems.filter((item) => item.category_id === category.id);
                      if (items.length === 0) return null;

                      const sectionKey = String(category.id);

                      return (
                        <div
                          key={category.id}
                          data-category-id={sectionKey}
                          ref={(el) => {
                            if (el) mobileCategorySectionsRef.current.set(sectionKey, el);
                            else mobileCategorySectionsRef.current.delete(sectionKey);
                          }}
                        >
                          <div className="space-y-1">
                            <div className="font-bold text-lg truncate">{category.nome}</div>
                            {category.descrizione && (
                              <div className="text-sm text-muted-foreground line-clamp-2">{category.descrizione}</div>
                            )}
                          </div>

                          <div className="mt-4 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {items.map((item) => {
                              const hasProhibitedAllergeni = selectedAllergeni.length > 0 &&
                                selectedAllergeni.some((a) => (item.allergeni || []).includes(a));

                              const isUnavailable = item.esaurito || hasProhibitedAllergeni || isRestaurantBlocked;
                              const isFav = favoriteIdSet.has(String(item.id));

                              return (
                                <Card
                                  key={item.id}
                                  className={`hover:shadow-xl transition-all duration-300 ${
                                    isUnavailable ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                                  } bg-background/95 backdrop-blur-sm`}
                                  onClick={() => !isUnavailable && setSelectedItem(item)}
                                >
                                  <CardContent className="p-4 md:p-6 relative">
                                    <button
                                      type="button"
                                      className="absolute top-3 right-3"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleFavorite(item.id);
                                      }}
                                    >
                                      <Heart
                                        className="w-5 h-5"
                                        style={isFav ? { color: primaryColor, fill: primaryColor } : { color: "hsl(var(--muted-foreground))", fill: "transparent" }}
                                      />
                                    </button>
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
                                        {item.allergeni.map((a) => {
                                          const allergene = ALLERGENI.find((al) => al.value === a);
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
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="hidden md:block">
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
		<div className="md:hidden h-[52px]" />
		<div className="md:hidden fixed top-32 left-0 right-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-2">
  <div className="flex gap-2 overflow-x-auto whitespace-nowrap">
    {categoriesWithItems.map(({ category }) => {
      const isActive = category.id === activeCategoryId;

      return (
        <Button
          key={category.id}
          type="button"
          size="sm"
          variant={isActive ? "default" : "outline"}
          className="shrink-0"
          style={isActive ? { backgroundColor: primaryColor, borderColor: primaryColor } : {}}
          onClick={() => {
            setActiveCategoryId(category.id);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          {category.nome}
        </Button>
      );
    })}
  </div>
</div>
                    <div className="flex items-center justify-between gap-3">
                      <Button className="hidden md:inline-flex" variant="outline" onClick={() => setActiveCategoryId(null)}>
                        <ChevronLeft className="w-4 h-4 mr-2" />
                        Categorie
                      </Button>
                      <div className="flex-1 text-center">
                        <div className="font-bold text-lg md:text-xl truncate">{activeCategory?.nome}</div>
                        {activeCategory?.descrizione && (
                          <div className="text-sm text-muted-foreground line-clamp-1">{activeCategory.descrizione}</div>
                        )}
                      </div>
                      <div className="hidden md:block w-[98px]" />
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {items.map(item => {
                        const hasProhibitedAllergeni = selectedAllergeni.length > 0 && 
                          selectedAllergeni.some(a => (item.allergeni || []).includes(a));

                        const isUnavailable = item.esaurito || hasProhibitedAllergeni || isRestaurantBlocked;
                        const isFav = favoriteIdSet.has(String(item.id));

                        return (
                          <Card 
                            key={item.id}
                            className={`hover:shadow-xl transition-all duration-300 ${
                              isUnavailable ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                            } bg-background/95 backdrop-blur-sm`}
                            onClick={() => !isUnavailable && setSelectedItem(item)}
                          >
                            <CardContent className="p-4 md:p-6 relative">
                              <button
                                type="button"
                                className="absolute top-3 right-3"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleFavorite(item.id);
                                }}
                              >
                                <Heart
                                  className="w-5 h-5"
                                  style={isFav ? { color: primaryColor, fill: primaryColor } : { color: "hsl(var(--muted-foreground))", fill: "transparent" }}
                                />
                              </button>
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
            </div>
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