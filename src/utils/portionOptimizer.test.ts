import { describe, it, expect } from 'vitest';
import { optimizePortions, FoodMacroProfile, MacroTarget } from './portionOptimizer';

/**
 * Test unitari per l'ottimizzatore di porzioni MacroMind.
 * Verifica che l'algoritmo trovi soluzioni ammissibili e performanti.
 */
describe('portionOptimizer', () => {
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

  it('trova una soluzione in meno di 500ms', () => {
    const start = performance.now();
    optimizePortions(testFoods, target);
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(500);
  });

  it('si avvicina al target calorico (±50 kcal)', () => {
    const results = optimizePortions(testFoods, target);
    let totalKcal = 0;
    results.portions.forEach(res => {
      const food = testFoods.find(f => f.id === res.foodId)!;
      totalKcal += (food.caloriesPer100g * res.grams) / 100;
    });
    expect(Math.abs(totalKcal - target.totalCalories)).toBeLessThan(50);
  });

  it('restituisce solo grammature non negative', () => {
    const results = optimizePortions(testFoods, target);
    expect(results.portions.every(r => r.grams >= 0)).toBe(true);
  });

  it('segnala cosa aggiungere quando manca un gruppo alimentare', () => {
    const onlyCarbs: FoodMacroProfile[] = [
      { id: '1', name: 'Riso', caloriesPer100g: 360, carbsPer100g: 80, proteinsPer100g: 0, fatsPer100g: 0 },
    ];
    const result = optimizePortions(onlyCarbs, target);
    const text = (result.suggestions || []).join(' ');
    expect(text).toContain('fonte proteica');
    expect(text).toContain('fonte di grassi');
  });

  it('gestisce una lista vuota senza errori', () => {
    const result = optimizePortions([], target);
    expect(result.isFeasible).toBe(false);
    expect(result.portions).toHaveLength(0);
  });
});
