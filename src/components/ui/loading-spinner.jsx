import React from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

export function LoadingSpinner({ size = "md", color = "orange" }) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
    xl: "w-16 h-16"
  };

  const colorClasses = {
    orange: "text-orange-600",
    red: "text-red-600",
    white: "text-white",
    gray: "text-muted-foreground"
  };

  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      className="inline-block"
    >
      <Loader2 className={`${sizeClasses[size]} ${colorClasses[color]}`} />
    </motion.div>
  );
}

export function LoadingOverlay({ message = "Caricamento..." }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-background rounded-lg shadow-2xl p-8 flex flex-col items-center gap-4 border border-border">
        <LoadingSpinner size="xl" />
        <p className="text-muted-foreground font-medium">{message}</p>
      </div>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="animate-pulse bg-background rounded-lg border border-border p-6">
      <div className="h-48 bg-muted rounded-lg mb-4"></div>
      <div className="h-6 bg-muted rounded w-3/4 mb-2"></div>
      <div className="h-4 bg-muted rounded w-1/2 mb-4"></div>
      <div className="flex justify-between items-center">
        <div className="h-8 bg-muted rounded w-20"></div>
        <div className="h-10 bg-muted rounded w-24"></div>
      </div>
    </div>
  );
}