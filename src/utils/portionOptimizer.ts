import { matrix, multiply, transpose, inv, add, identity } from 'mathjs';
import { evaluateMealBalance, FOOD_EXAMPLES, CREA_RANGES } from './mealBalance';

export interface FoodMacroProfile {
  id: string;
  name: string;
  category?: string;
  caloriesPer100g: number;
  carbsPer100g: number;
  proteinsPer100g: number;
  fatsPer100g: number;
}

export interface MacroTarget {
  totalCalories: number;
  carbsPercent: number;
  proteinsPercent: number;
  fatsPercent: number;
}

export interface OptimizedPortion {
  foodId: string;
  grams: number;
  error?: number;
}

export interface OptimizationResult {
  portions: OptimizedPortion[];
  isFeasible: boolean;
  accuracy: number; // 0-100%
  suggestions?: string[];
}

const MIN_GRAMS = 10;   // porzione minima sensata
const MAX_GRAMS = 600;  // porzione massima sensata

/**
 * Risolve il sistema ai minimi quadrati pesati per il sottoinsieme di alimenti "liberi",
 * dato il residuo del target dopo aver fissato gli alimenti bloccati ai propri limiti.
 */
function solveWLS(A_cols: number[][], b: number[], weights: number[]): number[] {
  const n = A_cols.length;
  const A = matrix([0, 1, 2, 3].map(r => A_cols.map(col => col[r])));
  const bM = matrix(b.map(v => [v]));
  const W = matrix([
    [weights[0], 0, 0, 0],
    [0, weights[1], 0, 0],
    [0, 0, weights[2], 0],
    [0, 0, 0, weights[3]],
  ]);

  const AT = transpose(A);
  const ATW = multiply(AT, W);
  const ATWA = multiply(ATW, A);
  const ATWb = multiply(ATW, bM);

  const lambda = 0.01;
  const I = identity(n);
  const regularized = add(ATWA, multiply(I, lambda));
  const x = multiply(inv(regularized as any), ATWb);

  return (x.toArray() as any[]).map(v => (Array.isArray(v) ? v[0] : v)) as number[];
}

/**
 * Ottimizza le porzioni degli alimenti per soddisfare i target calorici e di macronutrienti.
 * Minimi Quadrati Pesati con vincoli sui grammi [MIN_GRAMS, MAX_GRAMS] applicati in modo
 * iterativo: gli alimenti che escono dai limiti vengono bloccati e il sistema viene
 * risolto di nuovo sui rimanenti.
 */
export function optimizePortions(
  foods: FoodMacroProfile[],
  target: MacroTarget
): OptimizationResult {
  if (foods.length === 0) {
    return { portions: [], isFeasible: false, accuracy: 0, suggestions: ["Aggiungi almeno un alimento."] };
  }

  // 1. Target in kcal assolute
  const targetCarbsKcal = (target.totalCalories * target.carbsPercent) / 100;
  const targetProteinsKcal = (target.totalCalories * target.proteinsPercent) / 100;
  const targetFatsKcal = (target.totalCalories * target.fatsPercent) / 100;
  const b_full = [target.totalCalories, targetCarbsKcal, targetProteinsKcal, targetFatsKcal];

  // 2. Analisi fattibilità: quali gruppi mancano del tutto?
  const suggestions: string[] = [];
  const totalProteinsAvailable = foods.reduce((s, f) => s + f.proteinsPer100g, 0);
  const totalCarbsAvailable = foods.reduce((s, f) => s + f.carbsPer100g, 0);
  const totalFatsAvailable = foods.reduce((s, f) => s + f.fatsPer100g, 0);

  if (targetProteinsKcal > 0 && totalProteinsAvailable < 1) {
    suggestions.push(`Manca una fonte proteica: aggiungi ad esempio ${FOOD_EXAMPLES.proteins}.`);
  }
  if (targetCarbsKcal > 0 && totalCarbsAvailable < 1) {
    suggestions.push(`Manca una fonte di carboidrati: aggiungi ad esempio ${FOOD_EXAMPLES.carbs}.`);
  }
  if (targetFatsKcal > 0 && totalFatsAvailable < 1) {
    suggestions.push(`Manca una fonte di grassi: aggiungi ad esempio ${FOOD_EXAMPLES.fats}.`);
  }

  // 3. Colonne della matrice (contributo per grammo * 100)
  const columns = foods.map(f => [
    f.caloriesPer100g / 100,
    (f.carbsPer100g * 4) / 100,
    (f.proteinsPer100g * 4) / 100,
    (f.fatsPer100g * 9) / 100,
  ]);

  // Pesi gerarchia: Calorie > Proteine > Carbo/Grassi
  const weights = [2.0, 1.0, 1.5, 1.0];

  try {
    // 4. Risoluzione iterativa con vincoli
    const grams: number[] = new Array(foods.length).fill(0);
    const pinned: (number | null)[] = new Array(foods.length).fill(null);

    for (let iter = 0; iter < foods.length + 1; iter++) {
      const freeIdx = foods.map((_, i) => i).filter(i => pinned[i] === null);
      if (freeIdx.length === 0) break;

      // Residuo del target dopo il contributo degli alimenti bloccati
      const residual = b_full.map((v, r) =>
        v - foods.reduce((s, _f, i) => (pinned[i] !== null ? s + columns[i][r] * (pinned[i] as number) : s), 0)
      );

      const solution = solveWLS(freeIdx.map(i => columns[i]), residual, weights);

      // Blocca gli alimenti fuori dai limiti (il più fuori-range per primo)
      let worst = -1;
      let worstDist = 0;
      solution.forEach((g, k) => {
        const dist = g < MIN_GRAMS ? MIN_GRAMS - g : g > MAX_GRAMS ? g - MAX_GRAMS : 0;
        if (dist > worstDist) {
          worstDist = dist;
          worst = k;
        }
      });

      if (worst === -1) {
        freeIdx.forEach((i, k) => { grams[i] = solution[k]; });
        break;
      }

      const i = freeIdx[worst];
      pinned[i] = solution[worst] < MIN_GRAMS ? MIN_GRAMS : MAX_GRAMS;
      grams[i] = pinned[i] as number;
      // aggiorna anche gli altri in attesa dell'iterazione successiva
      freeIdx.forEach((j, k) => {
        if (j !== i) grams[j] = Math.min(MAX_GRAMS, Math.max(MIN_GRAMS, solution[k]));
      });
    }

    const resultGrams = grams.map(g => Math.min(MAX_GRAMS, Math.max(MIN_GRAMS, g)));

    // 5. Accuratezza rispetto al target
    const finalValues = [0, 1, 2, 3].map(r =>
      foods.reduce((s, _f, i) => s + columns[i][r] * resultGrams[i], 0)
    );
    const errors = finalValues.map((v, i) => (b_full[i] > 0 ? Math.abs(v - b_full[i]) / b_full[i] : 0));
    const avgError = errors.reduce((s, e) => s + e, 0) / 4;
    const accuracy = Math.max(0, Math.min(100, 100 * (1 - avgError)));

    // 6. Suggerimenti CREA sul risultato raggiunto
    if (accuracy < 90) {
      const balance = evaluateMealBalance({
        calories: finalValues[0],
        carbs: finalValues[1] / 4,
        proteins: finalValues[2] / 4,
        fats: finalValues[3] / 9,
      });
      balance.suggestions.forEach(s => {
        if (!suggestions.includes(s)) suggestions.push(s);
      });

      if (finalValues[0] > target.totalCalories * 1.1) {
        suggestions.push("Le calorie totali superano il target: riduci le porzioni o rimuovi l'alimento più calorico.");
      } else if (finalValues[0] < target.totalCalories * 0.9) {
        suggestions.push("Le calorie totali sono sotto il target: aumenta le porzioni o aggiungi un alimento.");
      }
    }

    return {
      portions: foods.map((food, i) => ({
        foodId: food.id,
        grams: Math.round(resultGrams[i]),
      })),
      isFeasible: accuracy > 70,
      accuracy,
      suggestions,
    };
  } catch (error) {
    console.error("Errore nell'ottimizzazione porzioni:", error);
    // Fallback: distribuzione calorica uniforme
    return {
      portions: foods.map(f => ({
        foodId: f.id,
        grams: f.caloriesPer100g > 0
          ? Math.round(((target.totalCalories / foods.length) / f.caloriesPer100g) * 100)
          : 100,
      })),
      isFeasible: false,
      accuracy: 50,
      suggestions: ["Impossibile trovare una soluzione precisa: prova ad aggiungere alimenti più vari (una fonte di carboidrati, una di proteine e una di grassi)."],
    };
  }
}

export { CREA_RANGES };
