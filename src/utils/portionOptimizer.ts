import { matrix, multiply, transpose, inv, add, identity } from 'mathjs';

export interface FoodMacroProfile {
  id: string;
  name: string;
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
}

/**
 * Ottimizza le porzioni degli alimenti per soddisfare i target calorici e di macronutrienti.
 * Implementa un sistema di equazioni lineari A * x = b risolto con i Minimi Quadrati Regolarizzati (Ridge Regression).
 * 
 * Target:
 * 1. Somma calorie = Target Calorie
 * 2. Somma Carbo (kcal) = Target Carbo (kcal)
 * 3. Somma Prote (kcal) = Target Prote (kcal)
 * 4. Somma Grassi (kcal) = Target Grassi (kcal)
 * 
 * @param foods Lista degli alimenti selezionati con il loro profilo nutrizionale per 100g.
 * @param target Target calorici e percentuali di macronutrienti.
 * @returns Lista delle porzioni ottimizzate in grammi.
 */
export function optimizePortions(
  foods: FoodMacroProfile[],
  target: MacroTarget
): OptimizedPortion[] {
  const startTime = performance.now();
  
  if (foods.length === 0) return [];

  // 1. Definiamo i target in kcal assolute
  const targetCarbsKcal = (target.totalCalories * target.carbsPercent) / 100;
  const targetProteinsKcal = (target.totalCalories * target.proteinsPercent) / 100;
  const targetFatsKcal = (target.totalCalories * target.fatsPercent) / 100;

  // 2. Costruiamo la matrice A (4 equazioni x N alimenti)
  // Eq 1: Calorie totali
  // Eq 2: Carboidrati (kcal)
  // Eq 3: Proteine (kcal)
  // Eq 4: Grassi (kcal)
  // I coefficienti sono per 1g di alimento (valore per 100g / 100)
  const A_data: number[][] = [
    foods.map(f => f.caloriesPer100g / 100),
    foods.map(f => (f.carbsPer100g * 4) / 100),
    foods.map(f => (f.proteinsPer100g * 4) / 100),
    foods.map(f => (f.fatsPer100g * 9) / 100),
  ];

  // 3. Costruiamo il vettore b (4 target)
  const b_data: number[][] = [
    [target.totalCalories],
    [targetCarbsKcal],
    [targetProteinsKcal],
    [targetFatsKcal],
  ];

  try {
    const A = matrix(A_data);
    const b = matrix(b_data);

    // Risolviamo con Minimi Quadrati: x = (A^T * A + lambda * I)^-1 * A^T * b
    const AT = transpose(A);
    const ATA = multiply(AT, A);
    const ATb = multiply(AT, b);

    // Regolarizzazione per gestire matrici singolari (alimenti troppo simili o N < 4)
    const lambda = 0.001;
    const size = ATA.size()[0];
    const I = identity(size);
    const regularizedATA = add(ATA, multiply(I, lambda));
    
    const x = multiply(inv(regularizedATA as any), ATb);
    const resultGrams = x.toArray().map((val: any) => Math.max(0, Array.isArray(val) ? val[0] : val));

    const endTime = performance.now();
    const duration = endTime - startTime;
    
    if (duration > 500) {
      console.warn(`Ottimizzazione lenta: ${duration.toFixed(2)}ms`);
    }

    return foods.map((food, i) => ({
      foodId: food.id,
      grams: Math.round(resultGrams[i]) // Arrotondiamo al grammo intero
    }));

  } catch (error) {
    console.error("Errore nell'ottimizzazione porzioni:", error);
    // Fallback: Distribuzione equa delle calorie
    const kcalPerFood = target.totalCalories / foods.length;
    return foods.map(f => ({
      foodId: f.id,
      grams: Math.round((kcalPerFood / f.caloriesPer100g) * 100)
    }));
  }
}
