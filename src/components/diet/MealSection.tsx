import React, { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, Scale, CheckCircle2, AlertTriangle } from 'lucide-react';
import { FoodAutocomplete, FoodOption } from './FoodAutocomplete';
import { PortionOptimizer } from './PortionOptimizer';
import { FoodMacroProfile, OptimizationResult } from '../../utils/portionOptimizer';
import { evaluateMealBalance } from '../../utils/mealBalance';

interface MealItem {
  id: string;
  food: string;
  grams: number;
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
  category?: string;
  baseCalories?: number; // per 100g
  baseProteins?: number; // per 100g
  baseCarbs?: number; // per 100g
  baseFats?: number; // per 100g
}

interface MealSectionProps {
  title: string;
  mealData: MealItem[];
  onUpdate: (data: MealItem[]) => void;
  dayName: string;
}

/** Ricava i valori per 100g di un item, anche per dati salvati prima dell'introduzione dei campi base*. */
const getBaseValues = (item: MealItem) => {
  const g = item.grams || 100;
  return {
    calories: item.baseCalories ?? (item.calories / g) * 100,
    proteins: item.baseProteins ?? (item.proteins / g) * 100,
    carbs: item.baseCarbs ?? (item.carbs / g) * 100,
    fats: item.baseFats ?? (item.fats / g) * 100,
  };
};

const scaleItem = (item: MealItem, grams: number): MealItem => {
  const base = getBaseValues(item);
  return {
    ...item,
    grams,
    calories: (base.calories * grams) / 100,
    proteins: (base.proteins * grams) / 100,
    carbs: (base.carbs * grams) / 100,
    fats: (base.fats * grams) / 100,
    baseCalories: base.calories,
    baseProteins: base.proteins,
    baseCarbs: base.carbs,
    baseFats: base.fats,
  };
};

export const MealSection: React.FC<MealSectionProps> = ({
  title,
  mealData,
  onUpdate,
  dayName
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const addItem = () => {
    const newItem: MealItem = {
      id: Date.now().toString(),
      food: '',
      grams: 100,
      calories: 0,
      proteins: 0,
      carbs: 0,
      fats: 0,
      category: ''
    };
    onUpdate([...mealData, newItem]);
  };

  const updateItem = (id: string, updates: Partial<MealItem>) => {
    onUpdate(mealData.map(item => (item.id === id ? { ...item, ...updates } : item)));
  };

  const removeItem = (id: string) => {
    onUpdate(mealData.filter(item => item.id !== id));
  };

  const handleFoodSelect = (item: MealItem, food: FoodOption | null) => {
    if (!food) {
      updateItem(item.id, {
        food: '', calories: 0, proteins: 0, carbs: 0, fats: 0, category: '',
        baseCalories: 0, baseProteins: 0, baseCarbs: 0, baseFats: 0
      });
      return;
    }
    const grams = item.grams || 100;
    updateItem(item.id, {
      food: food.name,
      category: food.category,
      grams,
      calories: (food.calories * grams) / 100,
      proteins: (food.proteins * grams) / 100,
      carbs: (food.carbs * grams) / 100,
      fats: (food.fats * grams) / 100,
      baseCalories: food.calories,
      baseProteins: food.proteins,
      baseCarbs: food.carbs,
      baseFats: food.fats,
    });
  };

  const handleGramsChange = (item: MealItem, rawValue: string) => {
    const grams = parseFloat(rawValue) || 0;
    if (item.food) {
      const scaled = scaleItem(item, grams);
      updateItem(item.id, scaled);
    } else {
      updateItem(item.id, { grams });
    }
  };

  const calculateTotals = () => {
    return mealData.reduce((totals, item) => ({
      calories: totals.calories + (item.calories || 0),
      proteins: totals.proteins + (item.proteins || 0),
      carbs: totals.carbs + (item.carbs || 0),
      fats: totals.fats + (item.fats || 0)
    }), { calories: 0, proteins: 0, carbs: 0, fats: 0 });
  };

  const handleApplyOptimization = (optimizationResult: OptimizationResult) => {
    const { portions } = optimizationResult;
    const updatedData = mealData.map(item => {
      const optimizedPortion = portions.find(p => p.foodId === item.id);
      return optimizedPortion ? scaleItem(item, optimizedPortion.grams) : item;
    });
    onUpdate(updatedData);
  };

  const selectedFoodsForOptimizer: FoodMacroProfile[] = mealData
    .filter(item => item.food)
    .map(item => {
      const base = getBaseValues(item);
      return {
        id: item.id,
        name: item.food,
        category: item.category,
        caloriesPer100g: base.calories,
        carbsPer100g: base.carbs,
        proteinsPer100g: base.proteins,
        fatsPer100g: base.fats,
      };
    });

  const totals = calculateTotals();
  const balance = evaluateMealBalance(totals);

  return (
    <div className="md3-card border border-sage-200 dark:border-sage-800 shadow-none">
      <div
        className="p-6 cursor-pointer hover:bg-sage-50/50 dark:hover:bg-surface-container-dark/50 transition-colors duration-200 border-b border-sage-100 dark:border-sage-800"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h3 className="text-xl font-black text-sage-900 dark:text-sage-50 tracking-tight mb-0">{title}</h3>
            {!balance.isEmpty && (
              <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                balance.isBalanced
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                  : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
              }`}>
                {balance.isBalanced ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                <span>{balance.isBalanced ? 'Equilibrato' : 'Da bilanciare'}</span>
              </span>
            )}
          </div>
          <div className="flex items-center space-x-6">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-black uppercase tracking-widest text-primary-600 dark:text-primary-400 mb-0.5">Totale Pasto</p>
              <p className="text-sm font-bold text-sage-700 dark:text-sage-300">
                {Math.round(totals.calories)} kcal • {totals.proteins.toFixed(1)}g proteine
              </p>
            </div>
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-sage-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-sage-400" />
            )}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="p-6">
          {/* Layout Desktop */}
          <div className="hidden lg:block md3-table-container mb-6">
            <table className="md3-table">
              <thead className="md3-table-header">
                <tr>
                  <th className="md3-table-th w-1/3">Alimento</th>
                  <th className="md3-table-th text-center">Peso (g)</th>
                  <th className="md3-table-th text-center">Energia (kcal)</th>
                  <th className="md3-table-th text-center">Proteine</th>
                  <th className="md3-table-th text-center">Carboidrati</th>
                  <th className="md3-table-th text-center">Lipidi</th>
                  <th className="md3-table-th text-right"></th>
                </tr>
              </thead>
              <tbody>
                {mealData.map((item, idx) => (
                  <tr key={item.id} className={`md3-table-tr ${idx % 2 === 0 ? '' : 'md3-table-tr-even'}`}>
                    <td className="md3-table-td">
                      <FoodAutocomplete
                        value={item.food}
                        onSelect={(food) => handleFoodSelect(item, food)}
                      />
                    </td>
                    <td className="md3-table-td text-center">
                      <input
                        type="number"
                        value={item.grams || ''}
                        onChange={(e) => handleGramsChange(item, e.target.value)}
                        className="md3-input py-1.5 px-3 text-center w-24 font-bold"
                        placeholder="0"
                        min="0"
                      />
                    </td>
                    <td className="md3-table-td text-center font-bold text-sage-900 dark:text-sage-50">{Math.round(item.calories || 0)}</td>
                    <td className="md3-table-td text-center">{(item.proteins || 0).toFixed(1)}g</td>
                    <td className="md3-table-td text-center">{(item.carbs || 0).toFixed(1)}g</td>
                    <td className="md3-table-td text-center">{(item.fats || 0).toFixed(1)}g</td>
                    <td className="md3-table-td text-right">
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                        title="Rimuovi alimento"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Layout Mobile */}
          <div className="lg:hidden space-y-4 mb-6">
            {mealData.map((item) => (
              <div key={item.id} className="bg-sage-50/50 dark:bg-surface-container-dark/50 rounded-md3-medium p-4 border border-sage-100 dark:border-sage-800">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-sage-500">Dettaglio Alimento</span>
                  <button onClick={() => removeItem(item.id)} className="text-red-500 p-2" title="Rimuovi alimento"><Trash2 className="w-4 h-4" /></button>
                </div>
                <div className="space-y-4">
                  <FoodAutocomplete
                    value={item.food}
                    onSelect={(food) => handleFoodSelect(item, food)}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-sage-500 ml-1">Grammi</label>
                      <input
                        type="number"
                        value={item.grams || ''}
                        onChange={(e) => handleGramsChange(item, e.target.value)}
                        className="md3-input w-full py-2 font-bold"
                        min="0"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-sage-500 ml-1">Kcal</label>
                      <div className="md3-input w-full py-2 bg-sage-100 dark:bg-surface-dark font-black text-center">{Math.round(item.calories || 0)}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={addItem}
            className="w-full py-4 border-2 border-dashed border-sage-300 dark:border-sage-700 rounded-md3-medium text-sage-500 dark:text-sage-400 hover:text-primary-600 hover:border-primary-500 hover:bg-primary-50/30 transition-all duration-300 flex items-center justify-center space-x-2 font-bold mb-8"
          >
            <Plus className="w-5 h-5" />
            <span className="uppercase tracking-widest text-xs">Aggiungi Alimento</span>
          </button>

          {/* Meal Summary Cards */}
          {totals.calories > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-primary-50 dark:bg-primary-900/10 p-4 rounded-md3-small border border-primary-100 dark:border-primary-800/30">
                <p className="text-[10px] font-black text-primary-700 dark:text-primary-300 uppercase tracking-widest mb-1">Calorie</p>
                <p className="text-xl font-black text-sage-900 dark:text-sage-50">{Math.round(totals.calories)} <span className="text-xs">kcal</span></p>
              </div>
              {balance.evaluations.map(ev => (
                <div key={ev.macro} className={`p-4 rounded-md3-small border ${
                  ev.status === 'ok'
                    ? 'bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-800/30'
                    : 'bg-orange-50 dark:bg-orange-900/10 border-orange-100 dark:border-orange-800/30'
                }`}>
                  <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${
                    ev.status === 'ok' ? 'text-green-700 dark:text-green-300' : 'text-orange-700 dark:text-orange-300'
                  }`}>
                    {ev.macro === 'carbs' ? 'Carboidrati' : ev.macro === 'proteins' ? 'Proteine' : 'Lipidi'}
                  </p>
                  <p className="text-xl font-black text-sage-900 dark:text-sage-50">
                    {(ev.macro === 'carbs' ? totals.carbs : ev.macro === 'proteins' ? totals.proteins : totals.fats).toFixed(1)} <span className="text-xs">g</span>
                  </p>
                  <p className={`text-[10px] font-bold ${ev.status === 'ok' ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
                    {ev.percent.toFixed(0)}% (CREA: {ev.range.min}–{ev.range.max}%)
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Pannello equilibrio CREA */}
          {!balance.isEmpty && !balance.isBalanced && (
            <div className="mb-8 p-5 bg-orange-50 dark:bg-orange-900/10 rounded-md3-medium border border-orange-200 dark:border-orange-800/30">
              <div className="flex items-center space-x-2 mb-3">
                <Scale className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                <span className="font-bold text-orange-900 dark:text-orange-100">Come rendere questo pasto equilibrato</span>
              </div>
              <ul className="space-y-2">
                {balance.suggestions.map((s, i) => (
                  <li key={i} className="text-sm text-orange-800 dark:text-orange-200 flex items-start space-x-2">
                    <span className="mt-1.5 w-1.5 h-1.5 bg-orange-400 rounded-full flex-shrink-0"></span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[10px] text-orange-600/70 dark:text-orange-400/70 uppercase tracking-widest font-bold">
                Riferimento: Linee guida CREA per una sana alimentazione
              </p>
            </div>
          )}

          <PortionOptimizer
            selectedFoods={selectedFoodsForOptimizer}
            onApply={handleApplyOptimization}
            dayName={dayName}
            mealType={title}
          />
        </div>
      )}
    </div>
  );
};
