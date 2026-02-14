import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Cookie } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Cookies() {
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Link 
          to={createPageUrl("Dashboard")}
          className="flex items-center gap-2 text-red-600 hover:text-red-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Torna alla Dashboard
        </Link>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <Cookie className="w-8 h-8 text-red-600" />
              <CardTitle className="text-3xl">Cookie Policy</CardTitle>
            </div>
            <p className="text-sm text-gray-500">
              Ultimo aggiornamento: {new Date().toLocaleDateString('it-IT')}
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <section>
              <h2 className="text-2xl font-bold mb-3">1. Cosa sono i Cookies</h2>
              <p className="text-gray-700">
                I cookies sono piccoli file di testo che vengono memorizzati sul tuo dispositivo
                (computer, tablet, smartphone) quando visiti un sito web. Permettono al sito di
                riconoscere il tuo dispositivo e memorizzare alcune informazioni sulle tue preferenze
                o azioni passate.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3">2. Tipologie di Cookies Utilizzati</h2>
              
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h3 className="font-bold text-blue-900 mb-2">🔧 Cookies Tecnici (Necessari)</h3>
                  <p className="text-blue-800 text-sm mb-2">
                    Essenziali per il funzionamento del sito. Non richiedono consenso.
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-blue-800 text-sm ml-4">
                    <li>Gestione sessione utente (login/logout)</li>
                    <li>Memorizzazione preferenze lingua</li>
                    <li>Sicurezza e prevenzione frodi</li>
                    <li>Bilanciamento del carico server</li>
                  </ul>
                  <p className="text-xs text-blue-700 mt-2">
                    Durata: sessione o max 12 mesi
                  </p>
                </div>

                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h3 className="font-bold text-green-900 mb-2">📊 Cookies Analitici</h3>
                  <p className="text-green-800 text-sm mb-2">
                    Raccolgono informazioni aggregate sull'utilizzo del sito.
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-green-800 text-sm ml-4">
                    <li>Pagine più visitate</li>
                    <li>Tempo di permanenza</li>
                    <li>Percorsi di navigazione</li>
                    <li>Dispositivi e browser utilizzati</li>
                  </ul>
                  <p className="text-xs text-green-700 mt-2">
                    Durata: max 24 mesi | Provider: Google Analytics
                  </p>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <h3 className="font-bold text-purple-900 mb-2">🎯 Cookies di Profilazione</h3>
                  <p className="text-purple-800 text-sm mb-2">
                    Creano profili utente per mostrare contenuti personalizzati.
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-purple-800 text-sm ml-4">
                    <li>Suggerimenti personalizzati</li>
                    <li>Contenuti mirati</li>
                    <li>Pubblicità profilata</li>
                  </ul>
                  <p className="text-xs text-purple-700 mt-2">
                    ⚠️ Attualmente NON utilizziamo cookies di profilazione
                  </p>
                </div>

                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                  <h3 className="font-bold text-amber-900 mb-2">🔗 Cookies di Terze Parti</h3>
                  <p className="text-amber-800 text-sm mb-2">
                    Installati da servizi esterni integrati nel sito.
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-amber-800 text-sm ml-4">
                    <li>Google Maps (visualizzazione mappe)</li>
                    <li>PayPal/Stripe (pagamenti)</li>
                    <li>Social media plugins (condivisione)</li>
                  </ul>
                  <p className="text-xs text-amber-700 mt-2">
                    Consulta le privacy policy dei rispettivi servizi
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3">3. Cookies Specifici Utilizzati</h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border border-gray-300 px-4 py-2 text-left">Nome</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Tipo</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Durata</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Scopo</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">session_id</td>
                      <td className="border border-gray-300 px-4 py-2">Tecnico</td>
                      <td className="border border-gray-300 px-4 py-2">Sessione</td>
                      <td className="border border-gray-300 px-4 py-2">Gestione login</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">_ga</td>
                      <td className="border border-gray-300 px-4 py-2">Analitico</td>
                      <td className="border border-gray-300 px-4 py-2">2 anni</td>
                      <td className="border border-gray-300 px-4 py-2">Google Analytics</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">_gid</td>
                      <td className="border border-gray-300 px-4 py-2">Analitico</td>
                      <td className="border border-gray-300 px-4 py-2">24 ore</td>
                      <td className="border border-gray-300 px-4 py-2">Google Analytics</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">cookie_consent</td>
                      <td className="border border-gray-300 px-4 py-2">Tecnico</td>
                      <td className="border border-gray-300 px-4 py-2">12 mesi</td>
                      <td className="border border-gray-300 px-4 py-2">Memorizza preferenze cookies</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3">4. Consenso e Gestione Cookies</h2>
              <p className="text-gray-700 mb-3">
                Al primo accesso al sito, ti viene mostrato un banner informativo. Puoi:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                <li><strong>Accettare tutti:</strong> consenti l'uso di tutti i cookies</li>
                <li><strong>Rifiutare non necessari:</strong> solo cookies tecnici essenziali</li>
                <li><strong>Personalizzare:</strong> scegli quali categorie accettare</li>
              </ul>
              <p className="text-gray-700 mt-3">
                Puoi modificare le tue preferenze in qualsiasi momento tramite le impostazioni
                del browser o contattandoci.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3">5. Come Gestire i Cookies nel Browser</h2>
              <p className="text-gray-700 mb-3">
                Puoi bloccare o eliminare i cookies attraverso le impostazioni del tuo browser:
              </p>
              <div className="space-y-2 text-gray-700 ml-4">
                <p><strong>Chrome:</strong> Impostazioni → Privacy e sicurezza → Cookie</p>
                <p><strong>Firefox:</strong> Opzioni → Privacy e sicurezza → Cookie e dati dei siti</p>
                <p><strong>Safari:</strong> Preferenze → Privacy → Gestisci dati siti web</p>
                <p><strong>Edge:</strong> Impostazioni → Cookie e autorizzazioni sito</p>
              </div>
              <p className="text-red-600 text-sm mt-3">
                ⚠️ Attenzione: Disabilitare i cookies tecnici potrebbe compromettere il funzionamento del sito
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3">6. Cookies di Terze Parti</h2>
              <p className="text-gray-700 mb-3">
                Per maggiori informazioni sui cookies di terze parti utilizzati:
              </p>
              <ul className="space-y-2 text-gray-700 ml-4">
                <li>
                  <strong>Google Analytics:</strong>{" "}
                  <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" 
                     className="text-blue-600 hover:underline">
                    policies.google.com/privacy
                  </a>
                </li>
                <li>
                  <strong>Google Maps:</strong>{" "}
                  <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer"
                     className="text-blue-600 hover:underline">
                    policies.google.com/privacy
                  </a>
                </li>
                <li>
                  <strong>PayPal:</strong>{" "}
                  <a href="https://www.paypal.com/privacy" target="_blank" rel="noopener noreferrer"
                     className="text-blue-600 hover:underline">
                    www.paypal.com/privacy
                  </a>
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3">7. Aggiornamenti</h2>
              <p className="text-gray-700">
                Questa Cookie Policy può essere aggiornata periodicamente. Ti invitiamo a
                consultare regolarmente questa pagina per essere informato sulle nostre
                pratiche relative ai cookies.
              </p>
            </section>

            <section className="bg-red-50 p-4 rounded-lg border border-red-200">
              <h3 className="font-bold text-red-900 mb-2">📧 Contatti</h3>
              <p className="text-red-800">
                Per domande o richieste relative all'uso dei cookies:
              </p>
              <ul className="list-none space-y-1 text-red-800 ml-4 mt-2">
                <li>Email: privacy@ordinafacile.it</li>
                <li>Tel: +39 XXX XXX XXXX</li>
              </ul>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}