import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Privacy() {
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
              <Shield className="w-8 h-8 text-red-600" />
              <CardTitle className="text-3xl">Informativa sulla Privacy</CardTitle>
            </div>
            <p className="text-sm text-gray-500">
              Ultimo aggiornamento: {new Date().toLocaleDateString('it-IT')}
            </p>
            <p className="text-sm text-gray-600 mt-2">
              Informativa ai sensi dell'art. 13 del Regolamento UE 2016/679 (GDPR)
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <section>
              <h2 className="text-2xl font-bold mb-3">1. Titolare del Trattamento</h2>
              <p className="text-gray-700">
                Il Titolare del trattamento dei dati è OrdinaFacile S.r.l., con sede legale in
                Via Example, 123 - 00100 Roma (RM), P.IVA: XXXXXXXXXXX
              </p>
              <p className="text-gray-700 mt-2">
                Email: privacy@ordinafacile.it<br />
                PEC: ordinafacile@pec.it
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3">2. Dati Raccolti</h2>
              <p className="text-gray-700 mb-2">
                Raccogliamo le seguenti categorie di dati personali:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                <li><strong>Dati identificativi:</strong> nome, cognome, email, telefono</li>
                <li><strong>Dati aziendali:</strong> ragione sociale, P.IVA, indirizzo sede</li>
                <li><strong>Dati di pagamento:</strong> informazioni bancarie, transazioni</li>
                <li><strong>Dati di navigazione:</strong> indirizzo IP, cookies, log di accesso</li>
                <li><strong>Dati degli ordini:</strong> informazioni sui clienti e ordini gestiti</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3">3. Finalità del Trattamento</h2>
              <p className="text-gray-700 mb-2">
                I tuoi dati personali sono trattati per le seguenti finalità:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li>
                  <strong>Erogazione del servizio:</strong> gestione account, elaborazione ordini,
                  supporto clienti (base giuridica: esecuzione del contratto)
                </li>
                <li>
                  <strong>Adempimenti fiscali:</strong> fatturazione, dichiarazioni fiscali
                  (base giuridica: obbligo di legge)
                </li>
                <li>
                  <strong>Marketing:</strong> invio comunicazioni promozionali
                  (base giuridica: consenso esplicito)
                </li>
                <li>
                  <strong>Miglioramento servizi:</strong> analisi statistiche, sviluppo funzionalità
                  (base giuridica: legittimo interesse)
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3">4. Modalità di Trattamento</h2>
              <p className="text-gray-700">
                I dati sono trattati con strumenti informatici e telematici, adottando misure di
                sicurezza tecniche e organizzative adeguate per prevenire perdita, uso illecito
                o non autorizzato. Il trattamento avviene presso la nostra sede e tramite server
                cloud sicuri ubicati nell'Unione Europea.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3">5. Condivisione dei Dati</h2>
              <p className="text-gray-700 mb-2">
                I tuoi dati possono essere comunicati a:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                <li>Provider di servizi cloud (hosting, database)</li>
                <li>Gateway di pagamento (PayPal, Stripe)</li>
                <li>Consulenti fiscali e commercialisti</li>
                <li>Autorità competenti quando richiesto dalla legge</li>
              </ul>
              <p className="text-gray-700 mt-2">
                Non vendiamo né cediamo i tuoi dati a terzi per fini commerciali.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3">6. Trasferimento Dati Extra-UE</h2>
              <p className="text-gray-700">
                Alcuni fornitori di servizi possono trovarsi al di fuori dell'Unione Europea.
                In tal caso, garantiamo che il trasferimento avvenga in conformità al GDPR,
                tramite clausole contrattuali standard o certificazioni adeguate.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3">7. Tempo di Conservazione</h2>
              <p className="text-gray-700">
                I dati personali sono conservati per il tempo necessario alle finalità per cui
                sono stati raccolti:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4 mt-2">
                <li>Dati contrattuali: durata del contratto + 10 anni (obbligo fiscale)</li>
                <li>Dati di marketing: fino a revoca del consenso</li>
                <li>Log di accesso: 12 mesi</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3">8. Diritti dell'Interessato</h2>
              <p className="text-gray-700 mb-2">
                Hai il diritto di:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                <li><strong>Accesso:</strong> ottenere conferma del trattamento e copia dei dati</li>
                <li><strong>Rettifica:</strong> correggere dati inesatti o incompleti</li>
                <li><strong>Cancellazione:</strong> ottenere la cancellazione dei dati ("diritto all'oblio")</li>
                <li><strong>Limitazione:</strong> limitare il trattamento in determinate circostanze</li>
                <li><strong>Portabilità:</strong> ricevere i dati in formato strutturato</li>
                <li><strong>Opposizione:</strong> opporsi al trattamento per marketing o profilazione</li>
                <li><strong>Revoca consenso:</strong> revocare il consenso in qualsiasi momento</li>
              </ul>
              <p className="text-gray-700 mt-3">
                Per esercitare i tuoi diritti, invia una richiesta a: privacy@ordinafacile.it
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3">9. Cookies</h2>
              <p className="text-gray-700">
                Il sito utilizza cookies tecnici necessari al funzionamento e cookies analitici
                per migliorare l'esperienza utente. Puoi gestire le preferenze cookies tramite
                le impostazioni del browser. Per maggiori informazioni, consulta la nostra
                <Link to={createPageUrl("Cookies")} className="text-red-600 hover:underline ml-1">
                  Cookie Policy
                </Link>.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3">10. Minori</h2>
              <p className="text-gray-700">
                I nostri servizi sono rivolti esclusivamente a soggetti maggiorenni o con
                capacità d'agire. Non raccogliamo consapevolmente dati di minori di 18 anni.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3">11. Modifiche all'Informativa</h2>
              <p className="text-gray-700">
                Ci riserviamo il diritto di modificare questa informativa in qualsiasi momento.
                Le modifiche saranno pubblicate su questa pagina con indicazione della data di
                aggiornamento. Ti invitiamo a consultare periodicamente questa sezione.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3">12. Reclami</h2>
              <p className="text-gray-700">
                Hai il diritto di proporre reclamo all'Autorità Garante per la Protezione dei
                Dati Personali se ritieni che il trattamento dei tuoi dati violi il GDPR.
              </p>
              <p className="text-gray-700 mt-2">
                <strong>Garante Privacy:</strong><br />
                Piazza Venezia, 11 - 00187 Roma<br />
                Tel: +39 06 696771<br />
                Email: garante@gpdp.it<br />
                Web: www.garanteprivacy.it
              </p>
            </section>

            <section className="bg-red-50 p-4 rounded-lg border border-red-200">
              <h3 className="font-bold text-red-900 mb-2">📧 Contatti Privacy</h3>
              <p className="text-red-800">
                Per qualsiasi domanda o richiesta relativa al trattamento dei tuoi dati personali:
              </p>
              <ul className="list-none space-y-1 text-red-800 ml-4 mt-2">
                <li>Email: privacy@ordinafacile.it</li>
                <li>PEC: ordinafacile@pec.it</li>
                <li>Tel: +39 XXX XXX XXXX</li>
              </ul>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}