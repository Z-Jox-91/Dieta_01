/**
 * Valutazione dell'equilibrio di un pasto secondo le "Linee guida per una sana
 * alimentazione" del CREA (revisione 2018) e i range di riferimento LARN:
 *  - Carboidrati: 45–60% dell'energia
 *  - Proteine:    10–20% dell'energia
 *  - Grassi:      20–35% dell'energia
 */

export interface MacroBreakdown {
  calories: number;
  proteins: number; // g
  carbs: number;    // g
  fats: number;     // g
}

export type MacroKey = 'carbs' | 'proteins' | 'fats';

export interface MacroRange {
  min: number;
  max: number;
}

export const CREA_RANGES: Record<MacroKey, MacroRange> = {
  carbs: { min: 45, max: 60 },
  proteins: { min: 10, max: 20 },
  fats: { min: 20, max: 35 },
};

/** Target puntuale di riferimento (dentro i range CREA, somma = 100%). */
export const CREA_TARGET = {
  carbsPercent: 55,
  proteinsPercent: 15,
  fatsPercent: 30,
};

/** Esempi di alimenti per ciascun gruppo, usati nei suggerimenti. */
export const FOOD_EXAMPLES: Record<MacroKey, string> = {
  carbs: 'pane integrale, pasta, riso, farro, patate, frutta',
  proteins: 'petto di pollo, pesce (merluzzo, tonno), uova, legumi (ceci, lenticchie), yogurt greco, ricotta',
  fats: "olio extravergine d'oliva, noci, mandorle, avocado, semi di zucca",
};

const MACRO_LABEL: Record<MacroKey, string> = {
  carbs: 'carboidrati',
  proteins: 'proteine',
  fats: 'grassi',
};

export type MacroStatus = 'low' | 'ok' | 'high';

export interface MacroEvaluation {
  macro: MacroKey;
  label: string;
  percent: number;      // % di energia effettiva del pasto
  range: MacroRange;    // range CREA di riferimento
  status: MacroStatus;
}

export interface MealBalanceResult {
  isEmpty: boolean;
  isBalanced: boolean;
  totalCalories: number;
  evaluations: MacroEvaluation[];
  /** Messaggi in italiano su cosa aggiungere/ridurre, con esempi di alimenti. */
  suggestions: string[];
}

/**
 * Valuta l'equilibrio del pasto a partire dai totali di macronutrienti.
 * Le percentuali sono calcolate sull'energia derivata dai macro (4-4-9 kcal/g).
 */
export function evaluateMealBalance(totals: MacroBreakdown): MealBalanceResult {
  const carbsKcal = totals.carbs * 4;
  const proteinsKcal = totals.proteins * 4;
  const fatsKcal = totals.fats * 9;
  const energyFromMacros = carbsKcal + proteinsKcal + fatsKcal;

  if (energyFromMacros <= 0) {
    return {
      isEmpty: true,
      isBalanced: false,
      totalCalories: 0,
      evaluations: [],
      suggestions: [],
    };
  }

  const percents: Record<MacroKey, number> = {
    carbs: (carbsKcal / energyFromMacros) * 100,
    proteins: (proteinsKcal / energyFromMacros) * 100,
    fats: (fatsKcal / energyFromMacros) * 100,
  };

  const evaluations: MacroEvaluation[] = (Object.keys(CREA_RANGES) as MacroKey[]).map(macro => {
    const range = CREA_RANGES[macro];
    const percent = percents[macro];
    const status: MacroStatus = percent < range.min ? 'low' : percent > range.max ? 'high' : 'ok';
    return { macro, label: MACRO_LABEL[macro], percent, range, status };
  });

  const KCAL_PER_GRAM: Record<MacroKey, number> = { carbs: 4, proteins: 4, fats: 9 };
  const kcalByMacro: Record<MacroKey, number> = { carbs: carbsKcal, proteins: proteinsKcal, fats: fatsKcal };

  const suggestions: string[] = [];
  for (const ev of evaluations) {
    if (ev.status === 'low') {
      // Grammi del macronutriente da aggiungere per raggiungere il minimo CREA,
      // tenendo conto che l'energia totale del pasto aumenta insieme al macro aggiunto.
      const p = ev.range.min / 100;
      const neededKcal = Math.max(0, (p * energyFromMacros - kcalByMacro[ev.macro]) / (1 - p));
      const neededGrams = Math.round(neededKcal / KCAL_PER_GRAM[ev.macro]);
      suggestions.push(
        `Mancano ${ev.label} (${ev.percent.toFixed(0)}% invece di almeno ${ev.range.min}%): servono circa ${neededGrams}g in più di ${ev.label} puri (~${Math.round(neededKcal)} kcal). Aggiungi un alimento prevalentemente a base di ${ev.label}, ad esempio ${FOOD_EXAMPLES[ev.macro]}.`
      );
    } else if (ev.status === 'high') {
      // Grammi del macronutriente in eccesso da togliere per rientrare nel massimo CREA.
      const p = ev.range.max / 100;
      const excessKcal = Math.max(0, (kcalByMacro[ev.macro] - p * energyFromMacros) / (1 - p));
      const excessGrams = Math.round(excessKcal / KCAL_PER_GRAM[ev.macro]);
      suggestions.push(
        `Troppi ${ev.label} (${ev.percent.toFixed(0)}%, il massimo consigliato è ${ev.range.max}%): riduci di circa ${excessGrams}g (~${Math.round(excessKcal)} kcal) le porzioni degli alimenti più ricchi di ${ev.label}, oppure aumenta gli altri gruppi.`
      );
    }
  }

  return {
    isEmpty: false,
    isBalanced: suggestions.length === 0,
    totalCalories: totals.calories,
    evaluations,
    suggestions,
  };
}
