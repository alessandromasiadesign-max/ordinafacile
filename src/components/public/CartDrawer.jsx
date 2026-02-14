import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Minus, Trash2, Check } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import AddressValidator from "./AddressValidator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge"; // Assuming this exists in shadcn/ui

export default function CartDrawer({ open, onClose, cart, restaurant, deliveryType, onUpdateQuantity, onRemove, onClearCart }) {
  const [showCheckout, setShowCheckout] = useState(false);
  const [customerData, setCustomerData] = useState({
    nome: "",
    telefono: "",
    email: "",
    indirizzo: "",
    note: ""
  });
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [validatedAddress, setValidatedAddress] = useState(null); // New state for validated address
  const [deliveryZone, setDeliveryZone] = useState(null);       // New state for delivery zone
  const [deliveryDistance, setDeliveryDistance] = useState(null); // New state for delivery distance
  const [paymentMethod, setPaymentMethod] = useState("contanti"); // New state for payment method
  const [orderCompleted, setOrderCompleted] = useState(false);    // New state for showing completion screen
  const [completedOrder, setCompletedOrder] = useState(null);     // New state to store completed order details

  const queryClient = useQueryClient(); // Initialized useQueryClient

  const resetAllStates = () => {
    setShowCheckout(false);
    setCustomerData({ nome: "", telefono: "", email: "", indirizzo: "", note: "" });
    setPromoCode("");
    setAppliedPromo(null);
    setAcceptTerms(false);
    setValidatedAddress(null);
    setDeliveryZone(null);
    setDeliveryDistance(null);
    setPaymentMethod("contanti"); // Reset payment method
    setOrderCompleted(false);
    setCompletedOrder(null);
  }

  const createOrderMutation = useMutation({
    mutationFn: async (orderData) => {
      const order = await base44.entities.Order.create(orderData);
      
      // Invia conferma via email/SMS/WhatsApp
      if (customerData.email) {
        await base44.integrations.Core.SendEmail({
          to: customerData.email,
          subject: `Conferma Ordine #${order.numero_ordine} - ${restaurant.nome}`,
          body: `
            <h2>Grazie per il tuo ordine!</h2>
            <p><strong>Numero Ordine:</strong> #${order.numero_ordine}</p>
            <p><strong>Ristorante:</strong> ${restaurant.nome}</p>
            <p><strong>Totale:</strong> €${order.totale.toFixed(2)}</p>
            <p><strong>Tipo:</strong> ${order.tipo_consegna === 'consegna' ? 'Consegna' : 'Asporto'}</p>
            ${order.tipo_consegna === 'consegna' ? `<p><strong>Indirizzo:</strong> ${order.cliente_indirizzo}</p>` : ''}
            <p><strong>Metodo Pagamento:</strong> ${order.metodo_pagamento === 'contanti' ? 'Contanti alla consegna' : order.metodo_pagamento === 'paypal' ? 'PayPal' : 'Carta di Credito'}</p>
            <br>
            <h3>Prodotti:</h3>
            <ul>
              ${order.items.map(item => `
                <li>${item.quantita}x ${item.nome} - €${(item.prezzo_unitario * item.quantita).toFixed(2)}</li>
              `).join('')}
            </ul>
            <br>
            <p>Ti contatteremo a breve per confermare l'ordine!</p>
          `
        });
      }

      // Invia conferma WhatsApp via SMS (simulato)
      if (customerData.telefono) {
        const whatsappMessage = `
✅ *Ordine Confermato!*

*${restaurant.nome}*
Ordine: #${order.numero_ordine}
Totale: €${order.totale.toFixed(2)}
Tipo: ${order.tipo_consegna === 'consegna' ? 'Consegna' : 'Asporto'}
${order.tipo_consegna === 'consegna' ? `Indirizzo: ${order.cliente_indirizzo}` : ''}
Pagamento: ${order.metodo_pagamento === 'contanti' ? 'Contanti alla consegna' : order.metodo_pagamento === 'paypal' ? 'PayPal' : 'Carta di Credito'}

Ti contatteremo a breve!
        `.trim();
        
        // Apri WhatsApp Web con il messaggio
        const whatsappUrl = `https://wa.me/${customerData.telefono.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(whatsappMessage)}`;
        window.open(whatsappUrl, '_blank');
      }

      return order;
    },
    onSuccess: (order) => {
      setCompletedOrder(order);
      setOrderCompleted(true);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (error) => {
      console.error("Error creating order:", error);
      alert("❌ Errore durante l'invio dell'ordine. Riprova più tardi.");
    }
  });

  const { data: promotions = [] } = useQuery({
    queryKey: ['promotions', restaurant?.id],
    queryFn: async () => {
      if (!restaurant) return [];
      try {
        const response = await base44.entities.Promotion.filter({
          restaurant_id: restaurant.id,
          attiva: true
        });
        return response || [];
      } catch (error) {
        console.error("Error fetching promotions:", error);
        return [];
      }
    },
    enabled: !!restaurant,
    initialData: [],
  });

  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + (item.prezzo_totale * item.quantita), 0);
    const cartItemCount = cart.reduce((sum, item) => sum + item.quantita, 0);

    let deliveryCost = 0;
  if (deliveryType === "consegna") {
    if (deliveryZone) { // If a specific delivery zone is active
      deliveryCost = deliveryZone.costo;
    } else if (restaurant.costo_consegna) { // Fallback to general restaurant delivery cost
      deliveryCost = restaurant.costo_consegna;
    }
  }
  
  let discount = 0;
  let subtotalForDiscount = subtotal; // Default to full subtotal, can be adjusted by promo rules

  if (appliedPromo) {
    // If promo applies to specific products, calculate subtotal only for those items
    if (appliedPromo.regole?.applicabile_a_prodotti_specifici?.length > 0) {
      const specificProductIds = appliedPromo.regole.applicabile_a_prodotti_specifici;
      subtotalForDiscount = cart.reduce((sum, item) => {
        if (specificProductIds.includes(item.id)) {
          return sum + (item.prezzo_totale * item.quantita);
        }
        return sum;
      }, 0);
    } 
    // If promo does NOT apply to specific products, calculate subtotal excluding those items
    else if (appliedPromo.regole?.non_applicabile_a_prodotti_specifici?.length > 0) {
      const excludedProductIds = appliedPromo.regole.non_applicabile_a_prodotti_specifici;
      subtotalForDiscount = cart.reduce((sum, item) => {
        if (!excludedProductIds.includes(item.id)) {
          return sum + (item.prezzo_totale * item.quantita);
        }
        return sum;
      }, 0);
    }

    if (appliedPromo.tipo_sconto === "percentuale") {
      discount = (subtotalForDiscount * appliedPromo.valore_sconto) / 100;
    } else {
      discount = appliedPromo.valore_sconto;
    }
    discount = Math.min(discount, subtotalForDiscount); // Discount cannot exceed the subtotal it applies to
  }
  
    const total = Math.max(0, subtotal + deliveryCost - discount);

    return { subtotal, cartItemCount, deliveryCost, discount, total };
  };

  const { subtotal, cartItemCount, deliveryCost, discount, total } = calculateTotals();

  const handleAddressValidated = (address, zone, distance) => {
    setValidatedAddress(address);
    setDeliveryZone(zone);
    setDeliveryDistance(distance);
    setCustomerData(prev => ({ ...prev, indirizzo: address })); // Update customerData with the validated address
  };

  const applyPromoCode = () => {
    if (!promoCode.trim()) {
      alert("Per favore, inserisci un codice promozionale.");
      return;
    }

    // 1. Find the promotion by code and activation type first
    const promo = promotions.find(p => 
      p.attivazione === "codice" && 
      p.codice.toUpperCase() === promoCode.toUpperCase()
    );
    
    if (!promo) {
      alert("❌ Codice non valido.");
      return;
    }

    // 2. If promo is found, apply all rules validation
    const rules = promo.regole || {};

    // Existing rule validations:
    if (rules.ordine_minimo && subtotal < rules.ordine_minimo) {
      alert(`❌ Per applicare questo codice, l'ordine minimo è di €${rules.ordine_minimo.toFixed(2)}.`);
      return;
    }

    if (rules.min_articoli_carrello && cartItemCount < rules.min_articoli_carrello) {
      alert(`❌ Per applicare questo codice, devi avere almeno ${rules.min_articoli_carrello} articoli nel carrello.`);
      return;
    }

    if (rules.max_articoli_carrello && cartItemCount > rules.max_articoli_carrello) {
      alert(`❌ Questo codice non può essere applicato con più di ${rules.max_articoli_carrello} articoli nel carrello.`);
      return;
    }

    if (rules.applicabile_a_tipo_consegna && rules.applicabile_a_tipo_consegna.length > 0 && !rules.applicabile_a_tipo_consegna.includes(deliveryType)) {
      const deliveryTypesTranslated = rules.applicabile_a_tipo_consegna.map(t => t === 'consegna' ? 'consegna a domicilio' : 'asporto').join(' o ');
      alert(`❌ Questo codice è valido solo per ${deliveryTypesTranslated}.`);
      return;
    }

    if (rules.applicabile_a_prodotti_specifici?.length > 0) {
      const hasApplicableItem = cart.some(item => rules.applicabile_a_prodotti_specifici.includes(item.id));
      if (!hasApplicableItem) {
        alert("❌ Questo codice è valido solo per specifici prodotti che non sono nel carrello.");
        return;
      }
    }

    if (rules.non_applicabile_a_prodotti_specifici?.length > 0) {
      const hasNonExcludedItem = cart.some(item => !rules.non_applicabile_a_prodotti_specifici.includes(item.id));
      if (!hasNonExcludedItem) {
        alert("❌ Tutti i prodotti nel carrello sono esclusi da questa promozione.");
        return;
      }
    }

    // New rule validations for days and time slots:
    const now = new Date();
    const daysOfWeek = ['domenica', 'lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato'];
    const currentDay = daysOfWeek[now.getDay()];
    const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();

    // Controlla giorni settimana
    if (rules.giorni_settimana && rules.giorni_settimana.length > 0) {
      if (!rules.giorni_settimana.includes(currentDay)) {
        alert(`❌ Questa promozione è valida solo nei seguenti giorni: ${rules.giorni_settimana.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')}.`);
        return;
      }
    }

    // Controlla fascia oraria
    if (rules.orario_inizio || rules.orario_fine) {
      const [startHour, startMin] = (rules.orario_inizio || "00:00").split(':').map(Number);
      const [endHour, endMin] = (rules.orario_fine || "23:59").split(':').map(Number);
      const startTimeInMinutes = startHour * 60 + startMin;
      const endTimeInMinutes = endHour * 60 + endMin;

      // Handle overnight time ranges (e.g., 23:00 - 02:00)
      if (startTimeInMinutes > endTimeInMinutes) {
        if (!(currentTimeInMinutes >= startTimeInMinutes || currentTimeInMinutes <= endTimeInMinutes)) {
          alert(`❌ Questa promozione è valida dalle ${rules.orario_inizio || "00:00"} alle ${rules.orario_fine || "23:59"}.`);
          return;
        }
      } else { // Normal day range
        if (!(currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes <= endTimeInMinutes)) {
          alert(`❌ Questa promozione è valida dalle ${rules.orario_inizio || "00:00"} alle ${rules.orario_fine || "23:59"}.`);
          return;
        }
      }
    }
    // --- End new rules validation ---

    // If all rules pass
    setAppliedPromo(promo);
    alert("✅ Codice promozionale applicato!");
  };

  const handleCheckout = (e) => {
    e.preventDefault();
    
    if (!acceptTerms) {
      alert("Per favore, accetta i termini e condizioni e la privacy policy.");
      return;
    }

    // New validation for delivery minimum order based on zone
    if (deliveryType === "consegna" && deliveryZone && subtotal < deliveryZone.ordine_minimo) {
      alert(`Ordine minimo per questa zona: €${deliveryZone.ordine_minimo.toFixed(2)}`);
      return;
    }

    const orderNumber = `ORD-${Date.now()}`;
    const orderData = {
      restaurant_id: restaurant.id,
      numero_ordine: orderNumber,
      cliente_nome: customerData.nome,
      cliente_telefono: customerData.telefono,
      cliente_email: customerData.email,
      cliente_indirizzo: deliveryType === "consegna" ? customerData.indirizzo : "",
      tipo_consegna: deliveryType,
      stato: "nuovo",
      metodo_pagamento: paymentMethod, // Add payment method
      pagamento_stato: paymentMethod === "contanti" ? "pending" : "completed", // Set payment status
      items: cart.map(item => ({
        menu_item_id: item.id,
        nome: item.nome,
        quantita: item.quantita,
        prezzo_unitario: item.prezzo_totale,
        modificatori: item.modificatori || [],
        note: ""
      })),
      totale: total,
      costo_consegna: deliveryCost,
      note: customerData.note,
      delivery_info: deliveryType === "consegna" && deliveryZone ? { // Add delivery zone info
        zona: deliveryZone.nome,
        distanza_km: deliveryDistance
      } : null,
      promo_applicata: appliedPromo ? {
        id: appliedPromo.id,
        nome: appliedPromo.nome,
        codice: appliedPromo.codice,
        tipo_sconto: appliedPromo.tipo_sconto,
        valore_sconto: appliedPromo.valore_sconto,
        discount_amount: discount
      } : null
    };

    createOrderMutation.mutate(orderData);
  };

  // New success screen
  if (orderCompleted && completedOrder) {
    return (
      <Dialog open={open} onOpenChange={() => {
        resetAllStates();
        onClose();
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl text-green-600">
              ✅ Ordine Confermato!
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-6">
            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-10 h-10 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-2">
                #{completedOrder.numero_ordine}
              </p>
              <p className="text-gray-600">
                Il tuo numero d'ordine
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Ristorante:</span>
                <span className="font-semibold">{restaurant.nome}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tipo:</span>
                <span className="font-semibold">
                  {completedOrder.tipo_consegna === 'consegna' ? 'Consegna' : 'Asporto'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Totale:</span>
                <span className="font-bold text-red-600 text-xl">
                  €{completedOrder.totale.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Pagamento:</span>
                <Badge className="bg-green-500">
                  {completedOrder.metodo_pagamento === 'contanti' ? 'Contanti alla consegna' : 
                   completedOrder.metodo_pagamento === 'paypal' ? 'PayPal' : 'Carta di Credito'}
                </Badge>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
              <strong>📱 Conferma inviata!</strong>
              <p className="mt-1">
                {customerData.email && "Ti abbiamo inviato un'email con i dettagli dell'ordine. "}
                {customerData.telefono && "Controlla WhatsApp per la conferma!"}
              </p>
            </div>

            <p className="text-center text-gray-600 text-sm">
              Ti contatteremo a breve per confermare l'ordine!
            </p>
          </div>
          <DialogFooter>
            <Button
              className="w-full bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (onClearCart) onClearCart();
                resetAllStates();
                onClose();
              }}
            >
              Chiudi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (showCheckout) {
    // Determine if address validation is required for delivery
    const addressValidationRequired = deliveryType === "consegna" && restaurant?.zone_consegna?.length > 0;
    const isAddressValidated = validatedAddress !== null;
    const disableCheckoutButton = createOrderMutation.isPending || !acceptTerms || (addressValidationRequired && !isAddressValidated);

    const paymentSettings = restaurant.payment_settings || {}; // Default to empty object if not provided

    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Completa l'Ordine</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCheckout}>
            <div className="space-y-4 py-4">
              {/* Render AddressValidator if delivery and zones are configured and not yet validated */}
              {addressValidationRequired && !isAddressValidated && (
                <AddressValidator
                  restaurant={restaurant}
                  onAddressValidated={handleAddressValidated}
                />
              )}

              <div className="space-y-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={customerData.nome}
                  onChange={(e) => setCustomerData(prev => ({ ...prev, nome: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefono">Telefono *</Label>
                <Input
                  id="telefono"
                  type="tel"
                  value={customerData.telefono}
                  onChange={(e) => setCustomerData(prev => ({ ...prev, telefono: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={customerData.email}
                  onChange={(e) => setCustomerData(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              {deliveryType === "consegna" && (
                <div className="space-y-2">
                  <Label htmlFor="indirizzo">Indirizzo Consegna *</Label>
                  <Input
                    id="indirizzo"
                    value={customerData.indirizzo}
                    onChange={(e) => setCustomerData(prev => ({ ...prev, indirizzo: e.target.value }))}
                    placeholder="Via, numero civico"
                    required
                    disabled={addressValidationRequired && !isAddressValidated} // Disable if validation is required but not done
                  />
                  {addressValidationRequired && !isAddressValidated && (
                    <p className="text-xs text-amber-600">
                      ⬆️ Valida l'indirizzo sopra per continuare
                    </p>
                  )}
                  {deliveryZone && (
                    <div className="mt-2 text-sm text-gray-700">
                      <p>Zona di consegna: <span className="font-semibold">{deliveryZone.nome}</span></p>
                      {deliveryZone.ordine_minimo > 0 && subtotal < deliveryZone.ordine_minimo && (
                        <p className="text-red-500">Ordine minimo per questa zona: €{deliveryZone.ordine_minimo.toFixed(2)}</p>
                      )}
                      {deliveryDistance && (
                        <p>Distanza: {deliveryDistance.toFixed(2)} km</p>
                      )}
                    </div>
                  )}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="note" className="text-red-600 font-bold text-base">
                  🍽️ Aggiungi richieste speciali (senza cipolla, cottura, ecc.)
                </Label>
                <Textarea
                  id="note"
                  value={customerData.note}
                  onChange={(e) => setCustomerData(prev => ({ ...prev, note: e.target.value }))}
                  placeholder="Es: senza cipolla, cottura media, no lattosio, extra piccante..."
                  rows={4}
                  className="border-2 border-red-200 focus:border-red-500 bg-red-50"
                />
                <p className="text-xs text-gray-600">
                  Comunicaci qui tutte le tue preferenze e richieste speciali
                </p>
              </div>

              {/* Metodo di Pagamento */}
              <div className="space-y-2">
                <Label>Metodo di Pagamento *</Label>
                <Select
                  value={paymentMethod}
                  onValueChange={setPaymentMethod}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona metodo" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentSettings.cash_enabled && (
                      <SelectItem value="contanti">
                        💵 Contanti alla Consegna
                      </SelectItem>
                    )}
                    {paymentSettings.paypal_enabled && (
                      <SelectItem value="paypal">
                        💳 PayPal
                      </SelectItem>
                    )}
                    {paymentSettings.stripe_enabled && (
                      <SelectItem value="carta">
                        💳 Carta di Credito
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div 
                className={`flex items-start space-x-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                  acceptTerms 
                    ? 'border-red-500 bg-red-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setAcceptTerms(prev => !prev)}
              >
                <div className={`w-5 h-5 flex-shrink-0 flex items-center justify-center border-2 rounded transition-all mt-0.5 ${
                  acceptTerms 
                    ? 'border-red-500 bg-red-500' 
                    : 'border-gray-300'
                }`}>
                  {acceptTerms && <Check className="w-3 h-3 text-white" />}
                </div>
                <label className="text-sm cursor-pointer">
                  Accetto i termini e condizioni e la privacy policy
                </label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCheckout(false)}>
                Indietro
              </Button>
              <Button 
                type="submit" 
                className="bg-red-600 hover:bg-red-700" 
                disabled={disableCheckoutButton}
              >
                {createOrderMutation.isPending ? "Invio..." : `Conferma Ordine - €${total.toFixed(2)}`}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Il Tuo Carrello</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {cart.length === 0 ? (
            <p className="text-center text-gray-500">Il carrello è vuoto.</p>
          ) : (
            cart.map(item => (
              <div key={item.cart_id} className="p-4 border-2 rounded-lg border-gray-200 hover:border-gray-300 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h4 className="font-bold text-lg text-gray-900">{item.nome}</h4>
                    {item.modificatori && item.modificatori.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {item.modificatori.map((mod, i) => (
                          <div key={i} className="text-sm text-gray-600 flex items-center gap-1">
                            <span className="text-red-600">•</span>
                            <span>{mod}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => onRemove(item.cart_id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      onClick={() => onUpdateQuantity(item.cart_id, item.quantita - 1)}
                      disabled={item.quantita <= 1}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="w-8 text-center font-bold text-lg">{item.quantita}</span>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      onClick={() => onUpdateQuantity(item.cart_id, item.quantita + 1)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">€{item.prezzo_totale.toFixed(2)} cad.</div>
                    <div className="text-xl font-bold text-red-600">
                      €{(item.prezzo_totale * item.quantita).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}

          {cart.length > 0 && (
            <div className="border-t pt-4">
              <div className="space-y-2 mb-4">
                <Label htmlFor="promo-code">Codice Promozionale</Label>
                <div className="flex gap-2">
                  <Input
                    id="promo-code"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    placeholder="Inserisci codice"
                    className="flex-1"
                    disabled={appliedPromo !== null}
                  />
                  <Button 
                    onClick={applyPromoCode}
                    variant="outline"
                    disabled={appliedPromo !== null || !promoCode.trim()}
                  >
                    Applica
                  </Button>
                </div>
                {appliedPromo && (
                  <div className="flex items-center justify-between text-sm mt-2 p-2 bg-green-50 rounded">
                    <span className="text-green-600 font-medium">✓ {appliedPromo.nome}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setAppliedPromo(null);
                        setPromoCode("");
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      Rimuovi
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <>
            <div className="border-t pt-4 space-y-3">
              <div className="flex justify-between text-base">
                <span className="text-gray-600">Subtotale</span>
                <span className="font-semibold">€{subtotal.toFixed(2)}</span>
              </div>
              {deliveryCost > 0 && (
                <div className="flex justify-between text-base">
                  <span className="text-gray-600">Costo Consegna</span>
                  <span className="font-semibold">€{deliveryCost.toFixed(2)}</span>
                </div>
              )}
              {discount > 0 && (
                <div className="flex justify-between text-base text-green-600">
                  <span className="font-medium">Sconto</span>
                  <span className="font-bold">-€{discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-2xl font-bold pt-3 border-t bg-red-50 -mx-4 px-4 py-3 rounded-lg">
                <span>Totale</span>
                <span className="text-red-600">€{total.toFixed(2)}</span>
              </div>
            </div>

            <DialogFooter>
              <Button
                onClick={() => setShowCheckout(true)}
                className="w-full bg-red-600 hover:bg-red-700 text-white text-lg py-6"
              >
                Procedi all'Ordine
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}