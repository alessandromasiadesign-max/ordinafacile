import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const ThemeContext = createContext({
  theme: "system",
  resolvedTheme: "light",
  setTheme: () => {},
});

const THEME_STORAGE_KEY = "ordinafacile_theme";

function getSystemTheme() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolveTheme(theme) {
  return theme === "system" ? getSystemTheme() : theme;
}

function applyThemeToDocument(resolved) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (resolved === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    try {
      const v = localStorage.getItem(THEME_STORAGE_KEY);
      if (v === "light" || v === "dark" || v === "system") return v;
    } catch {
      // ignore
    }
    return "system";
  });

  const resolvedTheme = useMemo(() => resolveTheme(theme), [theme]);

  useEffect(() => {
    applyThemeToDocument(resolvedTheme);
  }, [resolvedTheme]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    if (theme !== "system") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyThemeToDocument(getSystemTheme());

    if (typeof media.addEventListener === "function") media.addEventListener("change", onChange);
    else media.addListener(onChange);

    return () => {
      if (typeof media.removeEventListener === "function") media.removeEventListener("change", onChange);
      else media.removeListener(onChange);
    };
  }, [theme]);

  const setTheme = (next) => {
    const v = next === "light" || next === "dark" || next === "system" ? next : "system";
    setThemeState(v);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, v);
    } catch {
      // ignore
    }
  };

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
    }),
    [theme, resolvedTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
