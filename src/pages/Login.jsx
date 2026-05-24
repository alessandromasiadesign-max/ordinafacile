import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { Restaurant } from "@/api/entities";
import { createPageUrl } from "@/utils";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");

  const authCode = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("code");
  }, []);

  const authType = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("type");
  }, []);

  const confirmed = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("confirmed");
  }, []);

  useEffect(() => {
    // Supabase può reindirizzare su /Login con `?code=...` (flow PKCE), sia per recovery che per conferma email.
    const run = async () => {
      if (!authCode) {
        if (confirmed === "1") {
          setInfo("Email confermata. Ora puoi accedere.");
        }
        return;
      }
      setLoading(true);
      setError(null);
      setInfo(null);
      try {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(authCode);
        if (exchangeError) throw exchangeError;

        if (authType === "recovery") {
          setIsRecoveryMode(true);
        } else {
          await supabase.auth.signOut();
          setInfo("Email confermata. Ora puoi accedere.");
          window.history.replaceState({}, "", `${createPageUrl("Login")}?confirmed=1`);
        }
      } catch (err) {
        setError(err?.message ?? "Impossibile avviare il reset password");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [authCode, authType, confirmed]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        throw signInError;
      }

      const { data: { user } } = await supabase.auth.getUser();
      const isAdmin = user?.app_metadata?.role === 'admin' || user?.user_metadata?.role === 'admin';

      if (isAdmin) {
        localStorage.setItem('admin_view_mode', 'master');
        localStorage.removeItem('selected_restaurant_id');
        window.location.href = createPageUrl("MasterDashboard");
        return;
      }

      const restaurants = user?.id ? await Restaurant.filter({ user_id: user.id }) : [];
      if (!restaurants || restaurants.length === 0) {
        window.location.href = `${createPageUrl("Settings")}?onboarding=1`;
        return;
      }

      window.location.href = createPageUrl("Dashboard");
    } catch (err) {
      setError(err?.message ?? "Errore di login");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError(null);
    setInfo(null);
    if (!email) {
      setError("Inserisci prima la tua email.");
      return;
    }
    setLoading(true);
    try {
      const redirectTo = `${window.location.origin}${createPageUrl("Login")}`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (resetError) throw resetError;
      setInfo("Ti abbiamo inviato una email per reimpostare la password. Aprila e clicca sul link.");
    } catch (err) {
      setError(err?.message ?? "Impossibile inviare l'email di reset");
    } finally {
      setLoading(false);
    }
  };

  const handleSetNewPassword = async (e) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (newPassword.length < 8) {
      setError("La password deve contenere almeno 8 caratteri.");
      return;
    }
    if (newPassword !== newPassword2) {
      setError("Le password non coincidono.");
      return;
    }
    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      setInfo("Password aggiornata. Ora puoi accedere.");
      setIsRecoveryMode(false);
      setNewPassword("");
      setNewPassword2("");
      // Pulisco l'URL dal code
      window.history.replaceState({}, "", createPageUrl("Login"));
    } catch (err) {
      setError(err?.message ?? "Impossibile aggiornare la password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card text-card-foreground shadow p-6">
        <h1 className="text-xl font-semibold tracking-tight">Accedi</h1>

        {isRecoveryMode ? (
          <form onSubmit={handleSetNewPassword} className="space-y-4 mt-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nuova password</label>
              <input
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Ripeti nuova password</label>
              <input
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                type="password"
                value={newPassword2}
                onChange={(e) => setNewPassword2(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>

            {error && <div className="text-sm text-red-600">{error}</div>}
            {info && <div className="text-sm text-green-700">{info}</div>}

            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 py-2 w-full bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "Aggiornamento..." : "Aggiorna password"}
            </button>

            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 py-2 w-full border border-border bg-card hover:bg-accent"
              onClick={() => {
                setIsRecoveryMode(false);
                setNewPassword("");
                setNewPassword2("");
                setError(null);
                setInfo(null);
                window.history.replaceState({}, "", createPageUrl("Login"));
              }}
            >
              Annulla
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <input
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <input
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <button
              type="button"
              className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
              onClick={handleForgotPassword}
              disabled={loading}
            >
              Password dimenticata?
            </button>

            {error && <div className="text-sm text-red-600">{error}</div>}
            {info && <div className="text-sm text-green-700">{info}</div>}

            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 py-2 w-full bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "Accesso..." : "Accedi"}
            </button>

            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 py-2 w-full border border-border bg-card hover:bg-accent"
              onClick={() => (window.location.href = createPageUrl("Landing"))}
            >
              Torna indietro
            </button>

            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 py-2 w-full border border-border bg-card hover:bg-accent"
              onClick={() => (window.location.href = createPageUrl("Register"))}
            >
              Non hai un account? Registrati
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
