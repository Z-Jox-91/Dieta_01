import { matrix, lsolve, multiply, transpose, inv } from 'mathjs';

export interface FoodMacroProfile {
  id: string;
  name: string;
  caloriesPer100g: number;
  carbsPer100g: number;
  proteinsPer100g: number;
  fatsPer100g: number;
  minGrams?: number;
  maxGrams?: number;
}

export interface MacroTarget {
  totalCalories: number;
  carbsPercent: number; // e.g. 50
  proteinsPercent: number; // e.g. 30
  fatsPercent: number; // e.g. 20
}

export interface OptimizedPortion {
  foodId: string;
  grams: number;
}

/**
 * Optimizes food portions using Least Squares to match target macro profiles.
 * 
 * Equations for each macro:
 * sum( (x_i/100) * carbs_i * 4 ) = TargetCarbsCalories
 * sum( (x_i/100) * proteins_i * 4 ) = TargetProteinsCalories
 * sum( (x_i/100) * fats_i * 9 ) = TargetFatsCalories
 * 
 * This can be written as A * x = b
 * where A is the macro matrix and b is the target vector.
 * We use Least Squares (A^T * A) * x = A^T * b to solve for x.
 */
export function optimizePortions(
  foods: FoodMacroProfile[],
  target: MacroTarget
): OptimizedPortion[] {
  if (foods.length === 0) return [];

  // 1. Build matrix A (3xN)
  // Rows: Carbs Calories, Proteins Calories, Fats Calories
  // Columns: Food 1, Food 2, ..., Food N (per 100g)
  const A_data: number[][] = [
    foods.map(f => (f.carbsPer100g * 4) / 100),
    foods.map(f => (f.proteinsPer100g * 4) / 100),
    foods.map(f => (f.fatsPer100g * 9) / 100),
  ];

  // 2. Build vector b (3x1)
  const b_data: number[] = [
    (target.totalCalories * target.carbsPercent) / 100,
    (target.totalCalories * target.proteinsPercent) / 100,
    (target.totalCalories * target.fatsPercent) / 100,
  ];

  const A = matrix(A_data);
  const b = matrix(b_data);

  // 3. Solve using Least Squares: (A^T * A) * x = A^T * b
  // Note: For small N, we can also use pseudo-inverse: x = (A^T * A)^-1 * A^T * b
  const AT = transpose(A);
  const ATA = multiply(AT, A);
  const ATb = multiply(AT, b);

  let x: any;
  try {
    // If ATA is singular (e.g., foods are too similar), we need regularization
    // Adding a small identity matrix to diagonal (Ridge Regression)
    const ridge = 0.0001;
    const size = ATA.size()[0];
    const identity = matrix(Array(size).fill(0).map((_, i) => Array(size).fill(0).map((_, j) => i === j ? ridge : 0)));
    const regularizedATA = multiply(ATA, 1).add(identity); // Workaround for matrix addition
    
    // x = inv(ATA) * ATb
    x = multiply(inv(regularizedATA), ATb);
  } catch (e) {
    console.warn("Portion optimization failed, using heuristic fallback", e);
    // Fallback to simple equal distribution
    return foods.map(f => ({ foodId: f.id, grams: 100 }));
  }

  const resultGrams = x.toArray().map((val: any) => {
    const grams = Array.isArray(val) ? val[0] : val;
    return Math.max(0, grams); // Ensure non-negative
  });

  // 4. Apply min/max constraints and normalize
  return foods.map((food, i) => {
    let grams = resultGrams[i];
    if (food.minGrams !== undefined) grams = Math.max(grams, food.minGrams);
    if (food.maxGrams !== undefined) grams = Math.min(grams, food.maxGrams);
    return { foodId: food.id, grams: Math.round(grams * 10) / 10 };
  });
}
