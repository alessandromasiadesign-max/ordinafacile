# 📋 Documento di Continuità — Progetto "Ordina Facile"
**Data ultimo aggiornamento:** 16 Aprile 2026  
**Scopo:** Permettere a chiunque (o a una nuova sessione AI) di riprendere il lavoro esattamente da dove è stato lasciato.

---

## 1. 🎯 Obiettivo Principale del Progetto

**Ordina Facile** è una piattaforma SaaS multi-tenant per la gestione di ristoranti italiani.  
Permette ai ristoratori di:
- Ricevere e gestire ordini (consegna a domicilio e asporto)
- Gestire il menu digitale con categorie, prodotti, modificatori e allergeni
- Configurare promozioni, eventi speciali, sedi multiple
- Stampare comande su stampanti termiche
- Gestire abbonamenti e pagamenti

Il **Master Admin** (account con `role: 'admin'`) ha accesso a una dashboard centrale per supervisionare tutti i ristoranti, gestire abbonamenti, codici sconto e richieste di assistenza tecnica.

---

## 2. 🏗️ Architettura e Stack Tecnologico

### Frontend
- **React 18** + **Vite** + **TypeScript/JSX**
- **Tailwind CSS** per lo styling (con design tokens in `index.css`)
- **shadcn/ui** per i componenti UI (in `components/ui/`)
- **TanStack React Query** per il fetching e caching dati
- **React Router DOM v6** per il routing
- **Lucide React** per le icone
- **Framer Motion** per le animazioni

### Backend (Base44 Platform)
- **Base44 SDK** (`@/api/base44Client`) per tutte le operazioni dati
- **Autenticazione** gestita dalla piattaforma Base44 (no login page custom)
- **Storage file** tramite `base44.integrations.Core.UploadFile`
- **Email** tramite `base44.integrations.Core.SendEmail`
- **AI/LLM** tramite `base44.integrations.Core.InvokeLLM`

### Routing
- `pages.config.js` definisce tutte le pagine e il layout globale
- `Layout.jsx` è il layout principale con sidebar (wrappa tutte le pagine autenticate)
- La pagina principale è `Dashboard` (route `/`)

---

## 3. 📁 Struttura File Chiave

```
/
├── Layout.jsx                  # Layout principale con sidebar di navigazione
├── App.jsx                     # Router principale
├── pages.config.js             # Configurazione pagine e routing
├── index.css                   # Design tokens CSS variables
├── tailwind.config.js          # Configurazione Tailwind
│
├── pages/
│   ├── Dashboard.jsx           # Dashboard principale ristoratore
│   ├── Orders.jsx              # Gestione ordini in tempo reale
│   ├── OrderHistory.jsx        # Storico ordini
│   ├── MenuManagement.jsx      # Gestione menu (categorie + prodotti)
│   ├── Settings.jsx            # Impostazioni ristorante
│   ├── Locations.jsx           # Gestione sedi multiple
│   ├── Events.jsx              # Gestione eventi speciali
│   ├── Promotions.jsx          # Gestione promozioni
│   ├── PrintOrders.jsx         # Stampa comande
│   ├── RestaurantPublic.jsx    # Pagina pubblica cliente (menu digitale)
│   ├── EventMenu.jsx           # Menu specifico per evento
│   ├── MasterDashboard.jsx     # Dashboard admin master
│   ├── SubscriptionSettings.jsx # Gestione abbonamenti (admin)
│   ├── SupportRequests.jsx     # Richieste assistenza (admin)
│   ├── DiscountCodes.jsx       # Codici sconto abbonamenti (admin)
│   ├── RenewSubscription.jsx   # Pagina rinnovo abbonamento (ristoratore)
│   ├── Landing.jsx             # Landing page pubblica
│   ├── Terms.jsx / Privacy.jsx / Cookies.jsx
│   └── _app.jsx
│
├── components/
│   ├── layout/
│   │   └── ChatBot.jsx         # Chatbot AI assistente ristoratore
│   ├── support/
│   │   └── TechnicalSupportDialog.jsx  # Dialog richiesta assistenza tecnica
│   ├── ui/                     # Componenti shadcn/ui
│   ├── dashboard/              # Componenti specifici dashboard
│   ├── menu/                   # Componenti gestione menu
│   ├── settings/               # Componenti impostazioni
│   ├── promotions/             # Componenti promozioni
│   ├── subscriptions/          # Componenti abbonamenti
│   ├── locations/              # Componenti sedi
│   ├── orders/                 # Componenti ordini
│   └── events/                 # Componenti eventi
│
└── entities/                   # Schemi JSON delle entità database
    ├── Restaurant.json
    ├── MenuItem.json
    ├── Category.json
    ├── Order.json
    ├── Modifier.json
    ├── Promotion.json
    ├── PromotionUsage.json
    ├── Event.json
    ├── Location.json
    ├── Review.json
    ├── Printer.json
    ├── SubscriptionPlan.json
    ├── SubscriptionTransaction.json
    ├── SubscriptionDiscountCode.json
    ├── DiscountUsage.json
    ├── TechnicalSupport.json
    ├── TechnicalSupportPrice.json
    ├── PlatformSettings.json
    └── ChatMessage.json
```

---

## 4. 🗄️ Entità Database Principali

### Restaurant
Entità centrale. Ogni ristoratore ha un record con:
- `user_id`: collegato all'utente Base44
- Dati anagrafici (nome, indirizzo, telefono, email)
- Branding (logo_url, colori, immagini)
- `abbonamento_tipo`: `free | basic | premium`
- `abbonamento_scadenza`: data scadenza
- `abbonamento_attivo`: boolean
- Zone di consegna con coordinate GPS
- Configurazione fiscale (P.IVA, SDI, ecc.)

### Order
Ordine cliente con:
- `stato`: `nuovo → confermato → in_preparazione → pronto → in_consegna → completato | annullato`
- `tipo_consegna`: `consegna | asporto`
- `items`: array con prodotti, quantità, modificatori, note
- `metodo_pagamento`: `contanti | paypal | carta`
- `pagamento_stato`: `pending | completed | failed`

### PlatformSettings
Impostazioni globali della piattaforma (un solo record):
- `email_assistenza`: email per le richieste di supporto
- `telefono_assistenza`: numero mostrato nella sidebar dei ristoratori
- `payment_info`: IBAN, PayPal, Stripe per abbonamenti
- `notification_settings`: configurazione notifiche scadenza

### TechnicalSupport
Richieste di assistenza tecnica dai ristoratori:
- `stato`: `aperta | in_lavorazione | completata`
- Contiene screenshot_urls, dati contatto, descrizione problema

---

## 5. 🔐 Ruoli e Permessi

| Ruolo | Accesso |
|-------|---------|
| `admin` | Master Dashboard, Gestione Abbonamenti, Richieste Assistenza, Codici Sconto + tutto il resto |
| `user` (ristoratore) | Solo le sue pagine: Dashboard, Ordini, Menu, Impostazioni, ecc. |

Il Layout (`Layout.jsx`) mostra voci extra nella sidebar solo se `user.role === 'admin'`.

---

## 6. 🧭 Navigazione Sidebar (Layout.jsx)

### Voci sempre visibili (ristoratori):
1. Dashboard
2. Ordini
3. Storico
4. Menu
5. Sedi
6. Eventi
7. Promozioni
8. Stampa Comande
9. Impostazioni
10. Richiedi Assistenza (apre `TechnicalSupportDialog`)

### Voci solo per Admin Master:
- Master Dashboard
- Gestione Abbonamenti
- Richieste Assistenza
- Codici Sconto

### Funzionalità speciali sidebar:
- **Banner telefono assistenza**: se `PlatformSettings.telefono_assistenza` è impostato, mostra un box verde in cima alla sidebar con numero cliccabile
- **Banner abbonamento in scadenza**: se mancano ≤15 giorni alla scadenza, mostra avviso giallo con bottone rinnovo
- **Redirect automatico**: se abbonamento scaduto e non attivo, reindirizza a `RenewSubscription`

---

## 7. 🔧 Problemi Risolti in Questa Sessione

### Problema 1: Build failure — `sidebar.jsx` Invalid binding pattern
**Errore:** `...props, id` è sintassi JavaScript non valida (rest element deve essere l'ultimo)  
**Causa:** Sincronizzazione GitHub ha introdotto codice corrotto  
**Soluzione:** Riscritto completamente `components/ui/sidebar.jsx` con:
- Hook `useIsMobile` inline (non da file esterno, per evitare dipendenze rotte)
- Rimosso `id` dopo `...props` nei parametri distruttured
- Tutti i componenti sidebar corretti e funzionanti

### Problema 2: Precedente sessione — dipendenze moduli mancanti
**Causa:** Sync GitHub aveva eliminato o modificato file di supporto  
**Soluzione:** `useIsMobile` integrato direttamente in `sidebar.jsx` invece di importarlo da `hooks/use-mobile.jsx`

---

## 8. 📌 Decisioni Architetturali Importanti

1. **Nessuna pagina di login custom**: gestita interamente da Base44
2. **Layout globale**: `Layout.jsx` wrappa tutte le pagine tramite `pages.config.js`
3. **Telefono assistenza**: configurato dal Master Admin in `PlatformSettings`, letto dal Layout in tempo reale
4. **Abbonamenti**: gestiti manualmente dall'admin (nessun gateway automatico integrato al momento)
5. **Stampa comande**: via browser print API, supporto stampanti WiFi/Bluetooth/USB
6. **Menu pubblico cliente**: accessibile senza login tramite URL con `?id=restaurantId`
7. **Multi-sede**: ogni ristorante può avere più `Location`, ciascuna con menu condiviso o separato
8. **ChatBot**: assistente AI integrato nel layout per supportare il ristoratore

---

## 9. 📊 Stato Attuale del Lavoro

### ✅ Completato e funzionante:
- [x] Autenticazione e gestione ruoli
- [x] Layout con sidebar responsive (mobile + desktop)
- [x] Dashboard ristoratore con statistiche e grafici
- [x] Gestione ordini in tempo reale con notifiche
- [x] Storico ordini
- [x] Gestione menu (categorie, prodotti, modificatori, allergeni)
- [x] Pagina pubblica menu digitale per clienti
- [x] Menu eventi speciali
- [x] Gestione promozioni (con codici e regole avanzate)
- [x] Gestione sedi multiple
- [x] Stampa comande
- [x] Impostazioni ristorante complete (fiscali, branding, orari, zone consegna)
- [x] Master Dashboard con overview piattaforma
- [x] Gestione abbonamenti (admin)
- [x] Codici sconto abbonamenti
- [x] Richieste assistenza tecnica (con screenshot)
- [x] Banner telefono assistenza in sidebar
- [x] ChatBot AI assistente
- [x] Pagine legali (Privacy, Termini, Cookie)
- [x] Rinnovo abbonamento

### 🐛 Bug Corretti in Questa Sessione:
- [x] `sidebar.jsx` — Invalid binding pattern `...props, id` (build failure)

---

## 10. 🚀 Prossimi Passi Suggeriti

### Priorità Alta:
1. **Test end-to-end** del flusso completo: cliente ordina → ristoratore riceve → stampa → completa
2. **Verifica sincronizzazione GitHub**: dopo ogni sync controllare che i file critici (`sidebar.jsx`, `Layout.jsx`) non vengano corrotti
3. **Gestione pagamenti abbonamenti**: integrare un gateway reale (Stripe) o migliorare il flusso manuale con conferma bonifico

### Priorità Media:
4. **Notifiche push/email** al ristoratore per nuovi ordini
5. **Recensioni**: il sistema è progettato (`Review` entity) ma manca UI pubblica per lasciarle
6. **Analytics avanzate**: espandere la dashboard con metriche prodotti più venduti, fasce orarie, ecc.
7. **App mobile**: il codice è già responsive, valutare pubblicazione come PWA o app nativa

### Priorità Bassa:
8. **Integrazioni delivery** (Glovo, Deliveroo) via webhook
9. **Gestione inventario** prodotti
10. **Programma fedeltà** clienti

---

## 11. 🛠️ Come Lavorare sul Progetto

### Per aggiungere una nuova pagina:
1. Creare `pages/NomePagina.jsx`
2. Aggiungerla in `pages.config.js` (import + entry in PAGES)
3. Il routing è automatico tramite `App.jsx`

### Per aggiungere una nuova entità:
1. Creare `entities/NomeEntita.json` con schema JSON
2. Usare `base44.entities.NomeEntita.list/filter/create/update/delete`

### Per modificare la sidebar:
- Editare `Layout.jsx` — array `navigationItems` per le voci standard
- Blocco `isMasterAccount` per le voci admin

### Attenzione ai sync GitHub:
- I sync possono corrompere `components/ui/sidebar.jsx` (problema già visto)
- Dopo ogni sync, verificare che il build non fallisca
- Se fallisce, leggere `sidebar.jsx` e correggere la sintassi

---

## 12. 🔑 Variabili e Costanti Importanti

```javascript
// Colori brand (definiti in Layout.jsx inline style)
--primary: #e74c3c    // Rosso brand
--secondary: #2c3e50  // Blu scuro
--success: #27ae60    // Verde
--warning: #f39c12    // Arancione

// Ruoli utente
role === 'admin'  // Master Admin
role === 'user'   // Ristoratore standard

// Stati ordine (in ordine di workflow)
'nuovo' → 'confermato' → 'in_preparazione' → 'pronto' → 'in_consegna' → 'completato'
// oppure: 'annullato' (da qualsiasi stato)

// Tipi abbonamento
'free' | 'basic' | 'premium'
```

---

*Documento generato automaticamente il 16 Aprile 2026. Aggiornare ad ogni sessione di lavoro significativa.*