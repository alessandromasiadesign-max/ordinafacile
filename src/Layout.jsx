import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import ChatBot from "../components/layout/ChatBot";
import TechnicalSupportDialog from "../components/support/TechnicalSupportDialog";
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
  Moon,
  Sun,
  Ticket,
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

const navigationItems = [
  {
    title: "Dashboard",
    url: createPageUrl("Dashboard"),
    icon: LayoutDashboard,
  },
  {
    title: "Ordini",
    url: createPageUrl("Orders"),
    icon: ShoppingBag,
  },
  {
    title: "Storico",
    url: createPageUrl("OrderHistory"),
    icon: History,
  },
  {
    title: "Menu",
    url: createPageUrl("MenuManagement"),
    icon: UtensilsCrossed,
  },
  {
    title: "Sedi",
    url: createPageUrl("Locations"),
    icon: Building2,
  },
  {
    title: "Eventi",
    url: createPageUrl("Events"),
    icon: Calendar,
  },
  {
    title: "Promozioni",
    url: createPageUrl("Promotions"),
    icon: Tag,
  },
  {
    title: "Stampa Comande",
    url: createPageUrl("PrintOrders"),
    icon: Printer,
  },
  {
    title: "Impostazioni",
    url: createPageUrl("Settings"),
    icon: Settings,
  },
  {
    title: "Richiedi Assistenza",
    url: "#",
    icon: Headphones,
    special: "support"
  },
];

export default function Layout({ children }) {
  const location = useLocation();
  const [restaurant, setRestaurant] = useState(null);
  const [user, setUser] = useState(null);
  const [isMasterAccount, setIsMasterAccount] = useState(false);
  const [subscriptionExpiring, setSubscriptionExpiring] = useState(false);
  const [subscriptionExpired, setSubscriptionExpired] = useState(false);
  const [showSupportDialog, setShowSupportDialog] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsMasterAccount(currentUser.role === 'admin');

      const restaurants = await base44.entities.Restaurant.filter({
        user_id: currentUser.id
      });

      if (restaurants.length > 0) {
        setRestaurant(restaurants[0]);
        
        // Controlla scadenza abbonamento
        if (restaurants[0].abbonamento_scadenza) {
          const expiryDate = new Date(restaurants[0].abbonamento_scadenza);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          expiryDate.setHours(0, 0, 0, 0);

          const daysUntilExpiry = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysUntilExpiry < 0 && !restaurants[0].abbonamento_attivo) {
            setSubscriptionExpired(true);
            if (location.pathname !== createPageUrl("RenewSubscription")) {
              window.location.href = createPageUrl("RenewSubscription");
            }
          }
          else if (daysUntilExpiry <= 15 && daysUntilExpiry >= 0 && restaurants[0].abbonamento_attivo) {
            setSubscriptionExpiring(true);
          }
        }
      }
    } catch (error) {
      console.error("Errore caricamento dati:", error);
    }
  };

  const handleLogout = () => {
    base44.auth.logout();
  };

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('darkMode', JSON.stringify(newMode));
  };

  if (subscriptionExpired && location.pathname !== createPageUrl("RenewSubscription")) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className={`min-h-screen flex w-full ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <style>{`
          :root {
            --primary: #e74c3c;
            --secondary: #2c3e50;
            --success: #27ae60;
            --warning: #f39c12;
          }
        `}</style>

        <Sidebar className={`border-r ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200'}`}>
          <SidebarHeader className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} p-4`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                <Store className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className={`font-bold truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {restaurant?.nome || "Ordina Facile"}
                </h2>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Gestione Ordini</p>
              </div>
            </div>
          </SidebarHeader>

          {subscriptionExpiring && (
            <div className="p-4 bg-yellow-50 border-b border-yellow-200">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-yellow-600" />
                <p className="text-sm font-semibold text-yellow-900">
                  Abbonamento in scadenza
                </p>
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
              <SidebarGroupLabel className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2 py-2">
                Navigazione
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {isMasterAccount && (
                    <>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          asChild
                          className={`hover:bg-red-50 hover:text-red-700 transition-colors duration-200 rounded-lg mb-1 ${
                            location.pathname === createPageUrl("MasterDashboard") ? 'bg-red-50 text-red-700' : ''
                          }`}
                        >
                          <Link to={createPageUrl("MasterDashboard")} className="flex items-center gap-3 px-3 py-2">
                            <Users className="w-4 h-4" />
                            <span className="font-medium">Master Dashboard</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          asChild
                          className={`hover:bg-red-50 hover:text-red-700 transition-colors duration-200 rounded-lg mb-1 ${
                            location.pathname === createPageUrl("SubscriptionSettings") ? 'bg-red-50 text-red-700' : ''
                          }`}
                        >
                          <Link to={createPageUrl("SubscriptionSettings")} className="flex items-center gap-3 px-3 py-2">
                            <CreditCard className="w-4 h-4" />
                            <span className="font-medium">Gestione Abbonamenti</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          asChild
                          className={`hover:bg-red-50 hover:text-red-700 transition-colors duration-200 rounded-lg mb-1 ${
                            location.pathname === createPageUrl("SupportRequests") ? 'bg-red-50 text-red-700' : ''
                          }`}
                        >
                          <Link to={createPageUrl("SupportRequests")} className="flex items-center gap-3 px-3 py-2">
                            <Headphones className="w-4 h-4" />
                            <span className="font-medium">Richieste Assistenza</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          asChild
                          className={`hover:bg-red-50 hover:text-red-700 transition-colors duration-200 rounded-lg mb-1 ${
                            location.pathname === createPageUrl("DiscountCodes") ? 'bg-red-50 text-red-700' : ''
                          }`}
                        >
                          <Link to={createPageUrl("DiscountCodes")} className="flex items-center gap-3 px-3 py-2">
                            <Ticket className="w-4 h-4" />
                            <span className="font-medium">Codici Sconto</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      </>
                      )}
                  {navigationItems.map((item) => (
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
                        <SidebarMenuButton
                          asChild
                          className={`hover:bg-red-50 hover:text-red-700 transition-colors duration-200 rounded-lg mb-1 ${
                            location.pathname === item.url ? 'bg-red-50 text-red-700' : ''
                          }`}
                        >
                          <Link to={item.url} className="flex items-center gap-3 px-3 py-2">
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
                <SidebarGroupLabel className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2 py-2">
                  Accesso Rapido
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <div className="px-3 py-2">
                    <a
                      href={createPageUrl(`RestaurantPublic?id=${restaurant.id}`)}
                      target="_blank"
                      rel="noopener noreferrer"
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

          <SidebarFooter className={`border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} p-4`}>
            <Button
              onClick={toggleDarkMode}
              variant="outline"
              className={`w-full mb-3 ${darkMode ? 'bg-gray-700 border-gray-600 hover:bg-gray-600' : ''}`}
            >
              {darkMode ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
              {darkMode ? 'Modalità Chiara' : 'Modalità Scura'}
            </Button>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${darkMode ? 'bg-gray-700' : 'bg-gray-300'}`}>
                <span className={`font-medium text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  {user?.full_name?.charAt(0) || "U"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-medium text-sm truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {user?.full_name || "Utente"}
                </p>
                <p className={`text-xs truncate ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{user?.email}</p>
                {isMasterAccount && (
                  <p className="text-xs text-red-600 font-semibold">Admin Master</p>
                )}
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
          <header className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b px-6 py-4 md:hidden`}>
            <div className="flex items-center gap-4">
              <SidebarTrigger className={`p-2 rounded-lg transition-colors duration-200 ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`} />
              <h1 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{restaurant?.nome || "Ordina Facile"}</h1>
            </div>
          </header>

          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
        
        <ChatBot restaurant={restaurant} />
        
        {restaurant && (
          <TechnicalSupportDialog
            open={showSupportDialog}
            onClose={() => setShowSupportDialog(false)}
            restaurant={restaurant}
          />
        )}
      </div>
    </SidebarProvider>
  );
}