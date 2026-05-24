import { Core } from '@/api/integrations';

import React, { useState, useEffect } from "react";
import { supabase } from '@/api/supabaseClient';
import { createPageUrl } from "@/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Restaurant, Category, MenuItem } from '@/api/entities';
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
import DeliveryZonesMap from "../components/settings/DeliveryZonesMap";
import PromotionSelector from "../components/settings/PromotionSelector"; // Added import for PromotionSelector
import PaymentSettings from "../components/settings/PaymentSettings"; // Added import for PaymentSettings

export default function Settings() {
  const [restaurant, setRestaurant] = useState(null);
  const [openingHoursUI, setOpeningHoursUI] = useState({});
  const [deliveryHoursUI, setDeliveryHoursUI] = useState({});
  const isOnboarding = new URLSearchParams(window.location.search).get('onboarding') === '1';
  const isOnboardingWizard = isOnboarding && !restaurant;
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
    link_facebook: "", // New field for Facebook link
    settings: {
      order_capacity: {
        enabled: false,
        max_orders: 0,
        window_minutes: 30,
      },
      delivery_hours: {
        lunedi: "",
        martedi: "",
        mercoledi: "",
        giovedi: "",
        venerdi: "",
        sabato: "",
        domenica: "",
      },
    },
  });

  const [uploading, setUploading] = useState({ logo: false, header: false, background: false }); // Updated uploading state
  const queryClient = useQueryClient();

  const DAYS = ['lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato', 'domenica'];

  const parseTimeToMinutes = (hhmm) => {
    const m = String(hhmm ?? '').trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    const h = Number(m[1]);
    const mm = Number(m[2]);
    if (!Number.isFinite(h) || !Number.isFinite(mm)) return null;
    if (h < 0 || h > 23 || mm < 0 || mm > 59) return null;
    return h * 60 + mm;
  };

  const isValidHoursRangeString = (raw) => {
    const s = String(raw ?? '').trim();
    if (!s) return true;
    const chunks = s
      .split(/[,;]+/)
      .map((x) => x.trim())
      .filter(Boolean);
    if (chunks.length === 0) return true;

    for (const chunk of chunks) {
      const parts = chunk.split('-').map((p) => p.trim());
      if (parts.length !== 2) return false;
      const startMin = parseTimeToMinutes(parts[0]);
      const endMin = parseTimeToMinutes(parts[1]);
      if (startMin == null || endMin == null) return false;
    }
    return true;
  };

  const parseRangesFromString = (raw) => {
    const s = String(raw ?? '').trim();
    if (!s) return [];
    const chunks = s
      .split(/[,;]+/)
      .map((x) => x.trim())
      .filter(Boolean);
    const ranges = [];
    for (const chunk of chunks) {
      const parts = chunk.split('-').map((p) => p.trim());
      if (parts.length !== 2) continue;
      const start = parts[0];
      const end = parts[1];
      if (parseTimeToMinutes(start) == null || parseTimeToMinutes(end) == null) continue;
      ranges.push({ start, end });
    }
    return ranges;
  };

  const serializeRangesToString = (ranges) => {
    const safe = Array.isArray(ranges) ? ranges : [];
    return safe
      .map((r) => ({ start: String(r?.start ?? '').trim(), end: String(r?.end ?? '').trim() }))
      .filter((r) => parseTimeToMinutes(r.start) != null && parseTimeToMinutes(r.end) != null)
      .map((r) => `${r.start}-${r.end}`)
      .join(', ');
  };

  const buildHoursUIFromRecord = (recordMap) => {
    const out = {};
    for (const day of DAYS) {
      const str = String(recordMap?.[day] ?? '').trim();
      const ranges = parseRangesFromString(str);
      out[day] = {
        closed: ranges.length === 0,
        ranges: ranges.length > 0 ? ranges : [{ start: '', end: '' }],
      };
    }
    return out;
  };

  const persistOpeningHoursUI = (ui) => {
    const nextMap = {};
    for (const day of DAYS) {
      const dayUI = ui?.[day];
      nextMap[day] = dayUI?.closed ? '' : serializeRangesToString(dayUI?.ranges);
    }
    setFormData((prev) => ({
      ...prev,
      orari_apertura: {
        ...(prev?.orari_apertura && typeof prev.orari_apertura === 'object' ? prev.orari_apertura : {}),
        ...nextMap,
      },
    }));
  };

  const persistDeliveryHoursUI = (ui) => {
    const nextMap = {};
    for (const day of DAYS) {
      const dayUI = ui?.[day];
      nextMap[day] = dayUI?.closed ? '' : serializeRangesToString(dayUI?.ranges);
    }
    setFormData((prev) => ({
      ...prev,
      settings: {
        ...(prev?.settings && typeof prev.settings === 'object' ? prev.settings : {}),
        delivery_hours: {
          ...((prev?.settings?.delivery_hours && typeof prev.settings.delivery_hours === 'object')
            ? prev.settings.delivery_hours
            : {}),
          ...nextMap,
        },
      },
    }));
  };

  const sanitizeRestaurantPayload = (data) => {
    const next = { ...(data || {}) };

    // Never send immutable/system fields back in update/insert.
    delete next.id;
    delete next.created_at;
    delete next.updated_at;
    delete next.created_date;
    delete next.user_id;

    // Normalize types
    if ('ordine_minimo' in next) {
      const v = Number(next.ordine_minimo);
      next.ordine_minimo = Number.isFinite(v) ? v : 0;
    }
    if ('attivo' in next) {
      next.attivo = !!next.attivo;
    }
    if (next?.settings?.order_capacity) {
      next.settings = {
        ...(typeof next.settings === 'object' && next.settings !== null ? next.settings : {}),
        order_capacity: {
          ...(typeof next.settings.order_capacity === 'object' && next.settings.order_capacity !== null
            ? next.settings.order_capacity
            : {}),
          enabled: !!next.settings.order_capacity.enabled,
          max_orders: Number(next.settings.order_capacity.max_orders ?? 0),
          window_minutes: Number(next.settings.order_capacity.window_minutes ?? 30),
        },
      };
    }

    if (next?.settings?.delivery_hours && typeof next.settings.delivery_hours === 'object') {
      next.settings = {
        ...(typeof next.settings === 'object' && next.settings !== null ? next.settings : {}),
        delivery_hours: {
          lunedi: String(next.settings.delivery_hours?.lunedi ?? ''),
          martedi: String(next.settings.delivery_hours?.martedi ?? ''),
          mercoledi: String(next.settings.delivery_hours?.mercoledi ?? ''),
          giovedi: String(next.settings.delivery_hours?.giovedi ?? ''),
          venerdi: String(next.settings.delivery_hours?.venerdi ?? ''),
          sabato: String(next.settings.delivery_hours?.sabato ?? ''),
          domenica: String(next.settings.delivery_hours?.domenica ?? ''),
        },
      };
    }

    return next;
  };

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const user = (await supabase.auth.getUser()).data.user;
      const payload = sanitizeRestaurantPayload(data);
      if (restaurant) {
        return await Restaurant.update(restaurant.id, payload);
      }
      return await Restaurant.create({
        ...payload,
        user_id: user.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurants'] });
      alert("Impostazioni salvate con successo!");
      if (isOnboardingWizard) {
        window.location.href = `${createPageUrl("MenuManagement")}?onboarding=1`;
        return;
      }
      loadRestaurant();
    },
    onError: (error) => {
      console.error("Errore nel salvataggio:", error);
      const msg =
        error?.message ??
        error?.details ??
        error?.error_description ??
        "Errore durante il salvataggio delle impostazioni.";
      alert(`${msg}`);
    }
  });

  useEffect(() => {
    loadRestaurant();
  }, []);

  const { data: menuCategories = [] } = useQuery({
    queryKey: ['settings-menu-categories', restaurant?.id],
    queryFn: async () => {
      if (!restaurant?.id) return [];
      return Category.filter({ restaurant_id: restaurant.id, event_id: null }, 'ordine');
    },
    enabled: !!restaurant?.id,
    initialData: [],
  });

  const { data: menuItems = [] } = useQuery({
    queryKey: ['settings-menu-items', restaurant?.id],
    queryFn: async () => {
      if (!restaurant?.id) return [];
      return MenuItem.filter({ restaurant_id: restaurant.id });
    },
    enabled: !!restaurant?.id,
    initialData: [],
  });

  const loadRestaurant = async () => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user?.id) return;
      const isAdmin = user?.app_metadata?.role === 'admin' || user?.user_metadata?.role === 'admin';
      const storedId = localStorage.getItem('selected_restaurant_id');

      const restaurants = isAdmin
        ? await Restaurant.list('-created_at')
        : await Restaurant.filter({ user_id: user.id });
      if (restaurants.length > 0) {
        const selected = restaurants.find((r) => r.id === storedId) || restaurants[0];
        if (selected?.id) {
          localStorage.setItem('selected_restaurant_id', selected.id);
        }
        setRestaurant(selected);
        setOpeningHoursUI(buildHoursUIFromRecord(selected?.orari_apertura));
        setDeliveryHoursUI(buildHoursUIFromRecord(selected?.settings?.delivery_hours));
        setFormData(prev => ({
          ...prev,
          ...selected,
          settings: {
            ...(selected?.settings && typeof selected.settings === 'object' ? selected.settings : {}),
            order_capacity: {
              enabled: !!selected?.settings?.order_capacity?.enabled,
              max_orders: Number(selected?.settings?.order_capacity?.max_orders ?? 0),
              window_minutes: Number(selected?.settings?.order_capacity?.window_minutes ?? 30),
            },
            delivery_hours:
              typeof selected?.settings?.delivery_hours === 'object' && selected.settings.delivery_hours !== null
                ? selected.settings.delivery_hours
                : {
                    lunedi: "",
                    martedi: "",
                    mercoledi: "",
                    giovedi: "",
                    venerdi: "",
                    sabato: "",
                    domenica: "",
                  },
          },
          orari_apertura: typeof selected.orari_apertura === 'object' && selected.orari_apertura !== null
            ? selected.orari_apertura
            : {
                lunedi: "", martedi: "", mercoledi: "", giovedi: "", venerdi: "", sabato: "", domenica: ""
              },
          modalita_consegna: Array.isArray(selected.modalita_consegna)
            ? selected.modalita_consegna
            : [],
          zone_consegna: Array.isArray(selected.zone_consegna)
            ? selected.zone_consegna
            : [],
          promozioni_evidenza: Array.isArray(selected.promozioni_evidenza) // Initialize new field
            ? selected.promozioni_evidenza
            : [],
          immagine_sfondo_url: selected.immagine_sfondo_url || "", // Initialize new field
          payment_settings: selected.payment_settings || { // Initialize new field
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

    for (const day of DAYS) {
      if (!isValidHoursRangeString(formData?.orari_apertura?.[day])) {
        alert(`Formato orari di apertura non valido per ${day}. Usa HH:MM-HH:MM (es: 12:00-15:00, 19:00-23:00).`);
        return;
      }
    }

    if (formData?.modalita_consegna?.includes('consegna')) {
      for (const day of DAYS) {
        if (!isValidHoursRangeString(formData?.settings?.delivery_hours?.[day])) {
          alert(`Formato orari di consegna non valido per ${day}. Usa HH:MM-HH:MM (es: 12:00-15:00, 19:00-23:00).`);
          return;
        }
      }
    }

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

    if (modalita === 'consegna') {
      setDeliveryHoursUI((prev) => {
        const next = prev && typeof prev === 'object' && Object.keys(prev).length > 0
          ? prev
          : buildHoursUIFromRecord(formData?.settings?.delivery_hours);
        persistDeliveryHoursUI(next);
        return next;
      });
    }
  };

  const handleImageUpload = async (type, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(prev => ({ ...prev, [type]: true }));
    try {
      const { file_url } = await Core.UploadFile({ file });
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
    <div className="p-4 md:p-8 bg-background text-foreground min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold">Impostazioni Ristorante</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">Configura i dettagli del tuo ristorante</p>
        </div>

        {isOnboarding && !restaurant && (
          <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-900">
            Benvenuto! Per iniziare a ricevere ordini, completa i dati del ristorante e salva.
          </div>
        )}

        {!!restaurant?.id && (menuCategories.length === 0 || menuItems.length === 0) && (
          <Card className="mb-4 md:mb-6 border-yellow-200 bg-yellow-50">
            <CardContent className="p-4 md:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="font-semibold">Completa il menu</div>
                  <div className="text-sm text-muted-foreground">
                    Aggiungi almeno una categoria e un prodotto in Gestione Menu.
                  </div>
                </div>
                <Button
                  type="button"
                  className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
                  onClick={() => {
                    window.location.href = `${createPageUrl('MenuManagement')}?onboarding=1`;
                  }}
                >
                  Vai a Gestione Menu
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

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

          {isOnboardingWizard && (
            <div className="mb-4 rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
              Dopo il primo salvataggio potrai configurare anche pagamenti, personalizzazione grafica, promozioni e altri dettagli.
            </div>
          )}

          {!isOnboardingWizard && (
            <>
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
                <p className="text-xs text-muted-foreground">
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
                  <p className="text-xs text-muted-foreground mb-2">
                    Formato consigliato: PNG trasparente | Risoluzione: 512x512px | Max 500KB
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
                    <label className="border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center cursor-pointer hover:bg-accent">
                      <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">
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
                  <p className="text-xs text-muted-foreground mb-2">
                    Formato consigliato: JPG/PNG | Risoluzione: 1920x400px | Max 2MB
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
                    <label className="border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center cursor-pointer hover:bg-accent">
                      <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">
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
                  <p className="text-xs text-muted-foreground mb-2">
                    Formato consigliato: JPG/PNG | Risoluzione: 1920x1080px | Max 2MB
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
                    <label className="border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center cursor-pointer hover:bg-accent">
                      <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">
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

            </>
          )}

          <Card className="mb-4 md:mb-6">
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="text-base md:text-lg">Orari di Apertura</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4 md:p-6">
              {DAYS.map((day) => {
                const dayUI = openingHoursUI?.[day] ?? { closed: true, ranges: [{ start: '', end: '' }] };
                return (
                  <div key={day} className="border rounded-lg p-3 md:p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <Label className="capitalize text-sm font-medium">{day}</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={!!dayUI.closed}
                          onChange={(e) => {
                            const closed = !!e.target.checked;
                            setOpeningHoursUI((prev) => {
                              const next = {
                                ...(prev && typeof prev === 'object' ? prev : {}),
                                [day]: {
                                  closed,
                                  ranges: closed ? [{ start: '', end: '' }] : (dayUI?.ranges?.length ? dayUI.ranges : [{ start: '', end: '' }]),
                                },
                              };
                              persistOpeningHoursUI(next);
                              return next;
                            });
                          }}
                        />
                        <span className="text-sm text-muted-foreground">Chiuso</span>
                      </div>
                    </div>

                    {!dayUI.closed && (
                      <div className="space-y-2">
                        {(Array.isArray(dayUI.ranges) ? dayUI.ranges : []).map((r, idx) => (
                          <div key={idx} className="grid grid-cols-1 md:grid-cols-7 gap-2 items-center">
                            <div className="md:col-span-3">
                              <Label className="text-xs text-muted-foreground">Da</Label>
                              <Input
                                type="time"
                                value={String(r?.start ?? '')}
                                onChange={(e) => {
                                  const start = e.target.value;
                                  setOpeningHoursUI((prev) => {
                                    const current = prev?.[day] ?? dayUI;
                                    const nextRanges = (Array.isArray(current?.ranges) ? current.ranges : []).map((x, i) =>
                                      i === idx ? { ...(x || {}), start } : x
                                    );
                                    const next = {
                                      ...(prev && typeof prev === 'object' ? prev : {}),
                                      [day]: { ...current, closed: false, ranges: nextRanges },
                                    };
                                    persistOpeningHoursUI(next);
                                    return next;
                                  });
                                }}
                              />
                            </div>
                            <div className="md:col-span-3">
                              <Label className="text-xs text-muted-foreground">A</Label>
                              <Input
                                type="time"
                                value={String(r?.end ?? '')}
                                onChange={(e) => {
                                  const end = e.target.value;
                                  setOpeningHoursUI((prev) => {
                                    const current = prev?.[day] ?? dayUI;
                                    const nextRanges = (Array.isArray(current?.ranges) ? current.ranges : []).map((x, i) =>
                                      i === idx ? { ...(x || {}), end } : x
                                    );
                                    const next = {
                                      ...(prev && typeof prev === 'object' ? prev : {}),
                                      [day]: { ...current, closed: false, ranges: nextRanges },
                                    };
                                    persistOpeningHoursUI(next);
                                    return next;
                                  });
                                }}
                              />
                            </div>
                            <div className="md:col-span-1 flex md:justify-end">
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                onClick={() => {
                                  setOpeningHoursUI((prev) => {
                                    const current = prev?.[day] ?? dayUI;
                                    const nextRanges = (Array.isArray(current?.ranges) ? current.ranges : []).filter((_, i) => i !== idx);
                                    const normalizedRanges = nextRanges.length > 0 ? nextRanges : [{ start: '', end: '' }];
                                    const next = {
                                      ...(prev && typeof prev === 'object' ? prev : {}),
                                      [day]: { ...current, closed: false, ranges: normalizedRanges },
                                    };
                                    persistOpeningHoursUI(next);
                                    return next;
                                  });
                                }}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}

                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setOpeningHoursUI((prev) => {
                              const current = prev?.[day] ?? dayUI;
                              const nextRanges = [...(Array.isArray(current?.ranges) ? current.ranges : []), { start: '', end: '' }];
                              const next = {
                                ...(prev && typeof prev === 'object' ? prev : {}),
                                [day]: { ...current, closed: false, ranges: nextRanges },
                              };
                              persistOpeningHoursUI(next);
                              return next;
                            });
                          }}
                        >
                          Aggiungi fascia
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {formData.modalita_consegna?.includes('consegna') && (
            <Card className="mb-4 md:mb-6">
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="text-base md:text-lg">Orari di Consegna</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-4 md:p-6">
                {DAYS.map((day) => {
                  const dayUI = deliveryHoursUI?.[day] ?? { closed: true, ranges: [{ start: '', end: '' }] };
                  return (
                    <div key={day} className="border rounded-lg p-3 md:p-4 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <Label className="capitalize text-sm font-medium">{day}</Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={!!dayUI.closed}
                            onChange={(e) => {
                              const closed = !!e.target.checked;
                              setDeliveryHoursUI((prev) => {
                                const next = {
                                  ...(prev && typeof prev === 'object' ? prev : {}),
                                  [day]: {
                                    closed,
                                    ranges: closed ? [{ start: '', end: '' }] : (dayUI?.ranges?.length ? dayUI.ranges : [{ start: '', end: '' }]),
                                  },
                                };
                                persistDeliveryHoursUI(next);
                                return next;
                              });
                            }}
                          />
                          <span className="text-sm text-muted-foreground">Non disponibile</span>
                        </div>
                      </div>

                      {!dayUI.closed && (
                        <div className="space-y-2">
                          {(Array.isArray(dayUI.ranges) ? dayUI.ranges : []).map((r, idx) => (
                            <div key={idx} className="grid grid-cols-1 md:grid-cols-7 gap-2 items-center">
                              <div className="md:col-span-3">
                                <Label className="text-xs text-muted-foreground">Da</Label>
                                <Input
                                  type="time"
                                  value={String(r?.start ?? '')}
                                  onChange={(e) => {
                                    const start = e.target.value;
                                    setDeliveryHoursUI((prev) => {
                                      const current = prev?.[day] ?? dayUI;
                                      const nextRanges = (Array.isArray(current?.ranges) ? current.ranges : []).map((x, i) =>
                                        i === idx ? { ...(x || {}), start } : x
                                      );
                                      const next = {
                                        ...(prev && typeof prev === 'object' ? prev : {}),
                                        [day]: { ...current, closed: false, ranges: nextRanges },
                                      };
                                      persistDeliveryHoursUI(next);
                                      return next;
                                    });
                                  }}
                                />
                              </div>
                              <div className="md:col-span-3">
                                <Label className="text-xs text-muted-foreground">A</Label>
                                <Input
                                  type="time"
                                  value={String(r?.end ?? '')}
                                  onChange={(e) => {
                                    const end = e.target.value;
                                    setDeliveryHoursUI((prev) => {
                                      const current = prev?.[day] ?? dayUI;
                                      const nextRanges = (Array.isArray(current?.ranges) ? current.ranges : []).map((x, i) =>
                                        i === idx ? { ...(x || {}), end } : x
                                      );
                                      const next = {
                                        ...(prev && typeof prev === 'object' ? prev : {}),
                                        [day]: { ...current, closed: false, ranges: nextRanges },
                                      };
                                      persistDeliveryHoursUI(next);
                                      return next;
                                    });
                                  }}
                                />
                              </div>
                              <div className="md:col-span-1 flex md:justify-end">
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="icon"
                                  onClick={() => {
                                    setDeliveryHoursUI((prev) => {
                                      const current = prev?.[day] ?? dayUI;
                                      const nextRanges = (Array.isArray(current?.ranges) ? current.ranges : []).filter((_, i) => i !== idx);
                                      const normalizedRanges = nextRanges.length > 0 ? nextRanges : [{ start: '', end: '' }];
                                      const next = {
                                        ...(prev && typeof prev === 'object' ? prev : {}),
                                        [day]: { ...current, closed: false, ranges: normalizedRanges },
                                      };
                                      persistDeliveryHoursUI(next);
                                      return next;
                                    });
                                  }}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))}

                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setDeliveryHoursUI((prev) => {
                                const current = prev?.[day] ?? dayUI;
                                const nextRanges = [...(Array.isArray(current?.ranges) ? current.ranges : []), { start: '', end: '' }];
                                const next = {
                                  ...(prev && typeof prev === 'object' ? prev : {}),
                                  [day]: { ...current, closed: false, ranges: nextRanges },
                                };
                                persistDeliveryHoursUI(next);
                                return next;
                              });
                            }}
                          >
                            Aggiungi fascia
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

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
                      ? 'border-red-500 bg-red-50 dark:bg-red-950/30' 
                      : 'border-border hover:bg-accent'
                  }`}
                  onClick={() => toggleModalita("consegna")}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                    formData.modalita_consegna?.includes("consegna") 
                      ? 'border-red-500 bg-red-500' 
                      : 'border-border'
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
                      ? 'border-red-500 bg-red-50 dark:bg-red-950/30' 
                      : 'border-border hover:bg-accent'
                  }`}
                  onClick={() => toggleModalita("asporto")}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                    formData.modalita_consegna?.includes("asporto") 
                      ? 'border-red-500 bg-red-500' 
                      : 'border-border'
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


          {!isOnboardingWizard && (
            <>
          <Card className="mb-4 md:mb-6">
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="text-base md:text-lg">Capacità Ordini</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4 md:p-6">
              <div
                className={`flex items-center space-x-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                  formData.settings?.order_capacity?.enabled
                    ? 'border-red-500 bg-red-50 dark:bg-red-950/30'
                    : 'border-border hover:bg-accent'
                }`}
                onClick={() => setFormData(prev => ({
                  ...prev,
                  settings: {
                    ...(prev.settings || {}),
                    order_capacity: {
                      ...(prev.settings?.order_capacity || {}),
                      enabled: !prev.settings?.order_capacity?.enabled,
                    },
                  },
                }))}
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                  formData.settings?.order_capacity?.enabled
                    ? 'border-red-500 bg-red-500'
                    : 'border-border'
                }`}>
                  {formData.settings?.order_capacity?.enabled && (
                    <Check className="w-3 h-3 text-white" />
                  )}
                </div>
                <label className="text-sm font-medium cursor-pointer flex-1">
                  Limita il numero di ordini ricevibili
                </label>
              </div>

              {formData.settings?.order_capacity?.enabled && (
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Numero massimo ordini</Label>
                    <Input
                      type="number"
                      min="0"
                      value={Number(formData.settings?.order_capacity?.max_orders ?? 0)}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setFormData(prev => ({
                          ...prev,
                          settings: {
                            ...(prev.settings || {}),
                            order_capacity: {
                              ...(prev.settings?.order_capacity || {}),
                              max_orders: Number.isFinite(v) ? v : 0,
                            },
                          },
                        }));
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Finestra temporale (minuti)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={Number(formData.settings?.order_capacity?.window_minutes ?? 30)}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setFormData(prev => ({
                          ...prev,
                          settings: {
                            ...(prev.settings || {}),
                            order_capacity: {
                              ...(prev.settings?.order_capacity || {}),
                              window_minutes: Number.isFinite(v) ? v : 30,
                            },
                          },
                        }));
                      }}
                    />
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Quando il limite è raggiunto, i clienti vedranno un messaggio per riprovare tra pochi minuti.
              </p>
            </CardContent>
          </Card>

          {formData.modalita_consegna?.includes("consegna") && (
            <DeliveryZonesMap
              zones={formData.zone_consegna || []}
              onZonesChange={(zones) => handleChange("zone_consegna", zones)}
              restaurantCoords={formData.coordinate_ristorante}
              restaurantAddress={formData.indirizzo || null}
              restaurantCity={formData.citta || null}
            />
          )}

          {/* New: Promozioni in Evidenza */}
          <Card className="mb-4 md:mb-6">
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="text-base md:text-lg">Promozioni in Evidenza</CardTitle>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
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

            </>
          )}

          <div className="flex justify-end mt-6 sticky bottom-0 bg-background py-4 -mx-4 px-4 md:static md:bg-transparent md:py-0 md:mx-0 md:px-0">
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
