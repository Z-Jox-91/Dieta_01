import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, User, Trash2, Loader2, Sparkles, Save, Info, X } from 'lucide-react';
import { sendMessageToGemini, ChatMessage } from '../utils/gemini';
import { db, auth } from '../firebase';
import { collection, getDocs, doc, setDoc, query, orderBy, onSnapshot, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { FoodItem } from './Foods';

export const AIAssistant: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Carica database alimenti e profilo utente per il contesto
  useEffect(() => {
    if (!auth.currentUser) return;

    // Foods
    const qFoods = query(collection(db, 'alimenti'), orderBy('name', 'asc'));
    const unsubscribeFoods = onSnapshot(qFoods, (snapshot) => {
      setFoods(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as FoodItem));
    });

    // User Profile
    const userRef = doc(db, 'users', auth.currentUser.uid);
    const unsubscribeUser = onSnapshot(userRef, (doc) => {
      if (doc.exists()) setUserProfile(doc.data());
    });

    // Chat History
    const qChat = query(
      collection(db, `users/${auth.currentUser.uid}/chat_history`),
      orderBy('timestamp', 'asc')
    );
    const unsubscribeChat = onSnapshot(qChat, (snapshot) => {
      const history = snapshot.docs.map(doc => ({
        role: doc.data().role,
        parts: doc.data().parts
      } as ChatMessage));
      setMessages(history);
    });

    return () => {
      unsubscribeFoods();
      unsubscribeUser();
      unsubscribeChat();
    };
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || !auth.currentUser) return;

    const userMessage: ChatMessage = { role: 'user', parts: [{ text: input.trim() }] };
    
    // Mostra immediatamente il messaggio dell'utente nello state locale per reattività
    setMessages(prev => [...prev, userMessage]);
    
    const currentInput = input.trim();
    setInput('');
    setIsLoading(true);

    try {
      // Salva il messaggio dell'utente su Firestore
      const historyRef = collection(db, `users/${auth.currentUser.uid}/chat_history`);
      await setDoc(doc(historyRef), { 
        role: 'user', 
        parts: [{ text: currentInput }], 
        timestamp: serverTimestamp() 
      });

      const responseText = await sendMessageToGemini(messages, currentInput, {
        foods,
        userPreferences: userProfile?.preferences,
        dietGoals: userProfile?.goals
      });

      const assistantMessage: ChatMessage = { role: 'model', parts: [{ text: responseText }] };
      
      // Salva la risposta dell'assistente su Firestore
      await setDoc(doc(historyRef), { 
        role: 'model', 
        parts: [{ text: responseText }], 
        timestamp: serverTimestamp() 
      });
    } catch (error) {
      console.error('Errore chat AI:', error);
      const errorMessage: ChatMessage = { role: 'model', parts: [{ text: "Scusa, si è verificato un errore nella connessione con l'AI. Verifica la tua chiave API o la connessione internet." }] };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearHistory = async () => {
    if (!auth.currentUser) return;
    if (confirm('Vuoi davvero cancellare tutta la cronologia della chat?')) {
      const historyRef = collection(db, `users/${auth.currentUser.uid}/chat_history`);
      const snapshot = await getDocs(historyRef);
      const batch = snapshot.docs.map(d => deleteDoc(d.ref));
      await Promise.all(batch);
      setMessages([]);
    }
  };

  return (
    <>
      {/* FAB Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-primary-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-primary-700 transition-all z-50 animate-bounce"
        style={{ animationDuration: '3s' }}
      >
        <Bot className="w-8 h-8" />
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed inset-0 sm:inset-auto sm:bottom-24 sm:right-6 sm:w-[450px] sm:h-[650px] bg-white dark:bg-surface-dark sm:rounded-3xl shadow-2xl flex flex-col z-50 border border-sage-200 dark:border-sage-800 overflow-hidden animate-in slide-in-from-bottom-10">
          {/* Header */}
          <div className="p-4 bg-primary-600 dark:bg-primary-700 text-white flex items-center justify-between shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                <Sparkles className="w-6 h-6 text-accent-300" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Assistente Nutrizionale</h3>
                <div className="flex items-center space-x-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Online</span>
                </div>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Messages */}
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-4 bg-sage-50/30 dark:bg-surface-container-dark/30 scroll-smooth"
          >
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                <div className="bg-primary-100 dark:bg-primary-900/30 p-6 rounded-3xl">
                  <Bot className="w-12 h-12 text-primary-600 dark:text-primary-400" />
                </div>
                <h4 className="text-xl font-bold text-sage-900 dark:text-sage-100">Ciao! Sono il tuo assistente</h4>
                <p className="text-sm text-sage-600 dark:text-sage-400 leading-relaxed">
                  Posso aiutarti a pianificare i pasti, bilanciare i macronutrienti o suggerirti ricette basate sui tuoi alimenti preferiti.
                </p>
                <div className="grid grid-cols-2 gap-2 w-full pt-4">
                  <button onClick={() => setInput("Suggeriscimi un pranzo proteico")} className="text-xs p-3 bg-white dark:bg-surface-dark border border-sage-200 dark:border-sage-800 rounded-xl hover:border-primary-500 hover:text-primary-600 dark:hover:text-primary-400 transition-all text-left text-sage-700 dark:text-sage-300">
                    "Suggeriscimi un pranzo proteico"
                  </button>
                  <button onClick={() => setInput("Crea una dieta settimanale")} className="text-xs p-3 bg-white dark:bg-surface-dark border border-sage-200 dark:border-sage-800 rounded-xl hover:border-primary-500 hover:text-primary-600 dark:hover:text-primary-400 transition-all text-left text-sage-700 dark:text-sage-300">
                    "Crea una dieta settimanale"
                  </button>
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                <div className={`flex items-start space-x-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : 'flex-row'}`}>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${
                    msg.role === 'user' ? 'bg-accent-500 text-white' : 'bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400'
                  }`}>
                    {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <div className={`p-3 rounded-2xl text-sm shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-accent-500 text-white rounded-tr-none' 
                      : 'bg-white dark:bg-surface-container-dark text-sage-800 dark:text-sage-200 border border-sage-100 dark:border-sage-800 rounded-tl-none'
                  }`}>
                    {msg.parts[0].text}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start animate-pulse">
                <div className="flex items-center space-x-2 bg-white dark:bg-surface-container-dark p-3 rounded-2xl rounded-tl-none border border-sage-100 dark:border-sage-800">
                  <Loader2 className="w-4 h-4 text-primary-500 animate-spin" />
                  <span className="text-xs text-sage-500">Sto pensando...</span>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 bg-white dark:bg-surface-dark border-t border-sage-200 dark:border-sage-800">
            <div className="flex items-center space-x-2 bg-sage-50 dark:bg-surface-container-dark p-2 rounded-2xl border border-sage-200 dark:border-sage-800">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Chiedi supporto..."
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm px-2 text-sage-800 dark:text-sage-200"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="bg-primary-600 dark:bg-primary-500 text-white p-2 rounded-xl hover:bg-primary-700 dark:hover:bg-primary-600 disabled:opacity-50 transition-all"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <p className="text-[9px] text-center text-sage-400 dark:text-sage-500 mt-2 uppercase font-bold tracking-widest">
              Powered by Gemini • I consigli non sostituiscono un medico
            </p>
          </div>
        </div>
      )}
    </>
  );
};
