import { Toaster } from "@/components/ui/toaster"
import { Suspense } from 'react';
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { ThemeProvider } from '@/lib/ThemeContext';
import ThemeToggle from '@/components/layout/ThemeToggle';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const PublicLanding = Pages.Landing ?? (() => null);

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isAuthenticated, isAdmin, isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const location = useLocation();
  const hidePublicThemeToggle = location?.pathname?.startsWith('/r/') || location?.pathname === '/RestaurantPublic';

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Public area (no Layout) — avoids crashes in pages that assume a logged user.
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background text-foreground relative">
        {!hidePublicThemeToggle && (
          <div className="absolute top-3 right-3 z-50">
            <ThemeToggle compact />
          </div>
        )}
        <Routes>
          <Route path="/" element={<PublicLanding />} />
          {Pages.Login && <Route path="/Login" element={<Pages.Login />} />}
          {Pages.Register && <Route path="/Register" element={<Pages.Register />} />}
          {Pages.Privacy && <Route path="/Privacy" element={<Pages.Privacy />} />}
          {Pages.Terms && <Route path="/Terms" element={<Pages.Terms />} />}
          {Pages.Cookies && <Route path="/Cookies" element={<Pages.Cookies />} />}
          {Pages.RestaurantPublic && <Route path="/RestaurantPublic" element={<Pages.RestaurantPublic />} />}
          {Pages.RestaurantPublic && <Route path="/r/:restaurantId" element={<Pages.RestaurantPublic />} />}
          {Pages.TrackOrder && <Route path="/TrackOrder" element={<Pages.TrackOrder />} />}
          <Route path="*" element={<PublicLanding />} />
        </Routes>
      </div>
    );
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Pages.RestaurantPublic && <Route path="/r/:restaurantId" element={<Pages.RestaurantPublic />} />}
      {Pages.MasterDashboard && (
        <Route
          path="/MasterDashboard"
          element={isAuthenticated && isAdmin ? (
            <LayoutWrapper currentPageName="MasterDashboard">
              <Pages.MasterDashboard />
            </LayoutWrapper>
          ) : (
            <PageNotFound />
          )}
        />
      )}
      {Pages.SubscriptionSettings && (
        <Route
          path="/SubscriptionSettings"
          element={isAuthenticated && isAdmin ? (
            <LayoutWrapper currentPageName="SubscriptionSettings">
              <Pages.SubscriptionSettings />
            </LayoutWrapper>
          ) : (
            <PageNotFound />
          )}
        />
      )}
      {Pages.SupportRequests && (
        <Route
          path="/SupportRequests"
          element={isAuthenticated && isAdmin ? (
            <LayoutWrapper currentPageName="SupportRequests">
              <Pages.SupportRequests />
            </LayoutWrapper>
          ) : (
            <PageNotFound />
          )}
        />
      )}
      {Pages.DiscountCodes && (
        <Route
          path="/DiscountCodes"
          element={isAuthenticated && isAdmin ? (
            <LayoutWrapper currentPageName="DiscountCodes">
              <Pages.DiscountCodes />
            </LayoutWrapper>
          ) : (
            <PageNotFound />
          )}
        />
      )}
      {Object.entries(Pages)
        .filter(([path]) => ![
          'MasterDashboard',
          'SubscriptionSettings',
          'SupportRequests',
          'DiscountCodes',
          'RestaurantPublic',
        ].includes(path))
        .map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <ThemeProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <NavigationTracker />
            <Suspense
              fallback={(
                <div className="fixed inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
                </div>
              )}
            >
              <AuthenticatedApp />
            </Suspense>
          </Router>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
