import React, { useEffect, useRef, useState } from 'react';
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
import { Order, OrderItem, Promotion } from "@/api/entities";
import { Core } from "@/api/integrations";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import AddressValidator from "./AddressValidator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge"; // Assuming this exists in shadcn/ui

export default function CartDrawer({ open, onClose, cart, restaurant, deliveryType, onUpdateQuantity, onRemove, onClearCart, startInCheckout = false, table = null, allYouCanEat = false }) {
  const safeCart = Array.isArray(cart) ? cart : [];
  const [showCheckout, setShowCheckout] = useState(false);
  const startInCheckoutAppliedRef = useRef(false);
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

  useEffect(() => {
    if (allYouCanEat) {
      setPaymentMethod("contanti");
    }
  }, [allYouCanEat]);
  const [completedOrder, setCompletedOrder] = useState(null);     // New state to store completed order details
  const [whatsappDraft, setWhatsappDraft] = useState(null);

  const queryClient = useQueryClient(); // Initialized useQueryClient

  useEffect(() => {
    if (!open) {
      startInCheckoutAppliedRef.current = false;
      return;
    }

    if (startInCheckout && !startInCheckoutAppliedRef.current) {
      setShowCheckout(true);
      startInCheckoutAppliedRef.current = true;
    }
  }, [open, startInCheckout]);

  const formatModifier = (mod) => {
    if (mod == null) return "";
    if (typeof mod === "string") return mod;
    if (typeof mod === "number" || typeof mod === "boolean") return String(mod);
    if (typeof mod === "object") {
      const label = typeof mod.label === "string" ? mod.label : "";
      const extra = typeof mod.priceExtra === "number" ? mod.priceExtra : null;
      if (label && extra != null && extra !== 0) {
        return `${label} (+€${extra.toFixed(2)})`;
      }
      if (label) return label;
      try {
        return JSON.stringify(mod);
      } catch {
        return "";
      }
    }
    return "";
  };

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
    setWhatsappDraft(null);
  }

  const createOrderMutation = useMutation({
    mutationFn: async (orderData) => {
      const itemsForOrder = Array.isArray(orderData?.items) ? orderData.items : [];
      // orders table most likely doesn't accept nested items; create order first, then order_items
      // eslint-disable-next-line no-unused-vars
      const { items: _ignoredItems, ...orderPayload } = orderData;

      const order = await Order.create(orderPayload);

      if (order?.id && itemsForOrder.length > 0) {
        try {
          await Promise.all(
            itemsForOrder.map((item) =>
              OrderItem.create({
                order_id: order.id,
                menu_item_id: item.menu_item_id,
                name: item.nome,
                quantity: item.quantita,
                price: item.prezzo_unitario,
                modifiers: Array.isArray(item.modificatori) ? item.modificatori : [],
                notes: item.note || "",
              })
            )
          );
        } catch (e) {
          if (e?.code === "42501") {
            console.warn("RLS blocked insert into order_items. Continuing without persisted items.", e);
          } else {
            throw e;
          }
        }
      }

      const orderWithItems = { ...order, items: itemsForOrder };
      
      // Invia conferma via email/SMS/WhatsApp
      if (customerData.email) {
        await Core.SendEmail({
          to: customerData.email,
          subject: `Conferma Ordine #${orderWithItems.numero_ordine} - ${restaurant.nome}`,
          body: `
            <h2>Grazie per il tuo ordine!</h2>
            <p><strong>Numero Ordine:</strong> #${orderWithItems.numero_ordine}</p>
            <p><strong>Ristorante:</strong> ${restaurant.nome}</p>
            <p><strong>Totale:</strong> €${orderWithItems.totale.toFixed(2)}</p>
            <p><strong>Tipo:</strong> ${orderWithItems.tipo_consegna === 'tavolo' ? `Ordine al tavolo${orderWithItems.table_name ? ` ${orderWithItems.table_name}` : ''}` : orderWithItems.tipo_consegna === 'consegna' ? 'Consegna' : 'Asporto'}</p>
            ${orderWithItems.tipo_consegna === 'consegna' ? `<p><strong>Indirizzo:</strong> ${orderWithItems.cliente_indirizzo}</p>` : ''}
            ${orderWithItems.tipo_consegna === 'tavolo' && orderWithItems.table_name ? `<p><strong>Tavolo:</strong> ${orderWithItems.table_name}</p>` : ''}
            <p><strong>Metodo Pagamento:</strong> ${orderWithItems.all_you_can_eat ? 'Paga alla cassa' : orderWithItems.metodo_pagamento === 'contanti' ? (orderWithItems.tipo_consegna === 'tavolo' ? 'Contanti al tavolo' : 'Contanti alla consegna') : orderWithItems.metodo_pagamento === 'paypal' ? 'PayPal' : orderWithItems.metodo_pagamento === 'bancomat' ? 'Bancomat / POS' : 'Carta di Credito'}</p>
            <br>
            <h3>Prodotti:</h3>
            <ul>
              ${orderWithItems.items.map(item => `
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
        const trackOrderUrl = `${window.location.origin}${createPageUrl("TrackOrder")}?order=${encodeURIComponent(orderWithItems.numero_ordine ?? "")}&oid=${encodeURIComponent(orderWithItems.id ?? "")}`;
        const whatsappMessage = [
          `✅ *Ordine confermato!*`,
          ``,
          `*${restaurant.nome}*`,
          `Ordine: #${orderWithItems.numero_ordine}`,
          `Totale: €${orderWithItems.totale.toFixed(2)}`,
          `Tipo: ${orderWithItems.tipo_consegna === 'tavolo' ? `Ordine al tavolo${orderWithItems.table_name ? ` ${orderWithItems.table_name}` : ''}` : orderWithItems.tipo_consegna === 'consegna' ? 'Consegna' : 'Asporto'}`,
          orderWithItems.tipo_consegna === 'consegna' ? `Indirizzo: ${orderWithItems.cliente_indirizzo}` : null,
          orderWithItems.tipo_consegna === 'tavolo' && orderWithItems.table_name ? `Tavolo: ${orderWithItems.table_name}` : null,
          `Pagamento: ${orderWithItems.all_you_can_eat ? 'Paga alla cassa' : orderWithItems.metodo_pagamento === 'contanti' ? (orderWithItems.tipo_consegna === 'tavolo' ? 'Contanti al tavolo' : 'Contanti alla consegna') : orderWithItems.metodo_pagamento === 'paypal' ? 'PayPal' : orderWithItems.metodo_pagamento === 'bancomat' ? 'Bancomat / POS' : 'Carta di Credito'} `,
          ``,
          `Segui lo stato dell'ordine: ${trackOrderUrl}`,
          ``,
          `Ti contatteremo a breve.`,
        ].filter(Boolean).join("\n");

        setWhatsappDraft({
          phoneE164Like: customerData.telefono.replace(/[^0-9]/g, ''),
          message: whatsappMessage,
        });
      }

      return orderWithItems;
    },
    onSuccess: (order) => {
      setCompletedOrder(order);
      setOrderCompleted(true);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (error, variables) => {
      console.error("Error creating order:", error);
      console.error("Order payload (variables):", variables);

      if (error?.code === '42501') {
        alert(
          "❌ Questo ristorante non può ricevere ordini perché l’abbonamento non risulta attivo o è scaduto."
        );
        return;
      }

      const message = typeof error?.message === "string" ? error.message : "";
      const details = typeof error?.details === "string" ? error.details : "";
      const hint = typeof error?.hint === "string" ? error.hint : "";
      const code = typeof error?.code === "string" ? error.code : "";

      const diagnostic = [
        (variables?.metodo_pagamento || variables?.payment_method) && `payment_method: ${variables?.metodo_pagamento || variables?.payment_method}`,
        (variables?.pagamento_stato || variables?.payment_status) && `payment_status: ${variables?.pagamento_stato || variables?.payment_status}`,
        message && `message: ${message}`,
        details && `details: ${details}`,
        hint && `hint: ${hint}`,
        code && `code: ${code}`,
      ].filter(Boolean).join("\n");

      alert(
        `❌ Errore durante l'invio dell'ordine. Riprova più tardi.` +
        (diagnostic ? `\n\n${diagnostic}` : "")
      );
    }
  });

  const { data: promotions = [] } = useQuery({
    queryKey: ['promotions', restaurant?.id],
    queryFn: async () => {
      if (!restaurant) return [];
      try {
        const response = await Promotion.filter({
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
    const subtotal = safeCart.reduce((sum, item) => sum + (item.prezzo_totale * item.quantita), 0);
    const cartItemCount = safeCart.reduce((sum, item) => sum + item.quantita, 0);

    let deliveryCost = 0;
    if (deliveryType === "consegna") {
      if (deliveryZone) { // If a specific delivery zone is active
        deliveryCost = deliveryZone.costo;
      } else if (restaurant?.costo_consegna) { // Fallback to general restaurant delivery cost
        deliveryCost = restaurant.costo_consegna;
      }
    }
  
    let discount = 0;
    let subtotalForDiscount = subtotal; // Default to full subtotal, can be adjusted by promo rules

    if (appliedPromo) {
      // If promo applies to specific products, calculate subtotal only for those items
      if (appliedPromo.regole?.applicabile_a_prodotti_specifici?.length > 0) {
        const specificProductIds = appliedPromo.regole.applicabile_a_prodotti_specifici;
        subtotalForDiscount = safeCart.reduce((sum, item) => {
          if (specificProductIds.includes(item.id)) {
            return sum + (item.prezzo_totale * item.quantita);
          }
          return sum;
        }, 0);
      } 
      // If promo does NOT apply to specific products, calculate subtotal excluding those items
      else if (appliedPromo.regole?.non_applicabile_a_prodotti_specifici?.length > 0) {
        const excludedProductIds = appliedPromo.regole.non_applicabile_a_prodotti_specifici;
        subtotalForDiscount = safeCart.reduce((sum, item) => {
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
      const hasApplicableItem = safeCart.some(item => rules.applicabile_a_prodotti_specifici.includes(item.id));
      if (!hasApplicableItem) {
        alert("❌ Questo codice è valido solo per specifici prodotti che non sono nel carrello.");
        return;
      }
    }

    if (rules.non_applicabile_a_prodotti_specifici?.length > 0) {
      const hasNonExcludedItem = safeCart.some(item => !rules.non_applicabile_a_prodotti_specifici.includes(item.id));
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

    setAppliedPromo(promo);
    alert("✅ Codice promozionale applicato!");
  };

  const handleCheckout = (e) => {
    e.preventDefault();

    if (!restaurant?.id) {
      alert("Ristorante non disponibile. Riprova tra qualche secondo.");
      return;
    }

    if (safeCart.length === 0) {
      alert("Il carrello è vuoto.");
      return;
    }
    
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
    const computedPaymentMethod = allYouCanEat ? "contanti" : paymentMethod;
    const computedPaymentStatus = allYouCanEat ? "pending" : (computedPaymentMethod === "contanti" ? "pending" : "paid");
    const orderData = {
      restaurant_id: restaurant.id,
      numero_ordine: orderNumber,
      cliente_nome: customerData.nome,
      cliente_telefono: customerData.telefono,
      cliente_email: customerData.email,
      cliente_indirizzo: deliveryType === "consegna" ? customerData.indirizzo : "",
      tipo_consegna: deliveryType,
      table_id: table?.id || null,
      table_name: table?.name || null,
      stato: "nuovo",
      metodo_pagamento: computedPaymentMethod, // Add payment method
      pagamento_stato: computedPaymentStatus, // Set payment status (legacy/IT)
      payment_status: computedPaymentStatus, // Set payment status (EN)
      all_you_can_eat: allYouCanEat,
      items: safeCart.map(item => ({
        menu_item_id: item.id,
        nome: item.nome,
        quantita: item.quantita,
        prezzo_unitario: item.prezzo_totale,
        modificatori: (item.modificatori || []).map(formatModifier).filter(Boolean),
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
              <div className="w-20 h-20 bg-green-100 dark:bg-green-950/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-10 h-10 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-foreground mb-2">
                #{completedOrder.numero_ordine}
              </p>
              <p className="text-muted-foreground">
                Il tuo numero d'ordine
              </p>
            </div>

            <div className="bg-muted/40 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ristorante:</span>
                <span className="font-semibold">{restaurant.nome}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tipo:</span>
                <span className="font-semibold">
                  {completedOrder.tipo_consegna === 'consegna' ? 'Consegna' : 'Asporto'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Totale:</span>
                <span className="font-bold text-red-600 text-xl">
                  €{completedOrder.totale.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Pagamento:</span>
                <Badge className={completedOrder.all_you_can_eat ? "bg-amber-500" : "bg-green-500"}>
                  {completedOrder.all_you_can_eat ? 'Paga alla cassa' :
                   completedOrder.metodo_pagamento === 'contanti' ? 'Contanti alla consegna' : 
                   completedOrder.metodo_pagamento === 'paypal' ? 'PayPal' :
                   completedOrder.metodo_pagamento === 'bancomat' ? 'Bancomat / POS' : 'Carta di Credito'}
                </Badge>
              </div>
            </div>

            <Button
              type="button"
              className="w-full bg-red-600 hover:bg-red-700"
              onClick={() => {
                const orderNum = completedOrder?.numero_ordine;
                if (!orderNum) return;
                const url = `${window.location.origin}${createPageUrl("TrackOrder")}?order=${encodeURIComponent(orderNum)}&oid=${encodeURIComponent(completedOrder?.id ?? "")}`;
                window.open(url, '_blank');
              }}
            >
              Segui stato ordine in tempo reale
            </Button>

            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-lg p-4 text-sm text-blue-800 dark:text-blue-200">
              <strong>📱 Conferma inviata!</strong>
              <p className="mt-1">
                {customerData.email && "Ti abbiamo inviato un'email con i dettagli dell'ordine. "}
                {customerData.telefono && "Puoi inviare a te stesso il messaggio WhatsApp di conferma."}
              </p>
            </div>

            {whatsappDraft?.message && (
              <div className="bg-muted/40 border border-border rounded-lg p-4 text-sm">
                <div className="font-semibold mb-2">Messaggio WhatsApp (facoltativo)</div>
                <pre className="whitespace-pre-wrap text-xs text-muted-foreground">{whatsappDraft.message}</pre>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(whatsappDraft.message);
                        alert("Messaggio copiato!");
                      } catch {
                        alert("Impossibile copiare automaticamente. Seleziona e copia manualmente.");
                      }
                    }}
                  >
                    Copia
                  </Button>
                  <Button
                    type="button"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      const phone = whatsappDraft.phoneE164Like;
                      const url = `https://wa.me/${phone}?text=${encodeURIComponent(whatsappDraft.message)}`;
                      window.open(url, '_blank');
                    }}
                  >
                    Apri WhatsApp
                  </Button>
                </div>
              </div>
            )}

            <p className="text-center text-muted-foreground text-sm">
              Ti contatteremo a breve per confermare l'ordine!
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                const orderNum = completedOrder?.numero_ordine;
                if (!orderNum) return;
                const url = `${window.location.origin}${createPageUrl("TrackOrder")}?order=${encodeURIComponent(orderNum)}&oid=${encodeURIComponent(completedOrder?.id ?? "")}`;
                window.open(url, '_blank');
              }}
            >
              Segui stato ordine
            </Button>
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
    const isTableOrder = deliveryType === "tavolo" || table?.id;
    const addressValidationRequired = !isTableOrder && deliveryType === "consegna" && restaurant?.zone_consegna?.length > 0;
    const isAddressValidated = validatedAddress !== null;
    const disableCheckoutButton = createOrderMutation.isPending || !acceptTerms || (addressValidationRequired && !isAddressValidated);

    const paymentSettings = restaurant.payment_settings || {}; // Default to empty object if not provided

    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isTableOrder ? "Ordine dal Tavolo" : "Completa l'Ordine"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCheckout}>
            <div className="space-y-4 py-4">
              {isTableOrder && table && (
                <div className="rounded-lg bg-orange-100 dark:bg-orange-900/30 p-3 text-center">
                  <p className="text-sm font-semibold text-orange-800 dark:text-orange-100">
                    🍽️ Tavolo {table.name}
                  </p>
                  {table.description && (
                    <p className="text-xs text-orange-700/80 dark:text-orange-200/70 mt-1">
                      {table.description}
                    </p>
                  )}
                </div>
              )}

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
                  placeholder={isTableOrder ? "Come ti chiami?" : "Il tuo nome"}
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
                  placeholder={isTableOrder ? "Per chiamarti al tavolo" : "Il tuo telefono"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={customerData.email}
                  onChange={(e) => setCustomerData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder={isTableOrder ? "Opzionale, per la copia dell'ordine" : "Opzionale"}
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
                    <div className="mt-2 text-sm text-muted-foreground">
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
                  className="border-2 border-red-200 focus:border-red-500 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20"
                />
                <p className="text-xs text-muted-foreground">
                  Comunicaci qui tutte le tue preferenze e richieste speciali
                </p>
              </div>

              {/* Metodo di Pagamento */}
              {allYouCanEat ? (
                <div className="rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-4 text-sm text-amber-900 dark:text-amber-100">
                  🍣 <strong>All you can eat</strong>
                  <p className="mt-1">Non è richiesto il pagamento online. Pagherai alla cassa a fine servizio.</p>
                </div>
              ) : (
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
                          💵 {isTableOrder ? "Contanti al tavolo" : "Contanti alla Consegna"}
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
                      {paymentSettings.bancomat_enabled && (
                        <SelectItem value="bancomat">
                          💳 Bancomat / POS
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <button
                type="button"
                className={`flex w-full items-start space-x-3 p-3 border-2 rounded-lg text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                  acceptTerms 
                    ? 'border-red-500 bg-red-50 dark:bg-red-950/20' 
                    : 'border-border hover:bg-accent/60'
                }`}
                onClick={() => setAcceptTerms(prev => !prev)}
                aria-pressed={!!acceptTerms}
              >
                <div className={`w-5 h-5 flex-shrink-0 flex items-center justify-center border-2 rounded transition-all mt-0.5 ${
                  acceptTerms 
                    ? 'border-red-500 bg-red-500' 
                    : 'border-border'
                }`}>
                  {acceptTerms && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className="text-sm">
                  Accetto i
                  <Link
                    to={createPageUrl("Terms")}
                    className="ml-1 text-red-600 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    termini e condizioni
                  </Link>
                  <span> e la </span>
                  <Link
                    to={createPageUrl("PrivacyClienti")}
                    className="text-red-600 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    privacy policy
                  </Link>
                </span>
              </button>
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
                {createOrderMutation.isPending ? "Invio..." : allYouCanEat ? `Invia Ordine al Tavolo - €${total.toFixed(2)}` : `Conferma Ordine - €${total.toFixed(2)}`}
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
          {!restaurant ? (
            <p className="text-center text-muted-foreground">Caricamento...</p>
          ) : safeCart.length === 0 ? (
            <p className="text-center text-muted-foreground">Il carrello è vuoto.</p>
          ) : (
            safeCart.map(item => (
              <div key={item.cart_id} className="p-4 border-2 rounded-lg border-border hover:bg-accent/40 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h4 className="font-bold text-lg">{item.nome}</h4>
                    {item.modificatori && item.modificatori.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {item.modificatori.map((mod, i) => (
                          <div key={i} className="text-sm text-muted-foreground flex items-center gap-1">
                            <span className="text-red-600">•</span>
                            <span>{formatModifier(mod)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                    onClick={() => onRemove(item.cart_id)}
                    aria-label="Rimuovi dal carrello"
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
                      aria-label="Diminuisci quantità"
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="w-8 text-center font-bold text-lg">{item.quantita}</span>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      onClick={() => onUpdateQuantity(item.cart_id, item.quantita + 1)}
                      aria-label="Aumenta quantità"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">€{item.prezzo_totale.toFixed(2)} cad.</div>
                    <div className="text-xl font-bold text-red-600">
                      €{(item.prezzo_totale * item.quantita).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}

          {!!restaurant && safeCart.length > 0 && (
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

        {!!restaurant && safeCart.length > 0 && (
          <>
            <div className="border-t pt-4 space-y-3">
              {table?.id && (
                <div className="rounded-lg bg-orange-100 dark:bg-orange-900/30 p-3 text-center">
                  <p className="text-sm font-semibold text-orange-800 dark:text-orange-100">
                    🍽️ Ordine per il tavolo {table.name}
                  </p>
                </div>
              )}
              <div className="flex justify-between text-base">
                <span className="text-muted-foreground">Subtotale</span>
                <span className="font-semibold">€{subtotal.toFixed(2)}</span>
              </div>
              {deliveryCost > 0 && (
                <div className="flex justify-between text-base">
                  <span className="text-muted-foreground">Costo Consegna</span>
                  <span className="font-semibold">€{deliveryCost.toFixed(2)}</span>
                </div>
              )}
              {discount > 0 && (
                <div className="flex justify-between text-base text-green-600">
                  <span className="font-medium">Sconto</span>
                  <span className="font-bold">-€{discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-2xl font-bold pt-3 border-t bg-red-50 dark:bg-red-950/20 -mx-4 px-4 py-3 rounded-lg">
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