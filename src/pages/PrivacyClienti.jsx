import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function PrivacyClienti() {
  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
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
              <CardTitle className="text-3xl">Informativa Privacy (Clienti)</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Ultimo aggiornamento: {new Date().toLocaleDateString("it-IT")}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Informativa ai sensi dell'art. 13 del Regolamento UE 2016/679 (GDPR)
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <section>
              <h2 className="text-2xl font-bold mb-3">1. Chi è il Titolare del Trattamento</h2>
              <p className="text-muted-foreground">
                Quando effettui un ordine, il Titolare del trattamento dei tuoi dati personali è il ristorante presso cui stai
                ordinando (di seguito, "Ristorante"). Il Ristorante utilizza la piattaforma OrdinaFacile per gestire gli ordini.
              </p>
              <p className="text-muted-foreground mt-2">
                OrdinaFacile ("Piattaforma") tratta i dati per conto del Ristorante, come fornitore tecnico.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3">2. Dati Personali Trattati</h2>
              <p className="text-muted-foreground mb-2">I dati trattati in fase di ordine possono includere:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li><strong>Dati identificativi e contatto:</strong> nome, telefono, email (se fornita)</li>
                <li><strong>Dati di consegna:</strong> indirizzo e dettagli necessari alla consegna (se consegna a domicilio)</li>
                <li><strong>Dati dell'ordine:</strong> prodotti acquistati, note, preferenze, totale e stato ordine</li>
                <li><strong>Dati tecnici:</strong> informazioni di navigazione e cookie tecnici necessari</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3">3. Finalità e Base Giuridica</h2>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>
                  <strong>Gestione ed evasione dell'ordine:</strong> raccolta, conferma, preparazione e consegna/asporto
                  (base giuridica: esecuzione di misure precontrattuali/contrattuali).
                </li>
                <li>
                  <strong>Comunicazioni sullo stato dell'ordine:</strong> contatti relativi a conferma, tempi e problemi
                  dell'ordine (base giuridica: esecuzione del contratto).
                </li>
                <li>
                  <strong>Sicurezza e prevenzione abusi:</strong> protezione dei sistemi e prevenzione frodi
                  (base giuridica: legittimo interesse).
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3">4. Destinatari dei Dati</h2>
              <p className="text-muted-foreground mb-2">I dati possono essere trattati o comunicati a:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>Personale autorizzato del Ristorante</li>
                <li>Fornitori tecnici (hosting, database, invio email) necessari al funzionamento della piattaforma</li>
                <li>Servizi di pagamento (se utilizzati dal Ristorante per i pagamenti online)</li>
                <li>Autorità competenti quando previsto dalla legge</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3">5. Conservazione</h2>
              <p className="text-muted-foreground">
                I dati sono conservati per il tempo necessario alla gestione dell'ordine e secondo eventuali obblighi di legge
                applicabili al Ristorante (es. obblighi contabili/fiscali). La Piattaforma conserva i dati per il tempo necessario
                all'erogazione del servizio al Ristorante e per finalità di sicurezza.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3">6. Cookies</h2>
              <p className="text-muted-foreground">
                Il sito utilizza cookie tecnici necessari al funzionamento e, se abilitati, cookie analitici previo consenso.
                Per maggiori informazioni puoi consultare la
                <Link to={createPageUrl("Cookies")} className="text-red-600 hover:underline ml-1">
                  Cookie Policy
                </Link>.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3">7. Diritti dell'Interessato</h2>
              <p className="text-muted-foreground mb-2">
                Puoi esercitare i diritti previsti dagli artt. 15-22 del GDPR (accesso, rettifica, cancellazione, limitazione,
                portabilità, opposizione, reclamo).
              </p>
              <p className="text-muted-foreground">
                Per richieste relative ai dati dell'ordine, contatta direttamente il Ristorante (ai recapiti indicati nella pagina
                del ristorante). Per questioni tecniche relative alla piattaforma, puoi contattarci ai recapiti indicati nella
                pagina
                <Link to={createPageUrl("Privacy")} className="text-red-600 hover:underline ml-1">
                  Privacy (Ristoratori)
                </Link>.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3">8. Reclami</h2>
              <p className="text-muted-foreground">
                Hai diritto di proporre reclamo all'Autorità Garante per la Protezione dei Dati Personali.
              </p>
              <p className="text-muted-foreground mt-2">
                <strong>Garante Privacy:</strong><br />
                Piazza Venezia, 11 - 00187 Roma<br />
                Tel: +39 06 696771<br />
                Email: garante@gpdp.it<br />
                Web: www.garanteprivacy.it
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
