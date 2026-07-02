import { Core } from '@/api/integrations';
import { TechnicalSupport, ChatMessage } from '@/api/entities';

import React, { useState, useEffect, useRef } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// Badge is no longer used in the new UI, but kept imported as it might be used elsewhere.
import { MessageCircle, X, Send, Loader2 } from "lucide-react"; // Sparkles and ChefHat are no longer used in the new UI, but kept imported.
import { supabase } from '@/api/supabaseClient';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";

export default function ChatBot({ restaurant }) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [conversationId, setConversationId] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  const MONTHLY_LLM_MESSAGE_LIMIT = 100;
  const LLM_MAX_TOKENS = 250;
  const LLM_ONBOARDING_MAX_TOKENS = 140;

  const shouldUseLlmForMessage = (userMessage) => {
    const t = String(userMessage ?? '').toLowerCase().trim();
    if (!t) return false;

    const platformKeywords = [
      'ordinafacilefood',
      'dashboard',
      'ordini',
      'ordine',
      'menu',
      'categoria',
      'categorie',
      'prodotto',
      'prodotti',
      'modificatori',
      'allergeni',
      'promozioni',
      'promo',
      'coupon',
      'sconto',
      'eventi',
      'qr',
      'qrcode',
      'stampa',
      'stampante',
      'comande',
      'impostazioni',
      'orari',
      'consegna',
      'asporto',
      'abbonamento',
      'rinnovo',
      'sedi',
      'location',
      'pagamento',
      'paypal',
      'carta',
      'notifiche',
      'assistenza',
      'supporto',
      'errore',
      'bug',
    ];

    const offTopicKeywords = [
      'meteo',
      'tempo farà',
      'previsioni',
      'calcio',
      'borsa',
      'bitcoin',
      'oroscopo',
      'ricetta',
      'cucinare',
      'film',
      'serie',
      'traduci',
      'inglese',
      'matematica',
    ];

    if (offTopicKeywords.some((k) => t.includes(k))) return false;
    if (platformKeywords.some((k) => t.includes(k))) return true;
    return false;
  };

  const getFaqAssistantReply = (userMessage) => {
    const text = String(userMessage ?? "").toLowerCase();
    const includeRestaurantName = () => {
      const name = String(restaurant?.nome ?? "").trim();
      return name ? ` (${name})` : "";
    };

    const entries = [
      {
        match: (t) => /(menu|piatt\w*|prodot\w*|articol\w*|categor\w*|modificator\w*|allergen\w*)/i.test(t),
        reply: () =>
          `Perfetto! Per gestire il menu${includeRestaurantName()} vai su: Menu.\n\n1) Crea una categoria (es. Antipasti, Pizze)\n2) Aggiungi i prodotti\n3) Se ti servono opzioni (es. “senza glutine”, “extra mozzarella”), usa i modificatori\n4) Imposta allergeni e note\n\nSe mi dici cosa vuoi aggiungere (categoria o prodotto), ti guido passo-passo.`,
      },
      {
        match: (t) => /(ordin\w*|stat\w*|conferm\w*|prepar\w*|pront\w*|consegn\w*|annull\w*)/i.test(t),
        reply: () =>
          `Per gestire gli ordini${includeRestaurantName()} vai su: Ordini.\n\n- Nuovo: arriva l’ordine\n- Confermato: lo hai preso in carico\n- In preparazione: lo stai cucinando\n- Pronto: pronto per ritiro/consegna\n- Completato: consegnato\n\nDimmi che problema hai (es. non arrivano, stato non cambia) e lo risolviamo.`,
      },
      {
        match: (t) => /(orar\w*|apert\w*|chius\w*|turn\w*|fasci\w*)/i.test(t),
        reply: () =>
          `Per impostare orari e disponibilità${includeRestaurantName()} vai su: Impostazioni.\n\n- Compila gli orari di apertura per ogni giorno\n- Se hai più turni (es. 12:00-15:00, 19:00-23:00) inseriscili separati da virgola\n\nVuoi che ti dica un formato esempio per i tuoi orari?`,
      },
      {
        match: (t) => /(consegn\w*|asport\w*|pickup|delivery|zon\w*|distan\w*|costo\s+consegn\w*|spes\w*)/i.test(t),
        reply: () =>
          `Consegna e asporto${includeRestaurantName()} si configurano in: Impostazioni.\n\n- Attiva Consegna e/o Asporto\n- Imposta eventuali zone di consegna e costo consegna\n\nSe mi dici: città/zona e costo che vuoi applicare, ti suggerisco una configurazione semplice.`,
      },
      {
        match: (t) => /(promozion\w*|scont\w*|coupon\w*|codic\w*\s+scont\w*|offert\w*)/i.test(t),
        reply: () =>
          `Le promozioni${includeRestaurantName()} le trovi in: Promozioni.\n\nPuoi creare sconti con regole tipo:\n- Fasce orarie\n- Giorni specifici\n- Importo minimo\n\nDimmi che promo vuoi fare (es. -10% sopra 30€) e te la imposto in modo corretto.`,
      },
      {
        match: (t) => /(event\w*|qr\s*code|qrcode|\bqr\b|menu\s+event\w*)/i.test(t),
        reply: () =>
          `Per eventi e QR code${includeRestaurantName()} vai su: Eventi.\n\n1) Crea evento\n2) Associa un menu dedicato\n3) Genera/usa il QR per far ordinare da quella pagina\n\nChe tipo di evento stai facendo? (es. sagra, compleanno, menu fisso)`,
      },
      {
        match: (t) => /(stamp\w*|comand\w*|printer\w*|bluetooth|wi\s*-?\s*fi|wifi)/i.test(t),
        reply: () =>
          `Per la stampa comande${includeRestaurantName()} vai su: Stampa Comande.\n\n- Aggiungi/configura la stampante\n- Fai una prova di stampa\n\nDimmi modello stampante e connessione (WiFi/Bluetooth) e ti dico cosa impostare.`,
      },
      {
        match: (t) => /(abbon\w*|rinn\w*|scaden\w*|pian\w*|pagament\w*|fattur\w*)/i.test(t),
        reply: () =>
          `Abbonamenti${includeRestaurantName()}: puoi vedere piano e scadenza nella sezione Abbonamenti/Rinnovo.\n\nSe vuoi aggiungere una sede extra, ricorda che costa il 50% del piano base.\n\nDimmi cosa devi fare: rinnovo, cambio piano o aggiunta sede?`,
      },
      {
        match: (t) => /(sed\w*|location\w*|filial\w*|punto\s+vendit\w*)/i.test(t),
        reply: () =>
          `Per gestire più sedi${includeRestaurantName()} vai su: Sedi.\n\n- Crea la nuova sede\n- Imposta orari e zone\n- Collega menu (se necessario)\n\nVuoi una sede con menu identico o diverso rispetto alla principale?`,
      },
      {
        match: (t) => /(assistenz\w*|support\w*|help|problem\w*|error\w*)/i.test(t),
        reply: () =>
          `Dimmi cosa succede e in che pagina.\n\nSe puoi, incolla qui:\n- il testo dell’errore\n- cosa stavi facendo\n\nE lo sistemiamo insieme.`,
      },
    ];

    for (const e of entries) {
      if (e.match(text)) return e.reply();
    }

    return `Non ho capito al volo.\n\nPuoi scegliere uno di questi temi?\n- Menu\n- Ordini\n- Orari\n- Consegna/Asporto\n- Promozioni\n- Eventi/QR\n- Stampa comande\n- Abbonamenti\n\nDimmi anche in che pagina sei e ti guido passo-passo.`;
  };

  const { data: messages = [] } = useQuery({
    queryKey: ['chat-messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      return ChatMessage.filter(
        { conversazione_id: conversationId },
        "created_date"
      );
    },
    enabled: !!conversationId,
    initialData: [],
  });

  useEffect(() => {
    // If chat is opened and no conversation ID exists, create one.
    // This ensures a new conversation is started when the chat window is first opened.
    if (isOpen && !conversationId) {
      setConversationId(`conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
    }
  }, [isOpen, conversationId]); // Added conversationId to dependencies to prevent infinite loop on first open.

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]); // Scroll to bottom when messages or typing status changes

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const sendMessageMutation = useMutation({
    mutationFn: async ({ userMessage, convId }) => {
      const user = (await supabase.auth.getUser()).data.user;

      if (!user?.id) {
        const msg = "Per usare la chat devi prima effettuare l'accesso.";
        queryClient.setQueryData(['chat-messages', convId], (prev = []) => ([
          ...prev,
          { tipo: 'assistant', contenuto: msg }
        ]));
        return msg;
      }
      
      // Save user message
      await ChatMessage.create({
        user_id: user.id,
        restaurant_id: restaurant?.id,
        tipo: "user",
        contenuto: userMessage,
        conversazione_id: convId
      });

      if (!shouldUseLlmForMessage(userMessage)) {
        const t = String(userMessage ?? '').toLowerCase().trim();
        const isGreeting = /^(ciao|salve|buongiorno|buonasera|hey|ehi|aiuto)(\b|!|\.|,|\s)*$/i.test(t);

        if (isGreeting) {
          try {
            const { count: convUserCount, error: convCountError } = await supabase
              .from('chat_messages')
              .select('id', { count: 'exact', head: true })
              .eq('conversazione_id', convId)
              .eq('tipo', 'user');

            if (!convCountError && (convUserCount ?? 0) <= 1) {
              const restaurantName = String(restaurant?.nome ?? '').trim();
              const onboardingPrompt = [
                "Sei Chef Virtuale, assistente per ristoratori che usano OrdinaFacile.food.",
                "L'utente ha scritto un saluto generico.",
                "Rispondi con un benvenuto breve e poi fai 1 domanda per capire cosa serve.",
                "Proponi 5 opzioni numerate, tutte relative alla piattaforma: (1) Menu (2) Ordini (3) Promozioni (4) Impostazioni (5) Stampa.",
                "Non rispondere a domande fuori piattaforma.",
                restaurantName ? `Ristorante: ${restaurantName}` : null,
              ].filter(Boolean).join("\n");

              const llmResponse = await Core.InvokeLLM({
                prompt: onboardingPrompt,
                max_tokens: LLM_ONBOARDING_MAX_TOKENS,
              });

              const looksLikeError =
                typeof llmResponse === 'string' &&
                /^\s*Errore\s*IA\s*:/i.test(llmResponse);

              const onboardingMsg =
                (typeof llmResponse === 'string' && llmResponse.trim() && !looksLikeError)
                  ? llmResponse
                  : "Ciao! Posso aiutarti su OrdinaFacile.food. Su cosa ti serve una mano? (Menu, Ordini, Promozioni, Impostazioni, Stampa)";

              await ChatMessage.create({
                user_id: user.id,
                restaurant_id: restaurant?.id,
                tipo: "assistant",
                contenuto: onboardingMsg,
                conversazione_id: convId
              });
              return onboardingMsg;
            }
          } catch (e) {
            console.warn('[ChatBot] Onboarding LLM failed:', e);
          }
        }

        const msg = "Io posso aiutarti solo con domande sulla piattaforma OrdinaFacile.food (menu, ordini, promozioni, impostazioni, stampa, abbonamenti, ecc.).\n\nDimmi in che sezione sei e cosa stai cercando di fare.";
        await ChatMessage.create({
          user_id: user.id,
          restaurant_id: restaurant?.id,
          tipo: "assistant",
          contenuto: msg,
          conversazione_id: convId
        });
        return msg;
      }

      const restaurantId = restaurant?.id;
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      if (restaurantId) {
        const { count, error: countError } = await supabase
          .from('chat_messages')
          .select('id', { count: 'exact', head: true })
          .eq('restaurant_id', restaurantId)
          .eq('tipo', 'user')
          .gte('created_at', startOfMonth.toISOString());

        if (countError) {
          console.warn('[ChatBot] Unable to count monthly messages:', countError);
        } else if ((count ?? 0) >= MONTHLY_LLM_MESSAGE_LIMIT) {
          const marker = '[AUTO_CHATBOT_LIMIT_REACHED]';

          try {
            const { data: existing, error: existingError } = await supabase
              .from('support_requests')
              .select('id')
              .eq('restaurant_id', restaurantId)
              .eq('stato', 'aperta')
              .ilike('descrizione', `%${marker}%`)
              .gte('created_at', startOfMonth.toISOString())
              .limit(1);

            if (existingError) {
              console.warn('[ChatBot] Unable to check existing auto support request:', existingError);
            }

            const alreadyOpened = Array.isArray(existing) && existing.length > 0;
            if (!alreadyOpened) {
              const nomeContatto = user?.user_metadata?.full_name || user?.email || '';
              const emailContatto = user?.email || '';
              const telefonoContatto = restaurant?.telefono || '';

              await TechnicalSupport.create({
                restaurant_id: restaurantId,
                user_id: user.id,
                stato: 'aperta',
                nome_contatto: nomeContatto,
                email_contatto: emailContatto,
                telefono_contatto: telefonoContatto,
                disponibilita_oraria: '',
                screenshot_urls: [],
                descrizione: `${marker}\n\nSuperata soglia chatbot: ${MONTHLY_LLM_MESSAGE_LIMIT} messaggi utente nel mese corrente.\n\nUltimo messaggio: ${String(userMessage ?? '').trim()}`,
              });
            }
          } catch (e) {
            console.warn('[ChatBot] Unable to create auto support request:', e);
          }

          const msg = `Hai superato ${MONTHLY_LLM_MESSAGE_LIMIT} messaggi questo mese.\n\nHo aperto automaticamente una richiesta di assistenza: ti contatteremo per aiutarti direttamente.\n\nPer riprovare con l’IA: attendi il mese prossimo.`;
          await ChatMessage.create({
            user_id: user.id,
            restaurant_id: restaurantId,
            tipo: "assistant",
            contenuto: msg,
            conversazione_id: convId
          });
          return msg;
        }
      }

      const restaurantName = String(restaurant?.nome ?? '').trim();
      const restaurantCity = String(restaurant?.citta ?? '').trim();

      const shortPrompt = [
        "Sei Chef Virtuale, assistente per ristoratori che usano OrdinaFacile.food.",
        "Parla in italiano, tono pratico e amichevole.",
        "Dai istruzioni passo-passo e indica sempre la sezione dell'app (Dashboard, Ordini, Storico, Menu, Sedi, Eventi, Promozioni, Impostazioni, Stampa, Abbonamenti).",
        "Se mancano informazioni, fai 1-2 domande mirate prima di suggerire soluzioni.",
        restaurantName ? `Ristorante: ${restaurantName}${restaurantCity ? ` (${restaurantCity})` : ''}` : null,
        "Domanda:",
        String(userMessage ?? '').trim(),
      ].filter(Boolean).join("\n");

      const llmResponse = await Core.InvokeLLM({
        prompt: shortPrompt,
        max_tokens: LLM_MAX_TOKENS,
      });

      const looksLikeError =
        typeof llmResponse === 'string' &&
        /^\s*Errore\s*IA\s*:/i.test(llmResponse);

      const safeAiResponse =
        (typeof llmResponse === 'string' && llmResponse.trim() && !looksLikeError)
          ? llmResponse
          : getFaqAssistantReply(userMessage);

      // Save AI response
      await ChatMessage.create({
        user_id: user.id,
        restaurant_id: restaurant?.id,
        tipo: "assistant",
        contenuto: safeAiResponse,
        conversazione_id: convId
      });

      return safeAiResponse;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', variables?.convId] });
      setIsTyping(false);
    },
    onError: (error, variables) => {
      console.error("Errore chat:", error);
      setIsTyping(false);
      // Mostra comunque un messaggio in chat per non lasciare l'utente senza risposta.
      const fallback = `Errore: ${error?.message ?? 'impossibile ottenere una risposta in questo momento.'}`;
      queryClient.setQueryData(['chat-messages', variables?.convId], (prev = []) => ([
        ...prev,
        { tipo: 'assistant', contenuto: fallback }
      ]));
    }
  });

  const handleSend = (e) => {
    e.preventDefault(); // Prevent form default submission for full page reload
    if (!message.trim()) return;

    // Ensure we always have a conversation id before saving messages.
    const convId = conversationId || `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    if (!conversationId) setConversationId(convId);
    
    setIsTyping(true);
    sendMessageMutation.mutate({ userMessage: message, convId });
    setMessage("");
  };

  // The suggestedQuestions array is no longer used in the updated UI for initial message display.
  // Keeping it here in case it's planned for future use or if a different initial state will utilize it.
  const quickSuggestions = [
    "Come creo una nuova categoria?",
    "Come imposto le zone di consegna?",
    "Come funzionano le promozioni?",
    "Come creo un evento speciale?",
    "Come attivo la stampa automatica?",
    "Come rinnovo l'abbonamento?",
    "Come aggiungo una nuova sede?",
    "Come personalizzo la pagina menu?"
  ];

  return (
    <>
      {/* Floating Button with Chef Avatar - Mobile Friendly */}
      {/* This button toggles the chat window open/close. It's always rendered. */}
      <motion.button
        className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 bg-gradient-to-br from-red-500 to-red-600 text-white p-3 md:p-4 rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300"
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {isOpen ? (
          <X className="w-5 h-5 md:w-6 md:h-6" /> // Show 'X' icon when chat is open
        ) : (
          <div className="relative">
            <MessageCircle className="w-5 h-5 md:w-6 md:h-6" /> {/* Show Message icon when chat is closed */}
            <motion.div
              className="absolute -top-1 -right-1 w-2 h-2 md:w-3 md:h-3 bg-green-400 rounded-full"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
          </div>
        )}
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            // Responsive positioning and sizing for mobile/tablet
            className="fixed bottom-36 right-4 md:bottom-40 md:right-6 z-40 w-[calc(100vw-2rem)] sm:w-96 max-w-md"
          >
            <Card className="shadow-2xl border-2 border-red-200 overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-red-500 to-red-600 p-3 md:p-4 text-white">
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-background rounded-full flex items-center justify-center">
                      <span className="text-base md:text-lg font-semibold text-foreground">AI</span>
                    </div>
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 md:w-3 md:h-3 bg-green-400 border-2 border-white rounded-full"></div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-base md:text-lg">Chef Virtuale</h3>
                    <p className="text-xs md:text-sm text-red-100">Il tuo assistente personale</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-white hover:bg-background/20 p-1"
                    onClick={() => setIsOpen(false)}
                  >
                    <X className="w-4 h-4 md:w-5 md:h-5" />
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <div className="h-[50vh] sm:h-96 overflow-y-auto p-3 md:p-4 bg-muted space-y-3 md:space-y-4">
                {messages.length === 0 && (
                  <div className="text-center py-6 md:py-8">
                    <div className="text-4xl md:text-5xl mb-3 md:mb-4">AI</div>
                    <p className="text-sm md:text-base text-muted-foreground mb-2">Ciao! Sono lo Chef Virtuale!</p>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      Chiedimi qualsiasi cosa su come usare OrdinaFacile.food!
                    </p>
                  </div>
                )}

                {messages.map((msg, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-2 md:gap-3 ${msg.tipo === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <div className={`flex-shrink-0 w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center ${
                      msg.tipo === 'user' ? 'bg-red-500' : 'bg-background border-2 border-red-200'
                    }`}>
                      {msg.tipo === 'user' ? (
                        <span className="text-white text-xs md:text-sm">TU</span>
                      ) : (
                        <span className="text-base md:text-lg">AI</span>
                      )}
                    </div>
                    <div className={`flex-1 ${msg.tipo === 'user' ? 'text-right' : ''}`}>
                      <div className={`inline-block p-2 md:p-3 rounded-lg text-xs md:text-sm max-w-[85%] md:max-w-xs ${
                        msg.tipo === 'user'
                          ? 'bg-red-500 text-white'
                          : 'bg-background border border-border'
                      }`}>
                        <p className="whitespace-pre-wrap">{msg.contenuto}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}

                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex gap-2 md:gap-3"
                  >
                    <div className="w-7 h-7 md:w-8 md:h-8 bg-background border-2 border-red-200 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-base md:text-lg">AI</span>
                    </div>
                    <div className="bg-background border border-border p-2 md:p-3 rounded-lg">
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-3 md:p-4 bg-background border-t border-border">
                <form onSubmit={handleSend} className="flex gap-2"> {/* Changed to handleSend */}
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Scrivi qui..."
                    disabled={isTyping}
                    className="flex-1 text-sm md:text-base"
                    // Removed onKeyPress, as form onSubmit handles Enter key
                  />
                  <Button
                    type="submit" // Set type to submit for form submission
                    disabled={!message.trim() || isTyping}
                    className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white flex-shrink-0 px-3 md:px-4"
                  >
                    {isTyping ? (
                      <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 md:w-5 md:h-5" />
                    )}
                  </Button>
                </form>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
