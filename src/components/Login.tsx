import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, User } from 'lucide-react';

interface LoginProps {
  onLogin: (user: { name: string; email: string; password: string }) => Promise<void>;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (formData.name.trim() && formData.email.trim() && formData.password.trim()) {
      try {
        setIsLoading(true);
        await onLogin(formData);
      } catch (err: any) {
        // Gestione degli errori specifici di Firebase
        let errorMessage = 'Errore durante l\'accesso. Riprova più tardi.';
        
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
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8 sm:mt-16 animate-fade-in px-4 sm:px-0">
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 sm:p-8">
        <div className="text-center mb-6 sm:mb-8">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-r from-primary-500 to-accent-500 rounded-xl mx-auto mb-4 flex items-center justify-center shadow-lg">
            <Lock className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-sage-900 mb-2">Accesso Piano Alimentare</h2>
          <p className="text-sage-600 text-sm sm:text-base">Inserisci i tuoi dati per continuare</p>
        </div>

        {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-red-700 text-sm">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div>
            <label className="block text-sm font-medium text-sage-700 mb-2">
              Nome completo
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full pl-10 pr-4 py-3 bg-white/60 border border-sage-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 shadow-sm focus:shadow-md text-sm sm:text-base"
                placeholder="Il tuo nome"
                required
              />
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-sage-400" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-sage-700 mb-2">
              Email
            </label>
            <div className="relative">
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full pl-10 pr-4 py-3 bg-white/60 border border-sage-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 shadow-sm focus:shadow-md text-sm sm:text-base"
                placeholder="la-tua-email@esempio.com"
                required
              />
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-sage-400" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-sage-700 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full pl-10 pr-4 py-3 bg-white/60 border border-sage-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 shadow-sm focus:shadow-md text-sm sm:text-base"
                placeholder="La tua password"
                required
              />
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-sage-400" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full bg-gradient-to-r from-primary-500 to-accent-500 text-white py-3 px-6 rounded-xl font-medium hover:from-primary-600 hover:to-accent-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-all duration-200 flex items-center justify-center space-x-2 group shadow-lg hover:shadow-xl transform hover:scale-105 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            <span className="text-sm sm:text-base">{isLoading ? 'Accesso in corso...' : 'Accedi'}</span>
            {!isLoading && <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform duration-200" />}
          </button>
        </form>

        <div className="mt-4 sm:mt-6 text-center">
          <p className="text-xs text-sage-500">
            I dati vengono salvati in modo sicuro su Firebase
          </p>
        </div>
      </div>
    </div>
  );
};