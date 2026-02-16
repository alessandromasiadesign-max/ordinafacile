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
import Cookies from './pages/Cookies';
import Dashboard from './pages/Dashboard';
import EventMenu from './pages/EventMenu';
import Events from './pages/Events';
import Landing from './pages/Landing';
import Locations from './pages/Locations';
import MasterDashboard from './pages/MasterDashboard';
import MenuManagement from './pages/MenuManagement';
import OrderHistory from './pages/OrderHistory';
import Orders from './pages/Orders';
import PrintOrders from './pages/PrintOrders';
import Privacy from './pages/Privacy';
import Promotions from './pages/Promotions';
import RenewSubscription from './pages/RenewSubscription';
import RestaurantPublic from './pages/RestaurantPublic';
import Settings from './pages/Settings';
import SubscriptionSettings from './pages/SubscriptionSettings';
import SupportRequests from './pages/SupportRequests';
import Terms from './pages/Terms';
import app from './pages/_app';
import DiscountCodes from './pages/DiscountCodes';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Cookies": Cookies,
    "Dashboard": Dashboard,
    "EventMenu": EventMenu,
    "Events": Events,
    "Landing": Landing,
    "Locations": Locations,
    "MasterDashboard": MasterDashboard,
    "MenuManagement": MenuManagement,
    "OrderHistory": OrderHistory,
    "Orders": Orders,
    "PrintOrders": PrintOrders,
    "Privacy": Privacy,
    "Promotions": Promotions,
    "RenewSubscription": RenewSubscription,
    "RestaurantPublic": RestaurantPublic,
    "Settings": Settings,
    "SubscriptionSettings": SubscriptionSettings,
    "SupportRequests": SupportRequests,
    "Terms": Terms,
    "_app": app,
    "DiscountCodes": DiscountCodes,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};