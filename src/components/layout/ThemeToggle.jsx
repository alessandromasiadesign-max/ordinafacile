import React from "react";
import { Moon, Sun } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTheme } from "@/lib/ThemeContext";

export default function ThemeToggle({ compact = false }) {
  const { theme, resolvedTheme, setTheme } = useTheme();

  if (compact) {
    return (
      <div
        className="flex items-center gap-2 rounded-full border border-slate-200/80 bg-slate-100/80 backdrop-blur px-2 py-1 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/60"
        aria-label="Interruttore tema"
        title={resolvedTheme === "dark" ? "Tema scuro: attivo" : "Tema scuro: disattivo"}
      >
        <Sun
          className={`h-4 w-4 ${
            resolvedTheme === "dark"
              ? "text-slate-600 dark:text-slate-500"
              : "text-slate-900 dark:text-slate-100"
          }`}
        />
        <Switch
          checked={resolvedTheme === "dark"}
          onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
          aria-label="Tema scuro"
          className="data-[state=unchecked]:bg-slate-300 data-[state=checked]:bg-slate-900 dark:data-[state=unchecked]:bg-slate-700 dark:data-[state=checked]:bg-amber-400 [&>span]:bg-white dark:[&>span]:bg-white"
        />
        <Moon
          className={`h-4 w-4 ${
            resolvedTheme === "dark"
              ? "text-slate-900 dark:text-amber-300"
              : "text-slate-600 dark:text-slate-500"
          }`}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="text-sm text-muted-foreground">Tema</div>
      <Select value={theme} onValueChange={setTheme}>
        <SelectTrigger className="h-9 w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="system">Sistema</SelectItem>
          <SelectItem value="light">Chiaro</SelectItem>
          <SelectItem value="dark">Scuro</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
