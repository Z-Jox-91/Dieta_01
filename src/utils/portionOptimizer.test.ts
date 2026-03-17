import { optimizePortions, FoodMacroProfile, MacroTarget } from './portionOptimizer';

/**
 * Test unitari per l'ottimizzatore di porzioni MacroMind.
 * Verifica che l'algoritmo trovi soluzioni ammissibili e performanti.
 */
export function runOptimizerTests() {
  console.group('🧪 MacroMind Optimizer Tests');
  
  const testFoods: FoodMacroProfile[] = [
    { id: '1', name: 'Pasta', caloriesPer100g: 350, carbsPer100g: 70, proteinsPer100g: 12, fatsPer100g: 2 },
    { id: '2', name: 'Pollo', caloriesPer100g: 110, carbsPer100g: 0, proteinsPer100g: 23, fatsPer100g: 2 },
    { id: '3', name: 'Olio', caloriesPer100g: 900, carbsPer100g: 0, proteinsPer100g: 0, fatsPer100g: 100 },
  ];

  const target: MacroTarget = {
    totalCalories: 600,
    carbsPercent: 50,
    proteinsPercent: 30,
    fatsPercent: 20
  };

  // Test 1: Performance
  const start = performance.now();
  const results = optimizePortions(testFoods, target);
  const end = performance.now();
  const duration = end - start;

  console.log(`Test 1 (Performance): ${duration.toFixed(2)}ms ${duration < 500 ? '✅' : '❌'}`);

  // Test 2: Validità (Somma calorie vicina al target)
  let totalKcal = 0;
  results.forEach(res => {
    const food = testFoods.find(f => f.id === res.foodId)!;
    totalKcal += (food.caloriesPer100g * res.grams) / 100;
  });
  
  const diff = Math.abs(totalKcal - target.totalCalories);
  console.log(`Test 2 (Precisione Kcal): Diff ${diff.toFixed(1)} kcal ${diff < 50 ? '✅' : '❌'}`);

  // Test 3: Non-negatività
  const allPositive = results.every(r => r.grams >= 0);
  console.log(`Test 3 (Non-negatività): ${allPositive ? '✅' : '❌'}`);

  console.groupEnd();
  
  return {
    performance: duration,
    precision: diff,
    valid: allPositive && diff < 50 && duration < 500
  };
}
