import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState({});

  useEffect(() => {
    // Controlla se c'è già una sessione Supabase attiva
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        setIsAuthenticated(true);
        setIsAdmin(
          session.user?.app_metadata?.role === 'admin' ||
          session.user?.user_metadata?.role === 'admin'
        );
      }
      setIsLoadingAuth(false);
    });

    // Ascolta i cambiamenti di sessione (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        setIsAuthenticated(true);
        setIsAdmin(
          session.user?.app_metadata?.role === 'admin' ||
          session.user?.user_metadata?.role === 'admin'
        );
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setIsAdmin(false);
      }
      setIsLoadingAuth(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = async (shouldRedirect = true) => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAuthenticated(false);
    if (shouldRedirect) {
      window.location.href = '/';
    }
  };

  const navigateToLogin = () => {
    window.location.href = '/Login';
  };

  const checkAppState = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUser(session.user);
      setIsAuthenticated(true);
      setIsAdmin(
        session.user?.app_metadata?.role === 'admin' ||
        session.user?.user_metadata?.role === 'admin'
      );
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isAdmin,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      navigateToLogin,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
