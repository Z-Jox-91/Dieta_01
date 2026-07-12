import { MacroKey } from '../utils/mealBalance';

/**
 * Colori fissi per ciascun macronutriente, usati ovunque nel sito (Dieta,
 * Ricette, grafico a ciambella) così l'utente associa sempre lo stesso
 * colore allo stesso macronutriente.
 */
export const MACRO_COLOR_HEX: Record<MacroKey, string> = {
  carbs: '#eab308',    // giallo
  proteins: '#ef4444', // rosso
  fats: '#22c55e',     // verde
};

export const MACRO_CARD_CLASSES: Record<MacroKey, { bg: string; border: string; text: string; textStrong: string; dot: string }> = {
  carbs: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/10',
    border: 'border-yellow-100 dark:border-yellow-800/30',
    text: 'text-yellow-600 dark:text-yellow-400',
    textStrong: 'text-yellow-700 dark:text-yellow-300',
    dot: 'bg-yellow-500',
  },
  proteins: {
    bg: 'bg-red-50 dark:bg-red-900/10',
    border: 'border-red-100 dark:border-red-800/30',
    text: 'text-red-600 dark:text-red-400',
    textStrong: 'text-red-700 dark:text-red-300',
    dot: 'bg-red-500',
  },
  fats: {
    bg: 'bg-green-50 dark:bg-green-900/10',
    border: 'border-green-100 dark:border-green-800/30',
    text: 'text-green-600 dark:text-green-400',
    textStrong: 'text-green-700 dark:text-green-300',
    dot: 'bg-green-500',
  },
};

export const MACRO_LABELS: Record<MacroKey, string> = {
  carbs: 'Carboidrati',
  proteins: 'Proteine',
  fats: 'Grassi',
};
