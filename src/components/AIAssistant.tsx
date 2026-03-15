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
    const newMessages = [...messages, userMessage];
    
    // Save user message to history
    const historyRef = collection(db, `users/${auth.currentUser.uid}/chat_history`);
    await setDoc(doc(historyRef), { ...userMessage, timestamp: serverTimestamp() });

    setInput('');
    setIsLoading(true);

    try {
      const responseText = await sendMessageToGemini(messages, input.trim(), {
        foods,
        userPreferences: userProfile?.preferences,
        dietGoals: userProfile?.goals
      });

      const assistantMessage: ChatMessage = { role: 'model', parts: [{ text: responseText }] };
      
      // Save assistant response to history
      await setDoc(doc(historyRef), { ...assistantMessage, timestamp: serverTimestamp() });
    } catch (error) {
      console.error('Errore chat AI:', error);
      const errorMessage: ChatMessage = { role: 'model', parts: [{ text: "Scusa, si è verificato un errore nella connessione con l'AI. Verifica la tua chiave API." }] };
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
        <span className="absolute -top-2 -right-2 bg-accent-500 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-tighter">AI</span>
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed inset-0 sm:inset-auto sm:bottom-24 sm:right-6 sm:w-[450px] sm:h-[650px] bg-white sm:rounded-3xl shadow-2xl flex flex-col z-50 border border-sage-200 overflow-hidden animate-in slide-in-from-bottom-10">
          {/* Header */}
          <div className="p-4 bg-primary-600 text-white flex items-center justify-between shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                <Sparkles className="w-6 h-6 text-accent-300" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Assistente Nutrizionale</h3>
                <div className="flex items-center space-x-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  <span className="text-[10px] text-primary-100 uppercase font-semibold">Online • Gemini Pro</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button onClick={clearHistory} className="p-2 hover:bg-white/10 rounded-lg" title="Cancella cronologia">
                <Trash2 className="w-5 h-5" />
              </button>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Context Info (Optional) */}
          <div className="bg-sage-50 px-4 py-2 border-b border-sage-100 flex items-center justify-between text-[11px] text-sage-500 font-medium">
            <div className="flex items-center space-x-2">
              <Info className="w-3 h-3" />
              <span>Contesto: {foods.length} alimenti disponibili</span>
            </div>
          </div>

          {/* Messages */}
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-4 bg-sage-50/30 scroll-smooth"
          >
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                <div className="bg-primary-100 p-6 rounded-3xl">
                  <Bot className="w-12 h-12 text-primary-600" />
                </div>
                <h4 className="text-xl font-bold text-sage-900">Ciao! Sono il tuo assistente AI</h4>
                <p className="text-sm text-sage-600 leading-relaxed">
                  Posso aiutarti a pianificare i pasti, bilanciare i macronutrienti o suggerirti ricette basate sui tuoi alimenti preferiti.
                </p>
                <div className="grid grid-cols-2 gap-2 w-full pt-4">
                  <button onClick={() => setInput("Suggeriscimi un pranzo proteico")} className="text-xs p-3 bg-white border border-sage-200 rounded-xl hover:border-primary-500 hover:text-primary-600 transition-all text-left">
                    "Suggeriscimi un pranzo proteico"
                  </button>
                  <button onClick={() => setInput("Crea una dieta settimanale")} className="text-xs p-3 bg-white border border-sage-200 rounded-xl hover:border-primary-500 hover:text-primary-600 transition-all text-left">
                    "Crea una dieta settimanale"
                  </button>
                </div>
              </div>
            )}
            
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex max-w-[85%] space-x-2 ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : 'flex-row'}`}>
                  <div className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center shadow-sm ${msg.role === 'user' ? 'bg-accent-500 text-white' : 'bg-primary-600 text-white'}`}>
                    {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <div className={`p-4 rounded-2xl shadow-sm text-sm leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-accent-500 text-white rounded-tr-none' 
                      : 'bg-white border border-sage-200 text-sage-800 rounded-tl-none'
                  }`}>
                    {msg.parts[0].text.split('\n').map((line, i) => (
                      <React.Fragment key={i}>
                        {line}
                        <br />
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex max-w-[85%] space-x-2">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-xl flex items-center justify-center shadow-sm">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="bg-white border border-sage-200 p-4 rounded-2xl rounded-tl-none shadow-sm">
                    <Loader2 className="w-5 h-5 animate-spin text-primary-600" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-4 bg-white border-t border-sage-200">
            <div className="flex items-center space-x-2 bg-sage-50 rounded-2xl p-2 border border-sage-200 focus-within:ring-2 focus-within:ring-primary-500 transition-all">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Chiedi all'AI..."
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm px-2 text-sage-800"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="bg-primary-600 text-white p-2 rounded-xl hover:bg-primary-700 disabled:opacity-50 transition-all"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <p className="text-[9px] text-center text-sage-400 mt-2 uppercase font-bold tracking-widest">
              Alimentato da Gemini AI • I consigli non sostituiscono un medico
            </p>
          </div>
        </div>
      )}
    </>
  );
};
