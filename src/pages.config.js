/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import MenuManagement from './pages/MenuManagement';
import Settings from './pages/Settings';
import RestaurantPublic from './pages/RestaurantPublic';
import MasterDashboard from './pages/MasterDashboard';
import Promotions from './pages/Promotions';
import PrintOrders from './pages/PrintOrders';
import Events from './pages/Events';
import OrderHistory from './pages/OrderHistory';
import EventMenu from './pages/EventMenu';
import SubscriptionSettings from './pages/SubscriptionSettings';
import RenewSubscription from './pages/RenewSubscription';
import Locations from './pages/Locations';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Cookies from './pages/Cookies';
import app from './pages/_app';
import SupportRequests from './pages/SupportRequests';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Orders": Orders,
    "MenuManagement": MenuManagement,
    "Settings": Settings,
    "RestaurantPublic": RestaurantPublic,
    "MasterDashboard": MasterDashboard,
    "Promotions": Promotions,
    "PrintOrders": PrintOrders,
    "Events": Events,
    "OrderHistory": OrderHistory,
    "EventMenu": EventMenu,
    "SubscriptionSettings": SubscriptionSettings,
    "RenewSubscription": RenewSubscription,
    "Locations": Locations,
    "Terms": Terms,
    "Privacy": Privacy,
    "Cookies": Cookies,
    "_app": app,
    "SupportRequests": SupportRequests,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};