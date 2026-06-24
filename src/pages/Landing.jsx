import React from "react";
import { createPageUrl } from "@/utils";
import {
  BadgeCheck,
  ChevronRight,
  Headset,
  LayoutDashboard,
  QrCode,
  Shield,
  Store,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function Landing() {
  const scrollToId = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-500 via-red-500 to-rose-600 flex items-center justify-center shadow-sm">
              <Store className="h-5 w-5 text-white" />
            </div>
            <div className="leading-tight">
              <div className="font-semibold">OrdinaFacile</div>
              <div className="text-xs text-muted-foreground">Per ristoranti che vogliono vendere meglio</div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <button
              type="button"
              className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
              onClick={() => scrollToId("features")}
            >
              Funzionalità
            </button>
            <button
              type="button"
              className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
              onClick={() => scrollToId("how")}
            >
              Come funziona
            </button>
            <button
              type="button"
              className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
              onClick={() => scrollToId("plans")}
            >
              Piani
            </button>
            <button
              type="button"
              className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
              onClick={() => scrollToId("faq")}
            >
              FAQ
            </button>
            <div className="w-px h-6 bg-border/60 mx-2" />
            <Button asChild variant="ghost" className="h-9">
              <Link to={createPageUrl("Login")}>Accedi</Link>
            </Button>
            <Button asChild className="h-9 bg-gradient-to-r from-rose-600 via-red-600 to-amber-500 hover:from-rose-700 hover:via-red-700 hover:to-amber-600">
              <Link to={createPageUrl("Register")}>
                Inizia ora
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </nav>

          <div className="md:hidden flex items-center gap-2">
            <Button asChild variant="ghost" className="h-9 px-3">
              <Link to={createPageUrl("Login")}>Accedi</Link>
            </Button>
            <Button asChild className="h-9 px-3 bg-gradient-to-r from-rose-600 via-red-600 to-amber-500 hover:from-rose-700 hover:via-red-700 hover:to-amber-600">
              <Link to={createPageUrl("Register")}>Inizia</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="max-w-6xl mx-auto px-4 pt-14 pb-12 md:pt-20 md:pb-16">
            <motion.div
              aria-hidden="true"
              className="absolute -top-24 -left-20 h-72 w-72 rounded-full bg-amber-400/25 blur-3xl"
              animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
              transition={{ duration: 14, repeat: Infinity, repeatType: "mirror" }}
            />
            <motion.div
              aria-hidden="true"
              className="absolute top-10 -right-28 h-80 w-80 rounded-full bg-rose-500/20 blur-3xl"
              animate={{ x: [0, -20, 0], y: [0, 25, 0] }}
              transition={{ duration: 16, repeat: Infinity, repeatType: "mirror" }}
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:radial-gradient(circle_at_1px_1px,hsl(var(--foreground))_1px,transparent_0)] [background-size:22px_22px]"
            />

            <div className="relative grid md:grid-cols-2 gap-10 items-center">
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 backdrop-blur px-3 py-1 text-xs text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  Menu bello. Ordini veloci. Gestione chiara.
                </div>
                <h1 className="mt-4 text-4xl md:text-6xl font-bold tracking-tight">
                  Il tuo ristorante,
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-600 via-red-600 to-amber-500"> online</span>
                  . Con stile.
                </h1>
                <p className="mt-4 text-base md:text-lg text-muted-foreground">
                  OrdinaFacile è la piattaforma che ti aiuta a gestire menu, ordini, promozioni e operatività quotidiana.
                  Pensata per essere veloce, bella e concreta.
                </p>

                <div className="mt-7 flex flex-col sm:flex-row gap-3">
                  <Button asChild className="h-12 bg-gradient-to-r from-rose-600 via-red-600 to-amber-500 hover:from-rose-700 hover:via-red-700 hover:to-amber-600">
                    <Link to={createPageUrl("Register")}>
                      Crea il tuo ristorante
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12"
                    onClick={() => scrollToId("features")}
                  >
                    Scopri le funzionalità
                  </Button>
                </div>

                <div className="mt-8 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl border border-border/60 bg-background/50 backdrop-blur px-4 py-3">
                    <div className="font-medium">Menu digitale</div>
                    <div className="text-muted-foreground">Categorie, foto, allergeni, varianti</div>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-background/50 backdrop-blur px-4 py-3">
                    <div className="font-medium">Ordini operativi</div>
                    <div className="text-muted-foreground">Conferme, stati, stampa, storico</div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="relative"
              >
                <div className="rounded-3xl border border-border/60 bg-background/50 backdrop-blur p-6 shadow-sm">
                  <div className="mb-4 rounded-2xl overflow-hidden border border-border/60">
                    <div className="relative aspect-[16/10] bg-gradient-to-br from-amber-200/60 via-rose-200/40 to-red-200/50 dark:from-amber-500/10 dark:via-rose-500/10 dark:to-red-500/10">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.65),transparent_55%),radial-gradient(circle_at_80%_30%,rgba(255,255,255,0.55),transparent_55%)] dark:bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.08),transparent_55%),radial-gradient(circle_at_80%_30%,rgba(255,255,255,0.06),transparent_55%)]" />
                      <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-border/60 bg-background/70 backdrop-blur px-4 py-3">
                        <div className="text-xs text-muted-foreground">Preview menu</div>
                        <div className="text-sm font-medium">Un'esperienza ordinata, anche sul telefono</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-border/60 bg-background p-4">
                      <div className="flex items-center gap-2">
                        <QrCode className="h-4 w-4 text-rose-600" />
                        <div className="font-medium">QR Menu</div>
                      </div>
                      <div className="text-sm text-muted-foreground mt-2">Accesso immediato dal tavolo</div>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-background p-4">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-amber-500" />
                        <div className="font-medium">Velocità</div>
                      </div>
                      <div className="text-sm text-muted-foreground mt-2">Interfaccia rapida e chiara</div>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-background p-4">
                      <div className="flex items-center gap-2">
                        <LayoutDashboard className="h-4 w-4 text-amber-600" />
                        <div className="font-medium">Dashboard</div>
                      </div>
                      <div className="text-sm text-muted-foreground mt-2">Ordini e performance</div>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-background p-4">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-rose-600" />
                        <div className="font-medium">Affidabilità</div>
                      </div>
                      <div className="text-sm text-muted-foreground mt-2">Flussi stabili e sicuri</div>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl bg-gradient-to-r from-rose-600 via-red-600 to-amber-500 p-[1px]">
                    <div className="rounded-2xl bg-background px-4 py-3">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="text-sm font-medium">Pronto a partire?</div>
                          <div className="text-xs text-muted-foreground">Attiva il tuo ristorante e configura il menu</div>
                        </div>
                        <Button asChild size="sm" className="bg-gradient-to-r from-rose-600 via-red-600 to-amber-500 hover:from-rose-700 hover:via-red-700 hover:to-amber-600">
                          <Link to={createPageUrl("Register")}>
                            Inizia
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <section id="features" className="border-t border-border/60">
          <div className="max-w-6xl mx-auto px-4 py-14 md:py-16">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-3xl md:text-4xl font-bold">Tutto ciò che serve, in un'unica piattaforma</h2>
              <p className="mt-3 text-muted-foreground max-w-2xl">
                Progettata per ristoratori: menu, ordini, promozioni, multi-sede ed eventi. Zero fronzoli, massima operatività.
              </p>
            </motion.div>

            <div className="mt-8 rounded-3xl border border-border/60 bg-gradient-to-br from-amber-100/60 via-rose-50/60 to-background dark:from-amber-500/10 dark:via-rose-500/10 dark:to-background p-6 md:p-8">
              <div className="grid md:grid-cols-2 gap-6 items-center">
                <div>
                  <div className="text-xs text-muted-foreground">Esperienza cliente</div>
                  <div className="mt-2 text-2xl md:text-3xl font-bold">
                    Un menu che fa venire voglia di ordinare
                  </div>
                  <div className="mt-3 text-sm text-muted-foreground">
                    Layout pulito, immagini, varianti e note: l'esperienza resta piacevole anche nelle serate più intense.
                    Tu gestisci tutto dal pannello.
                  </div>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background/70 backdrop-blur p-5">
                  <div className="text-sm font-medium">Risultato</div>
                  <div className="mt-2 grid grid-cols-3 gap-3 text-xs">
                    <div className="rounded-xl border border-border/60 bg-background px-3 py-3">
                      <div className="font-semibold">+Ordini</div>
                      <div className="text-muted-foreground mt-1">più fluidi</div>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-background px-3 py-3">
                      <div className="font-semibold">+Controllo</div>
                      <div className="text-muted-foreground mt-1">in cucina</div>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-background px-3 py-3">
                      <div className="font-semibold">+Stile</div>
                      <div className="text-muted-foreground mt-1">sul brand</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  icon: QrCode,
                  title: "Menu digitale & QR",
                  desc: "Categorie, prodotti, foto, allergeni e modificatori. Perfetto per tavoli e delivery.",
                },
                {
                  icon: LayoutDashboard,
                  title: "Gestione ordini",
                  desc: "Vista operativa, stati ordine, stampa e storico: tutto sotto controllo.",
                },
                {
                  icon: Zap,
                  title: "Velocità e semplicità",
                  desc: "Interfaccia pensata per lavorare veloce, anche nei momenti di punta.",
                },
                {
                  icon: BadgeCheck,
                  title: "Promo e campagne",
                  desc: "Codici sconto e promozioni per aumentare conversione e scontrino medio.",
                },
                {
                  icon: Store,
                  title: "Multi-sede ed eventi",
                  desc: "Gestisci sedi e menu evento in modo ordinato e coerente.",
                },
                {
                  icon: Headset,
                  title: "Supporto",
                  desc: "Assistenza e strumenti per risolvere velocemente dubbi o problemi tecnici.",
                },
              ].map((item) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ duration: 0.35 }}
                  className="rounded-2xl border border-border/60 bg-background/50 backdrop-blur p-5"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-rose-600 via-red-600 to-amber-500 flex items-center justify-center">
                      <item.icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="font-semibold">{item.title}</div>
                  </div>
                  <div className="mt-3 text-sm text-muted-foreground">{item.desc}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section id="how" className="border-t border-border/60">
          <div className="max-w-6xl mx-auto px-4 py-14 md:py-16">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-3xl md:text-4xl font-bold">Come funziona</h2>
              <p className="mt-3 text-muted-foreground max-w-2xl">
                Parti in poco tempo: crea il ristorante, configura il menu e gestisci gli ordini con un pannello chiaro.
              </p>
            </motion.div>

            <div className="mt-10 grid md:grid-cols-3 gap-4">
              {[
                {
                  n: "01",
                  title: "Attiva il ristorante",
                  desc: "Registrati e inserisci i dati essenziali della tua attività.",
                },
                {
                  n: "02",
                  title: "Costruisci il menu",
                  desc: "Categorie, prodotti, varianti e modificatori (anche obbligatori).",
                },
                {
                  n: "03",
                  title: "Gestisci gli ordini",
                  desc: "Ricevi e organizza gli ordini con stati, stampa e storico.",
                },
              ].map((step) => (
                <div
                  key={step.n}
                  className="rounded-2xl border border-border/60 bg-background/50 backdrop-blur p-6"
                >
                  <div className="text-xs text-muted-foreground">{step.n}</div>
                  <div className="mt-2 text-lg font-semibold">{step.title}</div>
                  <div className="mt-2 text-sm text-muted-foreground">{step.desc}</div>
                </div>
              ))}
            </div>

            <div className="mt-10 flex flex-col sm:flex-row gap-3">
              <Button asChild className="h-12 bg-red-600 hover:bg-red-700">
                <Link to={createPageUrl("Register")}>
                  Inizia ora
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-12">
                <Link to={createPageUrl("Login")}>Ho già un account</Link>
              </Button>
            </div>
          </div>
        </section>

        <section id="plans" className="border-t border-border/60">
          <div className="max-w-6xl mx-auto px-4 py-14 md:py-16">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-3xl md:text-4xl font-bold">Piani flessibili</h2>
              <p className="mt-3 text-muted-foreground max-w-2xl">
                Scegli il piano più adatto al tuo locale. Puoi iniziare semplice e crescere quando vuoi.
              </p>
            </motion.div>

            <div className="mt-10 grid md:grid-cols-3 gap-4">
              {[
                {
                  title: "Free",
                  desc: "Per iniziare e testare il flusso.",
                  items: ["Menu digitale", "Ordini base"],
                },
                {
                  title: "Basic",
                  desc: "Per locali che vogliono controllo e operatività.",
                  items: ["Promo", "Stati ordine", "Storico"],
                },
                {
                  title: "Premium",
                  desc: "Per chi vuole il massimo (multi-sede, eventi, ecc.).",
                  items: ["Multi-sede", "Eventi", "Strumenti avanzati"],
                },
              ].map((p) => (
                <div
                  key={p.title}
                  className="rounded-2xl border border-border/60 bg-background/50 backdrop-blur p-6"
                >
                  <div className="text-lg font-semibold">{p.title}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{p.desc}</div>
                  <div className="mt-4 space-y-2">
                    {p.items.map((x) => (
                      <div key={x} className="flex items-center gap-2 text-sm">
                        <span className="h-5 w-5 rounded-full bg-red-600/10 flex items-center justify-center">
                          <span className="h-2 w-2 rounded-full bg-red-600" />
                        </span>
                        <span>{x}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="border-t border-border/60">
          <div className="max-w-6xl mx-auto px-4 py-14 md:py-16">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-3xl md:text-4xl font-bold">FAQ</h2>
              <p className="mt-3 text-muted-foreground max-w-2xl">
                Risposte rapide alle domande più comuni.
              </p>
            </motion.div>

            <div className="mt-8 grid md:grid-cols-2 gap-4">
              {[
                {
                  q: "OrdinaFacile è adatto anche a locali piccoli?",
                  a: "Sì. L'idea è partire semplice e scalare quando serve, senza complicazioni.",
                },
                {
                  q: "Chi incassa gli ordini?",
                  a: "Gli incassi degli ordini sono del ristorante. La piattaforma è un servizio SaaS per la gestione.",
                },
                {
                  q: "Posso gestire consegna e asporto?",
                  a: "Sì, puoi configurare modalità di consegna/asporto e gestire i dettagli dell'ordine.",
                },
                {
                  q: "C'è una sezione legale (Privacy/Cookies/Termini)?",
                  a: "Sì, trovi tutto nel footer e nelle pagine dedicate.",
                },
              ].map((f) => (
                <details
                  key={f.q}
                  className="rounded-2xl border border-border/60 bg-background/50 backdrop-blur p-5"
                >
                  <summary className="cursor-pointer font-medium">{f.q}</summary>
                  <div className="mt-2 text-sm text-muted-foreground">{f.a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="font-semibold">OrdinaFacile</div>
              <div className="text-sm text-muted-foreground">Piattaforma SaaS per ristoranti</div>
              <div className="text-xs text-muted-foreground mt-2">© {new Date().getFullYear()} OrdinaFacile</div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <Link to={createPageUrl("Terms")} className="text-muted-foreground hover:text-foreground">
                Termini
              </Link>
              <Link to={createPageUrl("Privacy")} className="text-muted-foreground hover:text-foreground">
                Privacy (Ristoratori)
              </Link>
              <Link to={createPageUrl("Cookies")} className="text-muted-foreground hover:text-foreground">
                Cookie Policy
              </Link>
              <Link to={createPageUrl("PrivacyClienti")} className="text-muted-foreground hover:text-foreground">
                Privacy (Clienti)
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}