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

  // Verifica "con criterio": per un pasto con le tre fonti presenti (carbo, proteine,
  // grassi), l'ottimizzatore deve convergere alle grammature attese analiticamente
  // (calcolate a mano risolvendo lo stesso sistema), non a valori arbitrari.
  it('converge alle grammature attese analiticamente per un pasto ben composto', () => {
    const result = optimizePortions(testFoods, target);
    const byId = Object.fromEntries(result.portions.map(p => [p.foodId, p.grams]));

    // Soluzione attesa (risolta a mano sullo stesso sistema 4 equazioni/3 incognite):
    // Pasta ~107g, Pollo ~140g, Olio ~8g.
    expect(byId['1']).toBeGreaterThan(85);
    expect(byId['1']).toBeLessThan(130);
    expect(byId['2']).toBeGreaterThan(115);
    expect(byId['2']).toBeLessThan(165);
    expect(byId['3']).toBeGreaterThan(0);
    expect(byId['3']).toBeLessThan(25);

    expect(result.accuracy).toBeGreaterThan(90);
    expect(result.isFeasible).toBe(true);
  });

  it('rispetta la ripartizione macro CREA quando il pasto risultante viene rivalutato', () => {
    const result = optimizePortions(testFoods, target);
    let totals = { calories: 0, carbs: 0, proteins: 0, fats: 0 };
    result.portions.forEach(res => {
      const food = testFoods.find(f => f.id === res.foodId)!;
      const factor = res.grams / 100;
      totals = {
        calories: totals.calories + food.caloriesPer100g * factor,
        carbs: totals.carbs + food.carbsPer100g * factor,
        proteins: totals.proteins + food.proteinsPer100g * factor,
        fats: totals.fats + food.fatsPer100g * factor,
      };
    });
    const carbsPercent = (totals.carbs * 4 / totals.calories) * 100;
    const proteinsPercent = (totals.proteins * 4 / totals.calories) * 100;
    const fatsPercent = (totals.fats * 9 / totals.calories) * 100;

    // Il target chiesto era 50/30/20: con solo 3 alimenti e vincoli di grammatura
    // non è raggiungibile all'esatto punto percentuale, ma deve restare dentro
    // un margine ragionevole (non un risultato "a caso").
    expect(Math.abs(carbsPercent - target.carbsPercent)).toBeLessThan(10);
    expect(Math.abs(proteinsPercent - target.proteinsPercent)).toBeLessThan(10);
    expect(Math.abs(fatsPercent - target.fatsPercent)).toBeLessThan(10);
  });

  it('non è una funzione di "aggiustamento": ignora le quantità di partenza e ricalcola sempre da zero', () => {
    // Chiamare due volte con lo stesso input (nessuna nozione di "grammi attuali" nell'API)
    // deve dare risultati identici — conferma che l'algoritmo è deterministico e basato
    // solo sui profili nutrizionali forniti, non su uno stato nascosto.
    const result1 = optimizePortions(testFoods, target);
    const result2 = optimizePortions(testFoods, target);
    expect(result1.portions).toEqual(result2.portions);
  });
});
