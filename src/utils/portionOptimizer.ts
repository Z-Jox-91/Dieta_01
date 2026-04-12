import { matrix, multiply, transpose, inv, add, identity, sum } from 'mathjs';

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

/**
 * Ottimizza le porzioni degli alimenti per soddisfare i target calorici e di macronutrienti.
 * Utilizza un approccio a Minimi Quadrati Pesati (Weighted Least Squares) con gerarchia di priorità.
 */
export function optimizePortions(
  foods: FoodMacroProfile[],
  target: MacroTarget
): OptimizationResult {
  const startTime = performance.now();
  
  if (foods.length === 0) {
    return { portions: [], isFeasible: false, accuracy: 0, suggestions: ["Aggiungi almeno un alimento."] };
  }

  // 1. Definiamo i target in kcal assolute
  const targetCarbsKcal = (target.totalCalories * target.carbsPercent) / 100;
  const targetProteinsKcal = (target.totalCalories * target.proteinsPercent) / 100;
  const targetFatsKcal = (target.totalCalories * target.fatsPercent) / 100;

  // 2. Analisi Fattibilità (Esempio: se cerchiamo proteine e abbiamo solo riso)
  const totalProteinsKcalAvailable = sum(foods.map(f => f.proteinsPer100g * 4));
  const totalCarbsKcalAvailable = sum(foods.map(f => f.carbsPer100g * 4));
  const totalFatsKcalAvailable = sum(foods.map(f => f.fatsPer100g * 9));

  const suggestions: string[] = [];
  if (targetProteinsKcal > 0 && totalProteinsKcalAvailable === 0) {
    suggestions.push("Aggiungi una fonte proteica (carne, pesce, legumi).");
  }
  if (targetCarbsKcal > 0 && totalCarbsKcalAvailable === 0) {
    suggestions.push("Aggiungi una fonte di carboidrati (cereali, frutta).");
  }
  if (targetFatsKcal > 0 && totalFatsKcalAvailable === 0) {
    suggestions.push("Aggiungi una fonte di grassi sani (olio, frutta secca).");
  }

  // 3. Costruiamo la matrice A (4 equazioni x N alimenti)
  const A_data: number[][] = [
    foods.map(f => f.caloriesPer100g / 100),
    foods.map(f => (f.carbsPer100g * 4) / 100),
    foods.map(f => (f.proteinsPer100g * 4) / 100),
    foods.map(f => (f.fatsPer100g * 9) / 100),
  ];

  const b_data: number[][] = [
    [target.totalCalories],
    [targetCarbsKcal],
    [targetProteinsKcal],
    [targetFatsKcal],
  ];

  // 4. Pesi per la gerarchia (Calorie > Proteine > Carbo/Grassi)
  const weights = [2.0, 1.0, 1.5, 1.0]; // Calorie=2.0, Carbo=1.0, Prote=1.5, Grassi=1.0
  const W = matrix([
    [weights[0], 0, 0, 0],
    [0, weights[1], 0, 0],
    [0, 0, weights[2], 0],
    [0, 0, 0, weights[3]]
  ]);

  try {
    const A = matrix(A_data);
    const b = matrix(b_data);

    // Risolviamo con Minimi Quadrati Pesati: x = (A^T * W * A + lambda * I)^-1 * A^T * W * b
    const AT = transpose(A);
    const ATW = multiply(AT, W);
    const ATWA = multiply(ATW, A);
    const ATWb = multiply(ATW, b);

    const lambda = 0.01; // Leggermente più alto per maggiore stabilità
    const size = ATWA.size()[0];
    const I = identity(size);
    const regularizedATWA = add(ATWA, multiply(I, lambda));
    
    const x = multiply(inv(regularizedATWA as any), ATWb);
    let resultGrams = x.toArray().map((val: any) => Math.max(10, Array.isArray(val) ? val[0] : val)); // Minimo 10g

    // 5. Calcolo accuratezza e analisi conflitti
    const finalValues = multiply(A, matrix(resultGrams.map(g => [g]))).toArray().map((v: any) => v[0]);
    const errors = finalValues.map((v: number, i: number) => Math.abs(v - b_data[i][0]) / b_data[i][0]);
    const avgError = sum(errors) / 4;
    const accuracy = Math.max(0, 100 * (1 - avgError));

    // Analisi Proattiva Conflitti
    if (accuracy < 90) {
      // Identifica l'alimento con il profilo più sbilanciato rispetto al target
      foods.forEach(f => {
        const foodKcal = f.caloriesPer100g;
        const foodProtRatio = (f.proteinsPer100g * 4) / foodKcal;
        const targetProtRatio = target.proteinsPercent / 100;
        
        if (foodProtRatio > targetProtRatio * 2) {
          suggestions.push(`L'alimento "${f.name}" è estremamente proteico rispetto al tuo target. Riducilo o aggiungi carboidrati.`);
        } else if (foodProtRatio < targetProtRatio * 0.5 && foodKcal > 200) {
          suggestions.push(`"${f.name}" è densamente calorico ma povero di proteine. Considera di sostituirlo con una fonte più magra.`);
        }
      });

      if (finalValues[0] > target.totalCalories * 1.1) {
        suggestions.push("Le calorie totali superano il target. Prova a rimuovere l'alimento più grasso.");
      }
    }

    const endTime = performance.now();
    
    return {
      portions: foods.map((food, i) => ({
        foodId: food.id,
        grams: Math.round(resultGrams[i])
      })),
      isFeasible: accuracy > 70,
      accuracy,
      suggestions: accuracy < 90 ? [...suggestions, "Considera di bilanciare meglio gli alimenti scelti."] : suggestions
    };

  } catch (error) {
    console.error("Errore nell'ottimizzazione porzioni:", error);
    // Fallback: Distribuzione bilanciata base
    return {
      portions: foods.map(f => ({
        foodId: f.id,
        grams: Math.round(((target.totalCalories / foods.length) / f.caloriesPer100g) * 100)
      })),
      isFeasible: false,
      accuracy: 50,
      suggestions: ["Impossibile trovare soluzione precisa. Suggerimento: aggiungi alimenti più vari."]
    };
  }
}

