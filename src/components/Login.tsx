import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, User } from 'lucide-react';

interface LoginProps {
  onLogin: (user: { name: string; email: string; password: string }) => Promise<void>;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    name: 'Test User',
    email: 'test@example.com',
    password: 'test123456'
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    console.log('Form inviato con dati:', formData);
    console.log('Stato isLoading prima del submit:', isLoading);
    console.log('Evento form submit intercettato correttamente');
    
    if (formData.name.trim() && formData.email.trim() && formData.password.trim()) {
      console.log('Validazione superata, dati del form:', {
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: '***' // Non loggare la password per sicurezza
      });
      try {
        setIsLoading(true);
        console.log('Tentativo di login in corso...');
        console.log('Chiamata a onLogin con:', formData);
        const loginResult = await onLogin(formData);
        console.log('Login completato con successo, risultato:', loginResult);
      } catch (err: any) {
        // Gestione degli errori specifici di Firebase
        let errorMessage = 'Errore durante l\'accesso. Riprova più tardi.';
        console.error('Errore durante il login:', err);
        
        if (err.code) {
          switch (err.code) {
            case 'auth/invalid-email':
              errorMessage = 'Indirizzo email non valido.';
              break;
            case 'auth/user-disabled':
              errorMessage = 'Questo account è stato disabilitato.';
              break;
            case 'auth/wrong-password':
              errorMessage = 'Password non corretta.';
              break;
            case 'auth/email-already-in-use':
              errorMessage = 'Questo indirizzo email è già in uso.';
              break;
            case 'auth/weak-password':
              errorMessage = 'La password deve contenere almeno 6 caratteri.';
              break;
            case 'auth/network-request-failed':
              errorMessage = 'Problema di connessione. Verifica la tua connessione internet.';
              break;
          }
        }
        
        setError(errorMessage);
        console.error('Errore di login:', err);
      } finally {
        setIsLoading(false);
      }
    } else {
      console.log('Validazione fallita:', {
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password.trim() ? '***' : 'vuoto'
      });
      setError('Tutti i campi sono obbligatori.');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8 sm:mt-16 animate-fade-in px-4 sm:px-0">
      <div className="md3-card p-6 sm:p-10 border border-sage-200 dark:border-sage-800">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-primary-600 dark:bg-primary-500 rounded-md3-medium mx-auto mb-6 flex items-center justify-center shadow-md3-3">
            <Lock className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-black text-sage-900 dark:text-sage-50 mb-2 tracking-tight">Bilanciamo AI</h2>
          <p className="text-sage-600 dark:text-sage-400 font-medium">La tua nutrizione, semplificata dall'AI</p>
        </div>

        {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md3-small p-4 mb-6 text-red-700 dark:text-red-300 text-sm font-medium animate-shake">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
          <div className="space-y-1.5">
            <label className="block text-sm font-bold text-sage-700 dark:text-sage-300 ml-1">
              Nome completo
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full pl-12 pr-4 py-4 bg-sage-50 dark:bg-surface-container-dark border-none rounded-md3-small focus:ring-2 focus:ring-primary-500 transition-all text-sage-900 dark:text-sage-50"
                placeholder="Il tuo nome"
                autoComplete="new-name"
                required
              />
              <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-sage-400" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-bold text-sage-700 dark:text-sage-300 ml-1">
              Email
            </label>
            <div className="relative">
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full pl-12 pr-4 py-4 bg-sage-50 dark:bg-surface-container-dark border-none rounded-md3-small focus:ring-2 focus:ring-primary-500 transition-all text-sage-900 dark:text-sage-50"
                placeholder="email@esempio.com"
                autoComplete="new-email"
                required
              />
              <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-sage-400" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-bold text-sage-700 dark:text-sage-300 ml-1">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full pl-12 pr-4 py-4 bg-sage-50 dark:bg-surface-container-dark border-none rounded-md3-small focus:ring-2 focus:ring-primary-500 transition-all text-sage-900 dark:text-sage-50"
                placeholder="La tua password"
                autoComplete="new-password"
                required
              />
              <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-sage-400" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full bg-primary-600 dark:bg-primary-500 text-white py-4 px-6 rounded-full font-bold hover:shadow-md3-3 focus:outline-none focus:ring-4 focus:ring-primary-200 transition-all flex items-center justify-center space-x-2 group shadow-md3-2 transform active:scale-95 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            <span className="text-lg">{isLoading ? 'Accesso in corso...' : 'Inizia Ora'}</span>
            {!isLoading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-[10px] text-sage-400 uppercase font-black tracking-widest">
            Powered by Google Firebase & Claude AI
          </p>
        </div>
      </div>
    </div>
  );
};