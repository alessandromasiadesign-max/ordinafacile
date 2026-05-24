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
              ? "bg-green-100 text-green-800 border-green-300" 
              : "bg-red-100 text-red-800 border-red-300"
          } border font-semibold`}
        >
          {active ? "✓ ATTIVO" : "✗ DISATTIVO"}
        </Badge>
      </div>
      
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${
          active ? "bg-green-500" : "bg-muted"
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