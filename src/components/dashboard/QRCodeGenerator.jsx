
import React, { useState, useRef } from 'react'; // Added useRef
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Copy } from "lucide-react"; // Added Copy icon
import { createPageUrl } from "@/utils";

export default function QRCodeGenerator({ restaurant }) {
  const [qrSize, setQrSize] = useState(300);
  const qrRef = useRef(null); // Added useRef for QR container

  if (!restaurant) return null;

  const menuUrl = `${window.location.origin}${createPageUrl(`RestaurantPublic?id=${restaurant.id}`)}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(menuUrl)}`;

  const downloadQR = () => {
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `qrcode-${restaurant.nome}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyLink = () => { // New function for copying link
    navigator.clipboard.writeText(menuUrl);
    alert('✅ Link copiato negli appunti!');
  };

  // Removed printQR and shareQR functions as per changes

  return (
    <Card>
      <CardHeader>
        {/* Updated CardTitle text and styling */}
        <CardTitle className="text-base md:text-lg">QR Code Ordini</CardTitle>
      </CardHeader>
      {/* Updated CardContent spacing */}
      <CardContent className="space-y-3 md:space-y-4">
        {/* New structure for QR Code display */}
        <div className="bg-white p-3 md:p-4 rounded-lg border-2 border-dashed border-gray-300">
          <div ref={qrRef} className="flex justify-center">
            <div className="w-full max-w-[200px] md:max-w-xs">
              {/* QR Code renders here, using the existing qrCodeUrl */}
              <img 
                src={qrCodeUrl}
                alt="QR Code Menu"
                className="w-full h-auto" // Ensures responsiveness within the container
              />
            </div>
          </div>
        </div>
        
        {/* Updated button group for Download and Copy Link */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={downloadQR}
            variant="outline"
            className="w-full text-xs md:text-sm" // Responsive text size
            size="sm" // Small button size
          >
            <Download className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" /> {/* Responsive icon size and spacing */}
            <span className="hidden sm:inline">Download</span> {/* Full text on larger screens */}
            <span className="sm:hidden">PNG</span> {/* Abbreviated text on small screens */}
          </Button>
          <Button
            onClick={copyLink} // Uses the new copyLink function
            variant="outline"
            className="w-full text-xs md:text-sm" // Responsive text size
            size="sm" // Small button size
          >
            <Copy className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" /> {/* Responsive icon size and spacing */}
            <span className="hidden sm:inline">Copia Link</span> {/* Full text on larger screens */}
            <span className="sm:hidden">Link</span> {/* Abbreviated text on small screens */}
          </Button>
        </div>

        {/* New informational text */}
        <div className="text-xs md:text-sm text-gray-500 text-center">
          Stampa e mostra questo QR ai clienti
        </div>
      </CardContent>
    </Card>
  );
}
