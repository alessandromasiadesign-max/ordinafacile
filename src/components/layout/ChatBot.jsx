
import React, { useState, useEffect, useRef } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// Badge is no longer used in the new UI, but kept imported as it might be used elsewhere.
import { MessageCircle, X, Send, Loader2 } from "lucide-react"; // Sparkles and ChefHat are no longer used in the new UI, but kept imported.
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";

export default function ChatBot({ restaurant }) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [conversationId, setConversationId] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: messages = [] } = useQuery({
    queryKey: ['chat-messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      return base44.entities.ChatMessage.filter(
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
    mutationFn: async (userMessage) => {
      const user = await base44.auth.me();
      
      // Save user message
      await base44.entities.ChatMessage.create({
        user_id: user.id,
        restaurant_id: restaurant?.id,
        tipo: "user",
        contenuto: userMessage,
        conversazione_id: conversationId
      });

      // Construct AI prompt with updated persona name "Chef Virtuale"
      const contextPrompt = `
Sei Chef Virtuale, un simpatico cuoco italiano cicciottello ed esperto della piattaforma OrdinaFacile! 🧑‍🍳

PERSONALITÀ:
- Sei allegro, amichevole e usi spesso emoji
- Parli in modo semplice e caloroso, come un vero chef italiano
- Usi espressioni come "Mamma mia!", "Perfetto!", "Bellissimo!"
- Sei paziente e ami spiegare le cose passo-passo
- Quando qualcosa va bene dici "🤌 Fantastico!"

FUNZIONALITÀ DELLA PIATTAFORMA:
1. 📊 Dashboard: Panoramica ordini, incassi e statistiche in tempo reale
2. 🍕 Ordini: Gestione ordini con cambio stato (nuovo → confermato → in preparazione → pronto → consegnato)
3. 📈 Storico: Download, stampa e grafici degli ordini passati
4. 🍝 Menu: Crea categorie, prodotti con modificatori e allergeni
5. 🏢 Sedi: Gestisci più sedi con menu personalizzati (serve abbonamento extra 50% del piano base)
6. 🎉 Eventi: Menu speciali per eventi con QR code dedicati
7. 🎁 Promozioni: Sconti con regole avanzate (orari, giorni, cumulabilità)
8. ⚙️ Impostazioni: Personalizza colori, logo, sfondo, zone consegna, orari
9. 🖨️ Stampa: Stampa automatica comande via WiFi/Bluetooth
10. 💳 Abbonamenti: Sistema con notifiche 15gg prima della scadenza

INFO RISTORANTE:
${restaurant ? `
- 🍽️ Nome: ${restaurant.nome}
- 📍 Città: ${restaurant.citta || 'Non specificata'}
- 🚚 Modalità: ${restaurant.modalita_consegna?.join(', ') || 'Non configurate'}
- 🍴 Tipo: ${restaurant.tipo_cucina || 'Non specificato'}
- 💎 Abbonamento: ${restaurant.abbonamento_tipo || 'Non attivo'}
- 📅 Scadenza: ${restaurant.abbonamento_scadenza || 'Non impostata'}
` : '🤷 Nessun ristorante configurato'}

DOMANDA UTENTE:
${userMessage}

ISTRUZIONI RISPOSTA:
- Inizia con un saluto caloroso e emoji
- Spiega in modo semplice e pratico
- Usa emoji pertinenti (🍕🍝🎉📱💡✅)
- Termina sempre in modo positivo
- Se non sai qualcosa, dillo onestamente ma resta positivo
- Se parla di abbonamenti, ricorda: sede extra costa 50% del piano base
- Per problemi tecnici, suggerisci di verificare impostazioni o contattare supporto

Rispondi come Chef Virtuale:`; // Updated persona name

      // Invoke LLM for AI response
      const aiResponse = await base44.integrations.Core.InvokeLLM({
        prompt: contextPrompt,
        add_context_from_internet: false
      });

      // Save AI response
      await base44.entities.ChatMessage.create({
        user_id: user.id,
        restaurant_id: restaurant?.id,
        tipo: "assistant",
        contenuto: aiResponse,
        conversazione_id: conversationId
      });

      return aiResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
      setIsTyping(false);
    },
    onError: (error) => {
      console.error("Errore chat:", error);
      setIsTyping(false);
      alert("Ops! Qualcosa è andato storto...");
    }
  });

  const handleSend = (e) => {
    e.preventDefault(); // Prevent form default submission for full page reload
    if (!message.trim()) return;
    
    setIsTyping(true);
    sendMessageMutation.mutate(message);
    setMessage("");
  };

  // The suggestedQuestions array is no longer used in the updated UI for initial message display.
  // Keeping it here in case it's planned for future use or if a different initial state will utilize it.
  const suggestedQuestions = [
    "🍕 Come creo una nuova categoria?",
    "🚚 Come imposto le zone di consegna?",
    "🎁 Come funzionano le promozioni?",
    "🎉 Come creo un evento speciale?",
    "🖨️ Come attivo la stampa automatica?",
    "💳 Come rinnovo l'abbonamento?",
    "🏢 Come aggiungo una nuova sede?",
    "🎨 Come personalizzo la pagina menu?"
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
            className="fixed bottom-20 right-4 md:bottom-24 md:right-6 z-40 w-[calc(100vw-2rem)] sm:w-96 max-w-md"
          >
            <Card className="shadow-2xl border-2 border-red-200 overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-red-500 to-red-600 p-3 md:p-4 text-white">
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-full flex items-center justify-center">
                      <span className="text-2xl md:text-3xl">👨‍🍳</span>
                    </div>
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 md:w-3 md:h-3 bg-green-400 border-2 border-white rounded-full"></div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-base md:text-lg">Chef Virtuale</h3>
                    <p className="text-xs md:text-sm text-red-100">Il tuo assistente personale 🔥</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-white hover:bg-white/20 p-1"
                    onClick={() => setIsOpen(false)}
                  >
                    <X className="w-4 h-4 md:w-5 md:h-5" />
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <div className="h-[50vh] sm:h-96 overflow-y-auto p-3 md:p-4 bg-gray-50 space-y-3 md:space-y-4">
                {messages.length === 0 && (
                  <div className="text-center py-6 md:py-8">
                    <div className="text-4xl md:text-5xl mb-3 md:mb-4">👨‍🍳</div>
                    <p className="text-sm md:text-base text-gray-600 mb-2">Ciao! Sono lo Chef Virtuale!</p>
                    <p className="text-xs md:text-sm text-gray-500">
                      Chiedimi qualsiasi cosa su come usare OrdinaFacile!
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
                      msg.tipo === 'user' ? 'bg-red-500' : 'bg-white border-2 border-red-200'
                    }`}>
                      {msg.tipo === 'user' ? (
                        <span className="text-white text-xs md:text-sm">👤</span>
                      ) : (
                        <span className="text-base md:text-lg">👨‍🍳</span>
                      )}
                    </div>
                    <div className={`flex-1 ${msg.tipo === 'user' ? 'text-right' : ''}`}>
                      <div className={`inline-block p-2 md:p-3 rounded-lg text-xs md:text-sm max-w-[85%] md:max-w-xs ${
                        msg.tipo === 'user'
                          ? 'bg-red-500 text-white'
                          : 'bg-white border border-gray-200'
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
                    <div className="w-7 h-7 md:w-8 md:h-8 bg-white border-2 border-red-200 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-base md:text-lg">👨‍🍳</span>
                    </div>
                    <div className="bg-white border border-gray-200 p-2 md:p-3 rounded-lg">
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-3 md:p-4 bg-white border-t">
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
                    className="bg-red-600 hover:bg-red-700 flex-shrink-0 px-3 md:px-4"
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
