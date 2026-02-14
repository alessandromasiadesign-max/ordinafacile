import React from "react";
import { Button } from "@/components/ui/button";
import { Upload, X } from "lucide-react";

export default function ImageUpload({ 
  value, 
  onChange, 
  onRemove,
  uploading = false,
  label = "Immagine",
  recommendedFormat = "JPG/PNG",
  recommendedResolution = "1200x600px",
  maxSize = "2MB",
  className = ""
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <p className="text-xs text-gray-500 mb-2">
        📸 Formato: {recommendedFormat} | Risoluzione: {recommendedResolution} | Max: {maxSize}
      </p>
      
      {value ? (
        <div className="relative group">
          <img 
            src={value}
            alt={label}
            className="w-full h-48 object-cover rounded-lg border"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute -top-2 -right-2 h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
            onClick={onRemove}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <label className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center cursor-pointer hover:border-red-400 hover:bg-red-50 transition-all">
          <Upload className="w-10 h-10 text-gray-400 mb-2" />
          <span className="text-sm text-gray-600 font-medium">
            {uploading ? "Caricamento..." : "Clicca per caricare"}
          </span>
          <span className="text-xs text-gray-400 mt-1">
            {recommendedFormat} (max {maxSize})
          </span>
          <input
            type="file"
            accept="image/*"
            onChange={onChange}
            className="hidden"
            disabled={uploading}
          />
        </label>
      )}
    </div>
  );
}