import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, User } from 'lucide-react';

interface LoginProps {
  onAuth: (
    user: { name: string; email: string; password: string },
    mode: 'login' | 'register'
  ) => Promise<void>;
}

type Mode = 'login' | 'register';

export const Login: React.FC<LoginProps> = ({ onAuth }) => {
  const [mode, setMode] = useState<Mode>('login');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRegister = mode === 'register';

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validazioni lato client
    if (!formData.email.trim() || !formData.password.trim()) {
      setError('Email e password sono obbligatorie.');
      return;
    }
    if (isRegister) {
      if (!formData.name.trim()) {
        setError('Inserisci il tuo nome.');
        return;
      }
      if (formData.password.length < 6) {
        setError('La password deve contenere almeno 6 caratteri.');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Le due password non coincidono.');
        return;
      }
    }

    try {
      setIsLoading(true);
      await onAuth(
        { name: formData.name, email: formData.email, password: formData.password },
        mode
      );
    } catch (err: any) {
      let errorMessage = isRegister
        ? 'Errore durante la registrazione. Riprova più tardi.'
        : 'Errore durante l\'accesso. Riprova più tardi.';
      console.error('Errore autenticazione:', err);

      if (err.code) {
        switch (err.code) {
          case 'auth/invalid-email':
            errorMessage = 'Indirizzo email non valido.';
            break;
          case 'auth/user-disabled':
            errorMessage = 'Questo account è stato disabilitato.';
            break;
          case 'auth/user-not-found':
            errorMessage = 'Nessun account trovato con questa email. Registrati prima.';
            break;
          case 'auth/wrong-password':
          case 'auth/invalid-credential':
            errorMessage = 'Email o password non corretti.';
            break;
          case 'auth/email-already-in-use':
            errorMessage = 'Questa email è già registrata. Usa "Accedi".';
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
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass =
    'w-full pl-12 pr-4 py-4 bg-sage-50 dark:bg-surface-container-dark border-none rounded-md3-small focus:ring-2 focus:ring-primary-500 transition-all text-sage-900 dark:text-sage-50';

  return (
    <div className="max-w-md mx-auto mt-8 sm:mt-16 animate-fade-in px-4 sm:px-0">
      <div className="md3-card p-6 sm:p-10 border border-sage-200 dark:border-sage-800">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-primary-600 dark:bg-primary-500 rounded-md3-medium mx-auto mb-6 flex items-center justify-center shadow-md3-3">
            <Lock className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-black text-sage-900 dark:text-sage-50 mb-2 tracking-tight">Cunzari</h2>
          <p className="text-sage-600 dark:text-sage-400 font-medium">Ogni pasto, cunzato a puntino</p>
        </div>

        {/* Toggle Accedi / Registrati */}
        <div className="flex p-1.5 bg-sage-100 dark:bg-surface-container-dark rounded-full mb-8">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={`flex-1 py-2.5 rounded-full font-bold text-sm transition-all ${
              !isRegister
                ? 'bg-white dark:bg-surface-dark text-primary-700 dark:text-primary-300 shadow-md3-1'
                : 'text-sage-500 dark:text-sage-400'
            }`}
          >
            Accedi
          </button>
          <button
            type="button"
            onClick={() => switchMode('register')}
            className={`flex-1 py-2.5 rounded-full font-bold text-sm transition-all ${
              isRegister
                ? 'bg-white dark:bg-surface-dark text-primary-700 dark:text-primary-300 shadow-md3-1'
                : 'text-sage-500 dark:text-sage-400'
            }`}
          >
            Registrati
          </button>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md3-small p-4 mb-6 text-red-700 dark:text-red-300 text-sm font-medium animate-shake">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
          {isRegister && (
            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-sage-700 dark:text-sage-300 ml-1">
                Nome completo
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={inputClass}
                  placeholder="Il tuo nome"
                  autoComplete="off"
                />
                <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-sage-400" />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-sm font-bold text-sage-700 dark:text-sage-300 ml-1">
              Email
            </label>
            <div className="relative">
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={inputClass}
                placeholder="email@esempio.com"
                autoComplete="email"
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
                className={inputClass}
                placeholder={isRegister ? 'Almeno 6 caratteri' : 'La tua password'}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                required
              />
              <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-sage-400" />
            </div>
          </div>

          {isRegister && (
            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-sage-700 dark:text-sage-300 ml-1">
                Conferma password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className={inputClass}
                  placeholder="Ripeti la password"
                  autoComplete="new-password"
                  required
                />
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-sage-400" />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full bg-primary-600 dark:bg-primary-500 text-white py-4 px-6 rounded-full font-bold hover:shadow-md3-3 focus:outline-none focus:ring-4 focus:ring-primary-200 transition-all flex items-center justify-center space-x-2 group shadow-md3-2 transform active:scale-95 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            <span className="text-lg">
              {isLoading
                ? (isRegister ? 'Registrazione...' : 'Accesso in corso...')
                : (isRegister ? 'Crea account' : 'Accedi')}
            </span>
            {!isLoading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => switchMode(isRegister ? 'login' : 'register')}
            className="text-sm text-sage-600 dark:text-sage-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          >
            {isRegister ? 'Hai già un account? ' : 'Non hai un account? '}
            <span className="font-bold text-primary-600 dark:text-primary-400">
              {isRegister ? 'Accedi' : 'Registrati'}
            </span>
          </button>
        </div>

        <div className="mt-8 text-center">
          <p className="text-[10px] text-sage-400 uppercase font-black tracking-widest">
            Powered by Google Firebase &amp; Gemini AI
          </p>
        </div>
      </div>
    </div>
  );
};
