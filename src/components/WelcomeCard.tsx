import React from 'react';
import { Salad, X } from 'lucide-react';

interface WelcomeCardProps {
  onStart: () => void;
  onDismiss: () => void;
}

const STEPS = [
  'Inserisci i tuoi dati in "Calcoli"',
  'Guarda BMI, metabolismo e target',
  'Componi i pasti in "Dieta"',
];

export const WelcomeCard: React.FC<WelcomeCardProps> = ({ onStart, onDismiss }) => (
  <div className="relative md3-card border border-primary-100 dark:border-primary-900/30 p-6 sm:p-8 mb-8 text-center animate-fade-in">
    <button
      onClick={onDismiss}
      className="absolute top-4 right-4 p-2 text-sage-400 hover:text-sage-600 dark:hover:text-sage-200 hover:bg-sage-100 dark:hover:bg-surface-container-dark rounded-full transition-colors"
      aria-label="Chiudi"
    >
      <X className="w-4 h-4" />
    </button>

    <div className="w-14 h-14 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
      <Salad className="w-7 h-7 text-primary-600 dark:text-primary-400" />
    </div>
    <h2 className="text-xl font-black text-sage-900 dark:text-sage-50 mb-2 tracking-tight">Benvenuto su Cunzari</h2>
    <p className="text-sm text-sage-600 dark:text-sage-400 mb-6 max-w-md mx-auto">
      Tre passi per il tuo primo piano alimentare bilanciato secondo le Linee guida CREA.
    </p>

    <div className="flex flex-wrap justify-center gap-6 sm:gap-10 mb-8">
      {STEPS.map((step, i) => (
        <div key={i} className="w-32">
          <div className="w-8 h-8 rounded-full bg-sage-100 dark:bg-surface-container-dark text-sage-700 dark:text-sage-300 font-bold flex items-center justify-center mx-auto mb-2">
            {i + 1}
          </div>
          <p className="text-xs text-sage-600 dark:text-sage-400">{step}</p>
        </div>
      ))}
    </div>

    <button onClick={onStart} className="md3-button-primary">
      Inizia dai tuoi dati
    </button>
  </div>
);
