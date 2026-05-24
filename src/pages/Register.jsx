import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { createPageUrl } from "@/utils";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const referralCode = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("ref");
  }, []);

  useEffect(() => {
    if (referralCode) {
      localStorage.setItem("referral_code", referralCode);
    }
  }, [referralCode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("La password deve contenere almeno 8 caratteri.");
      return;
    }
    if (password !== password2) {
      setError("Le password non coincidono.");
      return;
    }

    setLoading(true);
    try {
      const storedRef = referralCode || localStorage.getItem("referral_code") || null;
      const emailRedirectTo = `${window.location.origin}${createPageUrl("Login")}?confirmed=1`;
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo,
          data: storedRef ? { referred_by: storedRef } : {},
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      setSuccess(true);
    } catch (err) {
      setError(err?.message ?? "Errore di registrazione");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card text-card-foreground shadow p-6">
        <h1 className="text-xl font-semibold tracking-tight">Crea un account</h1>

        {success ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900">
              Registrazione completata.
              <div className="mt-2">
                Ti abbiamo inviato una email di conferma: aprila e clicca sul link per attivare l’account.
              </div>
            </div>

            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 py-2 w-full bg-foreground text-background hover:bg-foreground/90"
              onClick={() => (window.location.href = createPageUrl("Login"))}
            >
              Vai al login
            </button>
          </div>
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
                autoComplete="new-password"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Ripeti password</label>
              <input
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                type="password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>

            {referralCode && (
              <div className="text-xs text-muted-foreground">
                Referral attivo: <span className="font-medium">{referralCode}</span>
              </div>
            )}

            {error && <div className="text-sm text-red-600">{error}</div>}

            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 py-2 w-full bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "Creazione account..." : "Registrati"}
            </button>

            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 py-2 w-full border border-border bg-card hover:bg-accent"
              onClick={() => (window.location.href = createPageUrl("Login"))}
            >
              Hai già un account? Accedi
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
