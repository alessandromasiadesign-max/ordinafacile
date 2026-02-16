import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, Store, Upload, X, Check } from "lucide-react";
import DeliveryZones from "../components/settings/DeliveryZones";
import DeliveryZonesMap from "../components/settings/DeliveryZonesMap";
import PromotionSelector from "../components/settings/PromotionSelector"; // Added import for PromotionSelector
import PaymentSettings from "../components/settings/PaymentSettings"; // Added import for PaymentSettings

export default function Settings() {
  const [restaurant, setRestaurant] = useState(null);
  const [formData, setFormData] = useState({
    nome: "",
    descrizione: "",
    logo_url: "",
    immagine_header_url: "",
    immagine_sfondo_url: "", // New field for background image
    colore_sfondo: "#f8f9fa",
    colore_primario: "#e74c3c",
    indirizzo: "",
    citta: "",
    telefono: "",
    email: "",
    tipo_cucina: "",
    modalita_consegna: [],
    orari_apertura: {
      lunedi: "",
      martedi: "",
      mercoledi: "",
      giovedi: "",
      venerdi: "",
      sabato: "",
      domenica: ""
    },
    ordine_minimo: 0,
    attivo: true,
    zone_consegna: [],
    promozioni_evidenza: [], // New field for featured promotions
    payment_settings: { // New field for payment settings
      paypal_enabled: false,
      paypal_email: "",
      stripe_enabled: false,
      stripe_public_key: "",
      cash_enabled: true
    },
    configurazione_fiscale: { // New field for fiscal configuration
      ragione_sociale: "",
      partita_iva: "",
      codice_fiscale: "",
      iva_venduto: "10%",
      indirizzo_fiscale: "",
      pec: "",
      sdi: ""
    },
    link_facebook: "" // New field for Facebook link
  });
  const [uploading, setUploading] = useState({ logo: false, header: false, background: false }); // Updated uploading state
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      if (restaurant) {
        return base44.entities.Restaurant.update(restaurant.id, data);
      } else {
        return base44.entities.Restaurant.create({
          ...data,
          user_id: user.id
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurants'] });
      alert("✅ Impostazioni salvate con successo!");
      loadRestaurant();
    },
    onError: (error) => {
      console.error("Errore nel salvataggio:", error);
      alert("❌ Errore durante il salvataggio delle impostazioni.");
    }
  });

  useEffect(() => {
    loadRestaurant();
  }, []);

  const loadRestaurant = async () => {
    try {
      const user = await base44.auth.me();
      const restaurants = await base44.entities.Restaurant.filter({
        user_id: user.id
      });
      if (restaurants.length > 0) {
        setRestaurant(restaurants[0]);
        setFormData(prev => ({
          ...prev,
          ...restaurants[0],
          orari_apertura: typeof restaurants[0].orari_apertura === 'object' && restaurants[0].orari_apertura !== null
            ? restaurants[0].orari_apertura
            : {
                lunedi: "", martedi: "", mercoledi: "", giovedi: "", venerdi: "", sabato: "", domenica: ""
              },
          modalita_consegna: Array.isArray(restaurants[0].modalita_consegna)
            ? restaurants[0].modalita_consegna
            : [],
          zone_consegna: Array.isArray(restaurants[0].zone_consegna)
            ? restaurants[0].zone_consegna
            : [],
          promozioni_evidenza: Array.isArray(restaurants[0].promozioni_evidenza) // Initialize new field
            ? restaurants[0].promozioni_evidenza
            : [],
          immagine_sfondo_url: restaurants[0].immagine_sfondo_url || "", // Initialize new field
          payment_settings: restaurants[0].payment_settings || { // Initialize new field
            paypal_enabled: false,
            paypal_email: "",
            stripe_enabled: false,
            stripe_public_key: "",
            cash_enabled: true
          },
          configurazione_fiscale: restaurants[0].configurazione_fiscale || { // Initialize new field
            ragione_sociale: "",
            partita_iva: "",
            codice_fiscale: "",
            iva_venduto: "10%",
            indirizzo_fiscale: "",
            pec: "",
            sdi: ""
          },
          link_facebook: restaurants[0].link_facebook || "" // Initialize new field
        }));
      }
    } catch (error) {
      console.error("Errore nel caricamento del ristorante:", error);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleModalita = (modalita) => {
    setFormData(prev => ({
      ...prev,
      modalita_consegna: prev.modalita_consegna?.includes(modalita)
        ? prev.modalita_consegna.filter(m => m !== modalita)
        : [...(prev.modalita_consegna || []), modalita]
    }));
  };

  const handleImageUpload = async (type, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(prev => ({ ...prev, [type]: true }));
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      let field;
      if (type === 'logo') {
        field = 'logo_url';
      } else if (type === 'header') {
        field = 'immagine_header_url';
      } else if (type === 'background') { // New type for background image
        field = 'immagine_sfondo_url';
      }
      setFormData(prev => ({ ...prev, [field]: file_url }));
    } catch (error) {
      alert("Errore caricamento immagine: " + (error.message || ""));
      console.error("Upload error:", error);
    }
    setUploading(prev => ({ ...prev, [type]: false }));
  };

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Impostazioni Ristorante</h1>
          <p className="text-sm md:text-base text-gray-500 mt-1">Configura i dettagli del tuo ristorante</p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="mb-4 md:mb-6">
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <Store className="w-4 h-4 md:w-5 md:h-5" />
                Informazioni Generali
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4 md:p-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome Ristorante *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => handleChange("nome", e.target.value)}
                    placeholder="Es: Pizzeria Napoli"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tipo_cucina">Tipo Cucina</Label>
                  <Select
                    value={formData.tipo_cucina}
                    onValueChange={(value) => handleChange("tipo_cucina", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pizzeria">Pizzeria</SelectItem>
                      <SelectItem value="Ristorante">Ristorante</SelectItem>
                      <SelectItem value="Trattoria">Trattoria</SelectItem>
                      <SelectItem value="Fast Food">Fast Food</SelectItem>
                      <SelectItem value="Sushi">Sushi</SelectItem>
                      <SelectItem value="Altro">Altro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descrizione">Descrizione</Label>
                <Textarea
                  id="descrizione"
                  value={formData.descrizione}
                  onChange={(e) => handleChange("descrizione", e.target.value)}
                  placeholder="Racconta qualcosa sul tuo ristorante..."
                  rows={3}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="telefono">Telefono *</Label>
                  <Input
                    id="telefono"
                    type="tel"
                    value={formData.telefono}
                    onChange={(e) => handleChange("telefono", e.target.value)}
                    placeholder="Es: 081 1234567"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="info@ristorante.it"
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="indirizzo">Indirizzo *</Label>
                  <Input
                    id="indirizzo"
                    value={formData.indirizzo}
                    onChange={(e) => handleChange("indirizzo", e.target.value)}
                    placeholder="Via Roma, 123"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="citta">Città *</Label>
                  <Input
                    id="citta"
                    value={formData.citta}
                    onChange={(e) => handleChange("citta", e.target.value)}
                    placeholder="Napoli"
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Configurazione Fiscale */}
          <Card className="mb-4 md:mb-6">
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="text-base md:text-lg">Configurazione Fiscale</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4 md:p-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ragione Sociale *</Label>
                  <Input
                    value={formData.configurazione_fiscale?.ragione_sociale || ""}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      configurazione_fiscale: {
                        ...prev.configurazione_fiscale,
                        ragione_sociale: e.target.value
                      }
                    }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Partita IVA *</Label>
                  <Input
                    value={formData.configurazione_fiscale?.partita_iva || ""}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      configurazione_fiscale: {
                        ...prev.configurazione_fiscale,
                        partita_iva: e.target.value
                      }
                    }))}
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Codice Fiscale *</Label>
                  <Input
                    value={formData.configurazione_fiscale?.codice_fiscale || ""}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      configurazione_fiscale: {
                        ...prev.configurazione_fiscale,
                        codice_fiscale: e.target.value
                      }
                    }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Aliquota IVA sul Venduto *</Label>
                  <Select
                    value={formData.configurazione_fiscale?.iva_venduto || "10%"}
                    onValueChange={(value) => setFormData(prev => ({
                      ...prev,
                      configurazione_fiscale: {
                        ...prev.configurazione_fiscale,
                        iva_venduto: value
                      }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="4%">4% - Alimenti base</SelectItem>
                      <SelectItem value="5%">5% - Regime speciale</SelectItem>
                      <SelectItem value="10%">10% - Ristorazione</SelectItem>
                      <SelectItem value="22%">22% - Aliquota ordinaria</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Indirizzo Fiscale *</Label>
                <Input
                  value={formData.configurazione_fiscale?.indirizzo_fiscale || ""}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    configurazione_fiscale: {
                      ...prev.configurazione_fiscale,
                      indirizzo_fiscale: e.target.value
                    }
                  }))}
                  required
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>PEC *</Label>
                  <Input
                    type="email"
                    value={formData.configurazione_fiscale?.pec || ""}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      configurazione_fiscale: {
                        ...prev.configurazione_fiscale,
                        pec: e.target.value
                      }
                    }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Codice SDI *</Label>
                  <Input
                    value={formData.configurazione_fiscale?.sdi || ""}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      configurazione_fiscale: {
                        ...prev.configurazione_fiscale,
                        sdi: e.target.value
                      }
                    }))}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Social Media */}
          <Card className="mb-4 md:mb-6">
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="text-base md:text-lg">Social Media</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4 md:p-6">
              <div className="space-y-2">
                <Label>Link Pagina Facebook</Label>
                <Input
                  type="url"
                  value={formData.link_facebook || ""}
                  onChange={(e) => handleChange("link_facebook", e.target.value)}
                  placeholder="https://facebook.com/tuoristorante"
                />
                <p className="text-xs text-gray-500">
                  Questo link verrà utilizzato per gli ordini dalla tua pagina Facebook
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-4 md:mb-6">
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="text-base md:text-lg">Personalizzazione Pagina</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4 md:p-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Logo Ristorante</Label>
                  <p className="text-xs text-gray-500 mb-2">
                    📸 Formato consigliato: PNG trasparente | Risoluzione: 512x512px | Max 500KB
                  </p>
                  {formData.logo_url ? (
                    <div className="relative group">
                      <img 
                        src={formData.logo_url}
                        alt="Logo"
                        className="w-32 h-32 object-contain rounded-lg border p-1"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setFormData(prev => ({ ...prev, logo_url: "" }))}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center cursor-pointer hover:border-gray-400">
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-500">
                        {uploading.logo ? "Caricamento..." : "Carica Logo"}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload('logo', e)}
                        className="hidden"
                        disabled={uploading.logo}
                      />
                    </label>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Immagine Intestazione</Label>
                  <p className="text-xs text-gray-500 mb-2">
                    📸 Formato consigliato: JPG/PNG | Risoluzione: 1920x400px | Max 2MB
                  </p>
                  {formData.immagine_header_url ? (
                    <div className="relative group">
                      <img 
                        src={formData.immagine_header_url}
                        alt="Header"
                        className="w-full h-32 object-cover rounded-lg border p-1"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setFormData(prev => ({ ...prev, immagine_header_url: "" }))}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center cursor-pointer hover:border-gray-400">
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-500">
                        {uploading.header ? "Caricamento..." : "Carica Immagine"}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload('header', e)}
                        className="hidden"
                        disabled={uploading.header}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* New: Immagine Sfondo Pagina */}
              <div className="space-y-2">
                  <Label>Immagine Sfondo Pagina (opzionale)</Label>
                  <p className="text-xs text-gray-500 mb-2">
                    📸 Formato consigliato: JPG/PNG | Risoluzione: 1920x1080px | Max 2MB
                  </p>
                  {formData.immagine_sfondo_url ? (
                    <div className="relative group">
                      <img 
                        src={formData.immagine_sfondo_url}
                        alt="Sfondo"
                        className="w-full h-32 object-cover rounded-lg border p-1"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setFormData(prev => ({ ...prev, immagine_sfondo_url: "" }))}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center cursor-pointer hover:border-gray-400">
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-500">
                        {uploading.background ? "Caricamento..." : "Carica Sfondo"}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload('background', e)} // Changed type to 'background'
                        className="hidden"
                        disabled={uploading.background} // Use uploading.background
                      />
                    </label>
                  )}
                </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="colore_sfondo">Colore Sfondo</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      id="colore_sfondo"
                      type="color"
                      value={formData.colore_sfondo}
                      onChange={(e) => handleChange("colore_sfondo", e.target.value)}
                      className="h-10 w-10 p-0 border cursor-pointer"
                      title="Scegli colore sfondo"
                    />
                    <Input
                      type="text"
                      value={formData.colore_sfondo}
                      onChange={(e) => handleChange("colore_sfondo", e.target.value)}
                      className="flex-1"
                      placeholder="#RRGGBB"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="colore_primario">Colore Primario</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      id="colore_primario"
                      type="color"
                      value={formData.colore_primario}
                      onChange={(e) => handleChange("colore_primario", e.target.value)}
                      className="h-10 w-10 p-0 border cursor-pointer"
                      title="Scegli colore primario"
                    />
                    <Input
                      type="text"
                      value={formData.colore_primario}
                      onChange={(e) => handleChange("colore_primario", e.target.value)}
                      className="flex-1"
                      placeholder="#RRGGBB"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-4 md:mb-6">
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="text-base md:text-lg">Orari di Apertura</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4 md:p-6">
              {['lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato', 'domenica'].map(day => (
                <div key={day} className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 items-center">
                  <Label className="capitalize text-sm font-medium">{day}</Label>
                  <Input
                    value={formData.orari_apertura[day] || ""}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      orari_apertura: { ...prev.orari_apertura, [day]: e.target.value }
                    }))}
                    placeholder="es: 11:00-23:00 oppure Chiuso"
                    className="col-span-2"
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="mb-4 md:mb-6">
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="text-base md:text-lg">Modalità Ordini</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4 md:p-6">
              <div className="space-y-3">
                <Label>Modalità disponibili</Label>
                
                <div 
                  className={`flex items-center space-x-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                    formData.modalita_consegna?.includes("consegna") 
                      ? 'border-red-500 bg-red-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => toggleModalita("consegna")}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                    formData.modalita_consegna?.includes("consegna") 
                      ? 'border-red-500 bg-red-500' 
                      : 'border-gray-300'
                  }`}>
                    {formData.modalita_consegna?.includes("consegna") && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </div>
                  <label className="text-sm font-medium cursor-pointer flex-1">
                    Consegna a domicilio
                  </label>
                </div>
                
                <div 
                  className={`flex items-center space-x-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                    formData.modalita_consegna?.includes("asporto") 
                      ? 'border-red-500 bg-red-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => toggleModalita("asporto")}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                    formData.modalita_consegna?.includes("asporto") 
                      ? 'border-red-500 bg-red-500' 
                      : 'border-gray-300'
                  }`}>
                    {formData.modalita_consegna?.includes("asporto") && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </div>
                  <label className="text-sm font-medium cursor-pointer flex-1">
                    Asporto
                  </label>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ordine_minimo">Ordine Minimo Generale (€)</Label>
                  <Input
                    id="ordine_minimo"
                    type="number"
                    step="0.01"
                    value={formData.ordine_minimo}
                    onChange={(e) => handleChange("ordine_minimo", parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {formData.modalita_consegna?.includes("consegna") && (
            <DeliveryZonesMap
              zones={formData.zone_consegna || []}
              onZonesChange={(zones) => handleChange("zone_consegna", zones)}
              restaurantCoords={formData.coordinate_ristorante}
              restaurantAddress={formData.indirizzo && formData.citta ? `${formData.indirizzo}, ${formData.citta}` : null}
            />
          )}

          {/* New: Promozioni in Evidenza */}
          <Card className="mb-4 md:mb-6">
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="text-base md:text-lg">Promozioni in Evidenza</CardTitle>
                <p className="text-xs md:text-sm text-gray-500 mt-1">
                  Seleziona fino a 2 promozioni da mostrare in homepage
                </p>
              </CardHeader>
              <CardContent className="p-4 md:p-6">
                <PromotionSelector
                  selectedIds={formData.promozioni_evidenza || []}
                  onChange={(ids) => setFormData(prev => ({ ...prev, promozioni_evidenza: ids }))}
                  restaurantId={restaurant?.id}
                />
              </CardContent>
            </Card>

          {/* New: Payment Settings */}
          <PaymentSettings
            paymentSettings={formData.payment_settings}
            onChange={(settings) => setFormData(prev => ({ 
              ...prev, 
              payment_settings: settings 
            }))}
          />

          <div className="flex justify-end mt-6 sticky bottom-0 bg-gray-50 py-4 -mx-4 px-4 md:static md:bg-transparent md:py-0 md:mx-0 md:px-0">
            <Button 
              type="submit" 
              className="bg-red-600 hover:bg-red-700 w-full md:w-auto text-sm md:text-base"
              disabled={saveMutation.isPending || uploading.logo || uploading.header || uploading.background}
            >
              <Save className="w-4 h-4 mr-2" />
              {saveMutation.isPending ? "Salvataggio..." : "Salva Impostazioni"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}