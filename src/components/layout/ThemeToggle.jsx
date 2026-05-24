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
        className="flex items-center gap-2 rounded-full border border-border bg-background/80 backdrop-blur px-2 py-1 shadow-sm"
        aria-label="Interruttore tema"
        title={resolvedTheme === "dark" ? "Tema scuro: attivo" : "Tema scuro: disattivo"}
      >
        <Sun className="h-4 w-4 text-muted-foreground" />
        <Switch
          checked={resolvedTheme === "dark"}
          onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
          aria-label="Tema scuro"
        />
        <Moon className="h-4 w-4 text-muted-foreground" />
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
