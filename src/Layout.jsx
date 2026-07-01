import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { supabase } from '@/api/supabaseClient';
import { Restaurant, Order } from '@/api/entities';
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import ChatBot from "./components/layout/ChatBot.jsx";
import TechnicalSupportDialog from "./components/support/TechnicalSupportDialog.jsx";
import TutorialProvider from "./components/tutorial/TutorialProvider.jsx";
import { useToast } from "@/components/ui/use-toast";
import {
  LayoutDashboard,
  ShoppingBag,
  UtensilsCrossed,
  Settings,
  LogOut,
  Store,
  Tag,
  Users,
  Calendar,
  Printer,
  History,
  CreditCard,
  Building2,
  Headphones,
  Ticket,
  Phone,
  PauseCircle,
  PlayCircle,
  Table as TableIcon,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ThemeToggle from "./components/layout/ThemeToggle.jsx";

const navigationItems = [
  { title: "Dashboard",        url: createPageUrl("Dashboard"),       icon: LayoutDashboard },
  { title: "Ordini",           url: createPageUrl("Orders"),          icon: ShoppingBag, tour: "nav-orders" },
  { title: "Storico",          url: createPageUrl("OrderHistory"),    icon: History },
  { title: "Menu",             url: createPageUrl("MenuManagement"),  icon: UtensilsCrossed, tour: "nav-menu" },
  { title: "Tavoli",           url: createPageUrl("Tables"),          icon: TableIcon },
  { title: "Sedi",             url: createPageUrl("Locations"),       icon: Building2 },
  { title: "Eventi",           url: createPageUrl("Events"),          icon: Calendar, tour: "nav-events" },
  { title: "Promozioni",       url: createPageUrl("Promotions"),      icon: Tag, tour: "nav-promotions" },
  { title: "Stampa Comande",   url: createPageUrl("PrintOrders"),     icon: Printer },
  { title: "Impostazioni",     url: createPageUrl("Settings"),        icon: Settings },
  { title: "Richiedi Assistenza", url: "#", icon: Headphones, special: "support" },
];

export default function Layout({ children }) {
  const location = useLocation();
  const [restaurant, setRestaurant] = useState(null);
  const [restaurants, setRestaurants] = useState([]);
  const [user, setUser] = useState(null);
  const [isMasterAccount, setIsMasterAccount] = useState(false);
  const [subscriptionExpiring, setSubscriptionExpiring] = useState(false);
  const [subscriptionExpired, setSubscriptionExpired] = useState(false);
  const [showSupportDialog, setShowSupportDialog] = useState(false);
  const [supportPhone, setSupportPhone] = useState(null);
  const [isUpdatingRestaurantStatus, setIsUpdatingRestaurantStatus] = useState(false);

  const { toast } = useToast();

  const adminViewMode = isMasterAccount
    ? (localStorage.getItem('admin_view_mode') || 'master')
    : 'restaurant';
  const isImpersonating = isMasterAccount && adminViewMode === 'restaurant';

  const showMasterNavigation = isMasterAccount && !isImpersonating;
  const showRestaurantNavigation = !isMasterAccount || isImpersonating;

  const ordersPaused = restaurant?.settings?.orders_paused === true;
  const deliveryModes = Array.isArray(restaurant?.modalita_consegna) ? restaurant.modalita_consegna : [];
  const hasDelivery = deliveryModes.includes('consegna');
  const hasPickup = deliveryModes.includes('asporto');

  const { data: pendingOrdersCount = 0 } = useQuery({
    queryKey: ['layout-pending-orders', restaurant?.id],
    queryFn: async () => {
      if (!restaurant?.id) return 0;
      const rows = await Order.filter({ restaurant_id: restaurant.id }, '-created_at', 50);
      const list = Array.isArray(rows) ? rows : [];
      return list.filter((o) => {
        const dbStatus = String(o?.status ?? '').toLowerCase();
        const itStatus = String(o?.stato ?? '').toLowerCase();
        return dbStatus === 'pending' || dbStatus === 'confirmed' || itStatus === 'nuovo' || itStatus === 'confermato';
      }).length;
    },
    enabled: !!restaurant?.id && showRestaurantNavigation,
    initialData: 0,
    refetchOnWindowFocus: true,
    refetchInterval: () => {
      if (!restaurant?.id) return false;
      if (typeof document === 'undefined') return false;
      return document.visibilityState === 'visible' ? 10000 : false;
    },
  });

  const updateRestaurantQuickStatus = async ({ settingsPatch, modalitaConsegna }) => {
    if (!restaurant?.id) return;

    const prevRestaurant = restaurant;
    const nextSettings = {
      ...(prevRestaurant?.settings && typeof prevRestaurant.settings === 'object' ? prevRestaurant.settings : {}),
      ...(settingsPatch && typeof settingsPatch === 'object' ? settingsPatch : {}),
    };

    const patch = {
      ...(settingsPatch ? { settings: nextSettings } : {}),
      ...(Array.isArray(modalitaConsegna) ? { modalita_consegna: modalitaConsegna } : {}),
    };

    setIsUpdatingRestaurantStatus(true);
    setRestaurant((r) => ({
      ...r,
      ...(patch.settings ? { settings: nextSettings } : {}),
      ...(patch.modalita_consegna ? { modalita_consegna: patch.modalita_consegna } : {}),
    }));

    try {
      const updated = await Restaurant.update(prevRestaurant.id, patch);
      if (updated) setRestaurant(updated);
    } catch (e) {
      setRestaurant(prevRestaurant);
      toast({
        title: 'Errore',
        description: 'Impossibile salvare le modifiche. Riprova.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingRestaurantStatus(false);
    }
  };

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (!isMasterAccount) return;
    if (isImpersonating) return;

    const restaurantPages = new Set(
      [
        ...navigationItems
          .filter((i) => i.special !== 'support')
          .map((i) => i.url),
        createPageUrl('RenewSubscription'),
        createPageUrl('EventMenu'),
      ].filter(Boolean)
    );

    if (restaurantPages.has(location.pathname)) {
      window.location.href = createPageUrl('MasterDashboard');
    }
  }, [isMasterAccount, isImpersonating, location.pathname]);

  const loadUserData = async () => {
    try {
      // Ottieni utente corrente da Supabase
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);

      if (!currentUser) {
        setRestaurant(null);
        setIsMasterAccount(false);
        return;
      }

      // Controlla se è admin (via user_metadata o app_metadata)
      const isAdmin = currentUser?.app_metadata?.role === 'admin' ||
                      currentUser?.user_metadata?.role === 'admin';
      setIsMasterAccount(isAdmin);

      if (isAdmin) {
        const mode = localStorage.getItem('admin_view_mode') || 'master';
        if (mode !== 'restaurant') {
          setRestaurant(null);
          setRestaurants([]);
          setSupportPhone(null);
          setSubscriptionExpiring(false);
          setSubscriptionExpired(false);
          return;
        }
      }

      // Carica ristorante associato all'utente
      let restaurants = [];
      if (currentUser?.id) {
        restaurants = isAdmin
          ? await Restaurant.list("-created_at")
          : await Restaurant.filter({ user_id: currentUser.id });
      }

      setRestaurants(restaurants);

      if (restaurants.length > 0) {
        const storedId = localStorage.getItem('selected_restaurant_id');
        const rest = restaurants.find((r) => r.id === storedId) || restaurants[0];
        if (rest?.id) {
          localStorage.setItem('selected_restaurant_id', rest.id);
        }
        setRestaurant(rest);

        // Controlla telefono assistenza dalle impostazioni del ristorante
        if (rest.settings?.telefono_assistenza) {
          setSupportPhone(rest.settings.telefono_assistenza);
        }

        // Controlla scadenza abbonamento
        if (!isAdmin && rest.abbonamento_scadenza) {
          const expiryDate = new Date(rest.abbonamento_scadenza);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          expiryDate.setHours(0, 0, 0, 0);
          const daysUntilExpiry = Math.floor((expiryDate - today) / (1000 * 60 * 60 * 24));

          if (daysUntilExpiry < 0 && !rest.abbonamento_attivo) {
            setSubscriptionExpired(true);
            if (location.pathname !== createPageUrl("RenewSubscription")) {
              window.location.href = createPageUrl("RenewSubscription");
            }
          } else if (daysUntilExpiry <= 15 && daysUntilExpiry >= 0 && rest.abbonamento_attivo) {
            setSubscriptionExpiring(true);
          }
        }
      }
    } catch (error) {
      console.error("Errore caricamento dati:", error);
    }
  };

  const handleRestaurantChange = (restaurantId) => {
    if (!restaurantId) return;
    if (isMasterAccount && !isImpersonating) return;
    localStorage.setItem('selected_restaurant_id', restaurantId);
    window.location.reload();
  };

  const backToMasterView = () => {
    localStorage.setItem('admin_view_mode', 'master');
    localStorage.removeItem('selected_restaurant_id');
    window.location.href = createPageUrl('MasterDashboard');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  if (subscriptionExpired && location.pathname !== createPageUrl("RenewSubscription")) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background text-foreground">
        <style>{`
          :root {
            --primary: #e74c3c;
            --secondary: #2c3e50;
            --success: #27ae60;
            --warning: #f39c12;
          }
        `}</style>

        <Sidebar className="border-r border-border">
          <SidebarHeader className="border-b border-border p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                <Store className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold truncate">
                  {showMasterNavigation ? "Ordina Facile" : (restaurant?.name || restaurant?.nome || "Ordina Facile")}
                </h2>
                <p className="text-xs text-muted-foreground">Gestione Ordini</p>
                {showRestaurantNavigation && restaurants.length > 1 && (
                  <div className="mt-2">
                    <Select value={restaurant?.id || ""} onValueChange={handleRestaurantChange}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Seleziona sede" />
                      </SelectTrigger>
                      <SelectContent>
                        {restaurants.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r?.name || r?.nome || `Ristorante ${r.id}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          </SidebarHeader>

          {supportPhone && (
            <div className="px-4 py-3 bg-green-50 border-b border-green-200">
              <p className="text-xs font-medium text-green-900 mb-2">
                📞 Assistenza Telefonica
              </p>
              <a
                href={`tel:${supportPhone}`}
                className="flex items-center gap-2 text-sm font-semibold text-green-700 hover:text-green-900 transition-colors"
              >
                <Phone className="w-4 h-4" />
                {supportPhone}
              </a>
            </div>
          )}

          {subscriptionExpiring && (
            <div className="p-4 bg-yellow-50 border-b border-yellow-200">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-yellow-600" />
                <p className="text-sm font-semibold text-yellow-900">Abbonamento in scadenza</p>
              </div>
              <p className="text-xs text-yellow-800 mb-2">
                Scadenza: {restaurant?.abbonamento_scadenza
                  ? format(new Date(restaurant.abbonamento_scadenza), 'dd/MM/yyyy')
                  : 'N/A'}
              </p>
              <Button
                size="sm"
                className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
                onClick={() => window.location.href = createPageUrl("RenewSubscription")}
              >
                Rinnova Ora
              </Button>
            </div>
          )}

          <SidebarContent className="p-2">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2 py-2">
                Navigazione
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {showMasterNavigation && (
                    <>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild className={`hover:bg-red-50 hover:text-red-700 transition-colors duration-200 rounded-lg mb-1 ${location.pathname === createPageUrl("MasterDashboard") ? 'bg-red-50 text-red-700' : ''}`}>
                          <Link to={createPageUrl("MasterDashboard")} className="flex items-center gap-3 px-3 py-2">
                            <Users className="w-4 h-4" />
                            <span className="font-medium">Master Dashboard</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild className={`hover:bg-red-50 hover:text-red-700 transition-colors duration-200 rounded-lg mb-1 ${location.pathname === createPageUrl("SubscriptionSettings") ? 'bg-red-50 text-red-700' : ''}`}>
                          <Link to={createPageUrl("SubscriptionSettings")} className="flex items-center gap-3 px-3 py-2">
                            <CreditCard className="w-4 h-4" />
                            <span className="font-medium">Gestione Abbonamenti</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild className={`hover:bg-red-50 hover:text-red-700 transition-colors duration-200 rounded-lg mb-1 ${location.pathname === createPageUrl("SupportRequests") ? 'bg-red-50 text-red-700' : ''}`}>
                          <Link to={createPageUrl("SupportRequests")} className="flex items-center gap-3 px-3 py-2">
                            <Headphones className="w-4 h-4" />
                            <span className="font-medium">Richieste Assistenza</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild className={`hover:bg-red-50 hover:text-red-700 transition-colors duration-200 rounded-lg mb-1 ${location.pathname === createPageUrl("DiscountCodes") ? 'bg-red-50 text-red-700' : ''}`}>
                          <Link to={createPageUrl("DiscountCodes")} data-tour="nav-discount-codes" className="flex items-center gap-3 px-3 py-2">
                            <Ticket className="w-4 h-4" />
                            <span className="font-medium">Codici Sconto</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </>
                  )}
                  {showRestaurantNavigation && isMasterAccount && (
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        className="hover:bg-red-50 hover:text-red-700 transition-colors duration-200 rounded-lg mb-1 cursor-pointer"
                        onClick={backToMasterView}
                      >
                        <div className="flex items-center gap-3 px-3 py-2">
                          <Users className="w-4 h-4" />
                          <span className="font-medium">Torna a Master</span>
                        </div>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                  {showRestaurantNavigation && navigationItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      {item.special === "support" ? (
                        <SidebarMenuButton
                          className="hover:bg-green-50 hover:text-green-700 transition-colors duration-200 rounded-lg mb-1 cursor-pointer"
                          onClick={() => setShowSupportDialog(true)}
                        >
                          <div className="flex items-center gap-3 px-3 py-2">
                            <item.icon className="w-4 h-4" />
                            <span className="font-medium">{item.title}</span>
                          </div>
                        </SidebarMenuButton>
                      ) : (
                        <SidebarMenuButton asChild className={`hover:bg-red-50 hover:text-red-700 transition-colors duration-200 rounded-lg mb-1 ${location.pathname === item.url ? 'bg-red-50 text-red-700' : ''}`}>
                          <Link to={item.url} data-tour={item.tour} className="flex items-center gap-3 px-3 py-2">
                            <item.icon className="w-4 h-4" />
                            <span className="font-medium">{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      )}
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {restaurant && (
              <SidebarGroup>
                <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2 py-2">
                  Accesso Rapido
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <div className="px-3 py-2">
                    <a
                      href={`/r/${restaurant.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-tour="public-menu-link"
                      className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
                    >
                      <Store className="w-4 h-4" />
                      Vedi pagina pubblica
                    </a>
                  </div>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </SidebarContent>

          <SidebarFooter className="border-t border-border p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center border border-border">
                <span className="text-muted-foreground font-medium text-sm">
                  {user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0) || "U"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {user?.user_metadata?.full_name || user?.email || "Utente"}
                </p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                {isMasterAccount && (
                  <p className="text-xs text-red-600 font-semibold">Admin Master</p>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <ThemeToggle compact />
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center justify-center w-8 h-8 rounded-full border border-border/60 bg-background/80 backdrop-blur text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-colors"
                  aria-label="Esci dall'account"
                  title="Esci"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm text-red-600 hover:text-red-800 w-full px-2 py-1"
            >
              <LogOut className="w-4 h-4" />
              Esci
            </button>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col">
          <header className="bg-background border-b border-border px-6 py-4 md:hidden">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-accent p-2 rounded-lg transition-colors duration-200" />
              <h1 className="text-xl font-semibold">
                {restaurant?.name || restaurant?.nome || "Ordina Facile"}
              </h1>
            </div>
          </header>

          <div className="flex-1 overflow-auto">
            {restaurant && showRestaurantNavigation && (
              <div className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
                <div className="px-4 py-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      data-tour="quick-open-close"
                      variant={ordersPaused ? 'destructive' : 'default'}
                      className="h-8 px-3"
                      disabled={isUpdatingRestaurantStatus}
                      onClick={() => {
                        updateRestaurantQuickStatus({
                          settingsPatch: { orders_paused: !ordersPaused },
                        });
                      }}
                    >
                      {ordersPaused ? (
                        <PauseCircle className="w-4 h-4 mr-2" />
                      ) : (
                        <PlayCircle className="w-4 h-4 mr-2" />
                      )}
                      {ordersPaused ? 'Chiuso (ordini in pausa)' : 'Aperto'}
                    </Button>

                    <Button
                      data-tour="quick-delivery"
                      variant={hasDelivery ? 'default' : 'outline'}
                      className="h-8 px-3"
                      disabled={isUpdatingRestaurantStatus}
                      onClick={() => {
                        const next = hasDelivery
                          ? deliveryModes.filter((m) => m !== 'consegna')
                          : Array.from(new Set([...deliveryModes, 'consegna']));

                        if (next.length === 0) {
                          toast({
                            title: 'Seleziona almeno una modalità',
                            description: 'Devi lasciare attiva almeno Consegna o Asporto.',
                            variant: 'destructive',
                          });
                          return;
                        }

                        updateRestaurantQuickStatus({ modalitaConsegna: next });
                      }}
                    >
                      Consegna
                    </Button>

                    <Button
                      data-tour="quick-pickup"
                      variant={hasPickup ? 'default' : 'outline'}
                      className="h-8 px-3"
                      disabled={isUpdatingRestaurantStatus}
                      onClick={() => {
                        const next = hasPickup
                          ? deliveryModes.filter((m) => m !== 'asporto')
                          : Array.from(new Set([...deliveryModes, 'asporto']));

                        if (next.length === 0) {
                          toast({
                            title: 'Seleziona almeno una modalità',
                            description: 'Devi lasciare attiva almeno Consegna o Asporto.',
                            variant: 'destructive',
                          });
                          return;
                        }

                        updateRestaurantQuickStatus({ modalitaConsegna: next });
                      }}
                    >
                      Asporto
                    </Button>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <a
                      data-tour="pending-orders"
                      href={`${createPageUrl('Orders')}?status=in_attesa`}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      In attesa: <span className="font-semibold">{pendingOrdersCount}</span>
                    </a>
                  </div>
                </div>
              </div>
            )}
            {children}
          </div>
        </main>

        <ChatBot restaurant={restaurant} />

        <TechnicalSupportDialog
          open={showSupportDialog}
          onClose={() => setShowSupportDialog(false)}
          restaurant={restaurant}
        />

        <TutorialProvider includeAdminTours={showMasterNavigation} />
      </div>
    </SidebarProvider>
  );
}
