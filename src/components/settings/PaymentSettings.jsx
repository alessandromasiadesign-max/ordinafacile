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
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Metodi di Pagamento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* PayPal */}
        <div className="space-y-3">
          <div 
            className={`flex items-center space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
              paymentSettings.paypal_enabled 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => togglePaymentMethod('paypal')}
          >
            <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
              paymentSettings.paypal_enabled 
                ? 'border-blue-500 bg-blue-500' 
                : 'border-gray-300'
            }`}>
              {paymentSettings.paypal_enabled && <Check className="w-4 h-4 text-white" />}
            </div>
            <div className="flex-1">
              <div className="font-semibold">PayPal</div>
              <div className="text-sm text-gray-500">Accetta pagamenti tramite PayPal</div>
            </div>
          </div>
          
          {paymentSettings.paypal_enabled && (
            <div className="ml-4 pl-4 border-l-2 border-blue-200 space-y-2">
              <Label>Email PayPal</Label>
              <Input
                type="email"
                value={paymentSettings.paypal_email || ""}
                onChange={(e) => onChange({...paymentSettings, paypal_email: e.target.value})}
                placeholder="tuo@email.com"
              />
              <p className="text-xs text-gray-500">
                I pagamenti saranno inviati a questa email PayPal
              </p>
            </div>
          )}
        </div>

        {/* Stripe */}
        <div className="space-y-3">
          <div 
            className={`flex items-center space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
              paymentSettings.stripe_enabled 
                ? 'border-purple-500 bg-purple-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => togglePaymentMethod('stripe')}
          >
            <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
              paymentSettings.stripe_enabled 
                ? 'border-purple-500 bg-purple-500' 
                : 'border-gray-300'
            }`}>
              {paymentSettings.stripe_enabled && <Check className="w-4 h-4 text-white" />}
            </div>
            <div className="flex-1">
              <div className="font-semibold">Carta di Credito (Stripe)</div>
              <div className="text-sm text-gray-500">Accetta carte di credito/debito</div>
            </div>
          </div>
          
          {paymentSettings.stripe_enabled && (
            <div className="ml-4 pl-4 border-l-2 border-purple-200 space-y-3">
              <div className="space-y-2">
                <Label>Stripe Public Key</Label>
                <Input
                  value={paymentSettings.stripe_public_key || ""}
                  onChange={(e) => onChange({...paymentSettings, stripe_public_key: e.target.value})}
                  placeholder="pk_live_..."
                />
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
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

        {/* Contanti */}
        <div 
          className={`flex items-center space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
            paymentSettings.cash_enabled 
              ? 'border-green-500 bg-green-50' 
              : 'border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => togglePaymentMethod('cash')}
        >
          <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
            paymentSettings.cash_enabled 
              ? 'border-green-500 bg-green-500' 
              : 'border-gray-300'
          }`}>
            {paymentSettings.cash_enabled && <Check className="w-4 h-4 text-white" />}
          </div>
          <div className="flex-1">
            <div className="font-semibold flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Contanti alla Consegna
            </div>
            <div className="text-sm text-gray-500">Pagamento in contanti al momento della consegna</div>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
          <strong>⚠️ Importante:</strong> I pagamenti online richiedono la configurazione di un account su PayPal o Stripe. I fondi saranno trasferiti direttamente sul tuo conto.
        </div>
      </CardContent>
    </Card>
  );
}