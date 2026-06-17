import React from "react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

export default function StatusToggle({ active, onToggle, label = "Stato", disabled = false }) {
  return (
    <div className="flex items-center justify-between p-3 bg-muted rounded-lg border border-border">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <Badge 
          className={`${
            active 
              ? "bg-green-100 text-green-800 border-green-300 dark:bg-green-950/30 dark:text-green-100 dark:border-green-900/60" 
              : "bg-red-100 text-red-800 border-red-300 dark:bg-red-950/30 dark:text-red-100 dark:border-red-900/60"
          } border font-semibold`}
        >
          {active ? "✓ ATTIVO" : "✗ DISATTIVO"}
        </Badge>
      </div>
      
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
          active ? "bg-green-600" : "bg-slate-300 dark:bg-slate-700"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <motion.span
          layout
          className={`inline-block h-4 w-4 transform rounded-full bg-background shadow-lg transition-transform`}
          animate={{ x: active ? 22 : 2 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </button>
    </div>
  );
}