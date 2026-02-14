import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Terms() {
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
            <CardTitle className="text-3xl">Termini e Condizioni di Servizio</CardTitle>
            <p className="text-sm text-gray-500">Ultimo aggiornamento: {new Date().toLocaleDateString('it-IT')}</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <section>
              <h2 className="text-2xl font-bold mb-3">1. Accettazione dei Termini</h2>
              <p className="text-gray-700">
                Utilizzando la piattaforma OrdinaFacile, accetti integralmente i presenti Termini e Condizioni.
                Se non accetti questi termini, ti preghiamo di non utilizzare i nostri servizi.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3">2. Descrizione del Servizio</h2>
              <p className="text-gray-700 mb-2">
                OrdinaFacile è una piattaforma che permette ai ristoratori di:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                <li>Gestire menu digitali e ordini online</li>
                <li>Ricevere pagamenti tramite integrazione con sistemi di pagamento</li>
                <li>Gestire più sedi del proprio ristorante</li>
                <li>Creare promozioni e eventi speciali</li>
                <li>Monitorare statistiche e analytics</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3">3. Abbonamenti e Pagamenti</h2>
              <p className="text-gray-700 mb-2">
                I servizi offerti sono soggetti a pagamento secondo i piani tariffari disponibili.
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                <li>Gli abbonamenti si rinnovano automaticamente salvo disdetta</li>
                <li>Le tariffe possono essere modificate con preavviso di 30 giorni</li>
                <li>I pagamenti sono elaborati tramite gateway di pagamento sicuri</li>
                <li>In caso di mancato pagamento, l'accesso al servizio verrà sospeso</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3">4. Responsabilità dell'Utente</h2>
              <p className="text-gray-700 mb-2">
                Come utente della piattaforma, ti impegni a:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                <li>Fornire informazioni accurate e aggiornate</li>
                <li>Mantenere riservate le credenziali di accesso</li>
                <li>Rispettare le leggi vigenti in materia di vendita di alimenti</li>
                <li>Gestire correttamente gli ordini e i pagamenti dei clienti</li>
                <li>Garantire la qualità e sicurezza dei prodotti offerti</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3">5. Proprietà Intellettuale</h2>
              <p className="text-gray-700">
                Tutti i contenuti della piattaforma, inclusi design, loghi, codice e documentazione,
                sono proprietà di OrdinaFacile e protetti da copyright. È vietata qualsiasi
                riproduzione senza autorizzazione scritta.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3">6. Limitazione di Responsabilità</h2>
              <p className="text-gray-700">
                OrdinaFacile fornisce la piattaforma "così com'è" e non garantisce l'assenza di
                interruzioni o errori. Non siamo responsabili per danni indiretti, perdite di profitto
                o danni conseguenti all'utilizzo del servizio.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3">7. Risoluzione e Sospensione</h2>
              <p className="text-gray-700 mb-2">
                Ci riserviamo il diritto di sospendere o terminare l'accesso al servizio in caso di:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                <li>Violazione dei presenti Termini e Condizioni</li>
                <li>Mancato pagamento degli abbonamenti</li>
                <li>Utilizzo fraudolento o illegale della piattaforma</li>
                <li>Comportamento dannoso verso altri utenti o il sistema</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3">8. Modifiche ai Termini</h2>
              <p className="text-gray-700">
                Ci riserviamo il diritto di modificare questi Termini in qualsiasi momento.
                Le modifiche saranno comunicate via email e pubblicate sulla piattaforma.
                L'uso continuato del servizio dopo le modifiche costituisce accettazione dei nuovi termini.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3">9. Legge Applicabile</h2>
              <p className="text-gray-700">
                Questi Termini sono regolati dalla legge italiana. Qualsiasi controversia sarà
                di competenza esclusiva del Foro di [Città].
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3">10. Contatti</h2>
              <p className="text-gray-700">
                Per qualsiasi domanda riguardo questi Termini, puoi contattarci a:
              </p>
              <ul className="list-none space-y-1 text-gray-700 ml-4 mt-2">
                <li>📧 Email: supporto@ordinafacile.it</li>
                <li>📞 Telefono: +39 XXX XXX XXXX</li>
                <li>📍 Indirizzo: Via Example, 123 - 00100 Roma (RM)</li>
              </ul>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}