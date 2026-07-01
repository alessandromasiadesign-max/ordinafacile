import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Check, CreditCard, DollarSign } from "lucide-react";

export default function PaymentSettings({ paymentSettings = {}, onChange }) {
  const togglePaymentMethod = (method) => {
    onChange({
      ...paymentSettings,
      [`${method}_enabled`]: !paymentSettings[`${method}_enabled`]
    });
  };

  return (
    <Card>
      <CardHeader className="p-4 md:p-6">
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Metodi di Pagamento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 p-4 md:p-6">
        {/* PayPal */}
        <div className="space-y-3">
          <button
            type="button"
            className={`flex w-full items-center gap-3 rounded-lg border-2 p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
              paymentSettings.paypal_enabled
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                : 'border-border hover:bg-accent/60'
            }`}
            onClick={() => togglePaymentMethod('paypal')}
          >
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
              paymentSettings.paypal_enabled 
                ? 'border-blue-500 bg-blue-500' 
                : 'border-border'
            }`}>
              {paymentSettings.paypal_enabled && <Check className="w-4 h-4 text-white" />}
            </div>
            <div className="flex-1">
              <div className="font-semibold">PayPal</div>
              <div className="text-sm text-muted-foreground">Accetta pagamenti tramite PayPal</div>
            </div>
          </button>
          
          {paymentSettings.paypal_enabled && (
            <div className="ml-4 pl-4 border-l-2 border-blue-200 dark:border-blue-900 space-y-2">
              <Label>Email PayPal</Label>
              <Input
                type="email"
                value={paymentSettings.paypal_email || ""}
                onChange={(e) => onChange({...paymentSettings, paypal_email: e.target.value})}
                placeholder="tuo@email.com"
              />
              <p className="text-xs text-muted-foreground">
                I pagamenti saranno inviati a questa email PayPal
              </p>
            </div>
          )}
        </div>

        {/* Stripe */}
        <div className="space-y-3">
          <button
            type="button"
            className={`flex w-full items-center gap-3 rounded-lg border-2 p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
              paymentSettings.stripe_enabled
                ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/30'
                : 'border-border hover:bg-accent/60'
            }`}
            onClick={() => togglePaymentMethod('stripe')}
          >
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
              paymentSettings.stripe_enabled 
                ? 'border-purple-500 bg-purple-500' 
                : 'border-border'
            }`}>
              {paymentSettings.stripe_enabled && <Check className="w-4 h-4 text-white" />}
            </div>
            <div className="flex-1">
              <div className="font-semibold">Carta di Credito (Stripe)</div>
              <div className="text-sm text-muted-foreground">Accetta carte di credito/debito</div>
            </div>
          </button>
          
          {paymentSettings.stripe_enabled && (
            <div className="ml-4 pl-4 border-l-2 border-purple-200 dark:border-purple-900 space-y-3">
              <div className="space-y-2">
                <Label>Stripe Public Key</Label>
                <Input
                  value={paymentSettings.stripe_public_key || ""}
                  onChange={(e) => onChange({...paymentSettings, stripe_public_key: e.target.value})}
                  placeholder="pk_live_..."
                />
              </div>
              <div className="bg-blue-50 border border-blue-200 dark:bg-blue-950/30 dark:border-blue-900 rounded-lg p-3 text-xs text-blue-800 dark:text-blue-100">
                <strong>📘 Come configurare Stripe:</strong>
                <ol className="mt-2 ml-4 space-y-1">
                  <li>1. Crea un account su stripe.com</li>
                  <li>2. Vai su Developers → API keys</li>
                  <li>3. Copia la "Publishable key"</li>
                  <li>4. Incollala qui sopra</li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Bancomat / POS */}
        <button
          type="button"
          className={`flex w-full items-center gap-3 rounded-lg border-2 p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
            paymentSettings.bancomat_enabled
              ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30'
              : 'border-border hover:bg-accent/60'
          }`}
          onClick={() => togglePaymentMethod('bancomat')}
        >
          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
            paymentSettings.bancomat_enabled 
              ? 'border-orange-500 bg-orange-500' 
              : 'border-border'
          }`}>
            {paymentSettings.bancomat_enabled && <Check className="w-4 h-4 text-white" />}
          </div>
          <div className="flex-1">
            <div className="font-semibold flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Bancomat / POS
            </div>
            <div className="text-sm text-muted-foreground">Pagamento con bancomat o carta al momento della consegna</div>
          </div>
        </button>

        {/* Contanti */}
        <button
          type="button"
          className={`flex w-full items-center gap-3 rounded-lg border-2 p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
            paymentSettings.cash_enabled
              ? 'border-green-500 bg-green-50 dark:bg-green-950/30'
              : 'border-border hover:bg-accent/60'
          }`}
          onClick={() => togglePaymentMethod('cash')}
        >
          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
            paymentSettings.cash_enabled 
              ? 'border-green-500 bg-green-500' 
              : 'border-border'
          }`}>
            {paymentSettings.cash_enabled && <Check className="w-4 h-4 text-white" />}
          </div>
          <div className="flex-1">
            <div className="font-semibold flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Contanti alla Consegna
            </div>
            <div className="text-sm text-muted-foreground">Pagamento in contanti al momento della consegna</div>
          </div>
        </button>

        <div className="bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-900 rounded-lg p-4 text-sm text-amber-800 dark:text-amber-100">
          <strong>⚠️ Importante:</strong> I pagamenti online richiedono la configurazione di un account su PayPal o Stripe. I fondi saranno trasferiti direttamente sul tuo conto.
        </div>
      </CardContent>
    </Card>
  );
}