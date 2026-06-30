import React from "react";
import { Moon, Sun } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTheme } from "@/lib/ThemeContext";

export default function ThemeToggle({ compact = false }) {
  const { theme, resolvedTheme, setTheme } = useTheme();

  if (compact) {
    const toggle = () => {
      setTheme(resolvedTheme === "dark" ? "light" : "dark");
    };

    return (
      <button
        type="button"
        onClick={toggle}
        className="flex items-center gap-2 rounded-full border border-border/60 bg-background/80 backdrop-blur px-2.5 py-1.5 shadow-sm hover:bg-accent transition-colors"
        aria-label={resolvedTheme === "dark" ? "Passa al tema chiaro" : "Passa al tema scuro"}
        title={resolvedTheme === "dark" ? "Tema scuro: attivo" : "Tema chiaro: attivo"}
      >
        {resolvedTheme === "dark" ? (
          <>
            <Moon className="h-4 w-4 text-amber-300" />
            <span className="text-xs font-medium text-foreground">Scuro</span>
          </>
        ) : (
          <>
            <Sun className="h-4 w-4 text-orange-500" />
            <span className="text-xs font-medium text-foreground">Chiaro</span>
          </>
        )}
      </button>
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
