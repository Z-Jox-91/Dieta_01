import React, { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, Calculator } from 'lucide-react';
import { FoodAutocomplete } from './FoodAutocomplete';
import { PortionOptimizer } from './PortionOptimizer';
import { FoodMacroProfile } from '../../utils/portionOptimizer';

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
  dayName: string; // Aggiunto per l'ottimizzatore
}

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
      grams: 100, // Default 100g
      calories: 0,
      proteins: 0,
      carbs: 0,
      fats: 0,
      category: ''
    };
    onUpdate([...mealData, newItem]);
  };

  const updateItem = (id: string, updates: Partial<MealItem>) => {
    const updatedData = mealData.map(item => 
      item.id === id ? { ...item, ...updates } : item
    );
    onUpdate(updatedData);
  };

  const removeItem = (id: string) => {
    onUpdate(mealData.filter(item => item.id !== id));
  };

  const calculateTotals = () => {
    return mealData.reduce((totals, item) => ({
      calories: totals.calories + (item.calories || 0),
      proteins: totals.proteins + (item.proteins || 0),
      carbs: totals.carbs + (item.carbs || 0),
      fats: totals.fats + (item.fats || 0)
    }), { calories: 0, proteins: 0, carbs: 0, fats: 0 });
  };

  const handleApplyOptimization = (optimizedGrams: { [foodId: string]: number }) => {
    const updatedData = mealData.map(item => {
      if (optimizedGrams[item.id] !== undefined) {
        const grams = optimizedGrams[item.id];
        const baseCalories = item.baseCalories || (item.calories / (item.grams || 1)) * 100;
        const baseProteins = item.baseProteins || (item.proteins / (item.grams || 1)) * 100;
        const baseCarbs = item.baseCarbs || (item.carbs / (item.grams || 1)) * 100;
        const baseFats = item.baseFats || (item.fats / (item.grams || 1)) * 100;

        return {
          ...item,
          grams,
          calories: (baseCalories * grams) / 100,
          proteins: (baseProteins * grams) / 100,
          carbs: (baseCarbs * grams) / 100,
          fats: (baseFats * grams) / 100
        };
      }
      return item;
    });
    onUpdate(updatedData);
  };

  const selectedFoodsForOptimizer: FoodMacroProfile[] = mealData
    .filter(item => item.food)
    .map(item => ({
      id: item.id,
      name: item.food,
      caloriesPer100g: item.baseCalories || (item.calories / (item.grams || 1)) * 100,
      carbsPer100g: item.baseCarbs || (item.carbs / (item.grams || 1)) * 100,
      proteinsPer100g: item.baseProteins || (item.proteins / (item.grams || 1)) * 100,
      fatsPer100g: item.baseFats || (item.fats / (item.grams || 1)) * 100
    }));

  const totals = calculateTotals();

  return (
    <div className="md3-card border border-sage-200 dark:border-sage-800 overflow-hidden shadow-none">
      <div 
        className="p-6 cursor-pointer hover:bg-sage-50/50 dark:hover:bg-surface-container-dark/50 transition-colors duration-200 border-b border-sage-100 dark:border-sage-800"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-black text-sage-900 dark:text-sage-50 tracking-tight">{title}</h3>
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
                  <th className="md3-table-th text-center">Energia</th>
                  <th className="md3-table-th text-center">Proteine</th>
                  <th className="md3-table-th text-center">Carbo</th>
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
                        onChange={(food, nutritionalData) => {
                          const grams = item.grams || 100;
                          updateItem(item.id, {
                            food,
                            ...nutritionalData,
                            grams,
                            baseCalories: (nutritionalData.calories / grams) * 100,
                            baseProteins: (nutritionalData.proteins / grams) * 100,
                            baseCarbs: (nutritionalData.carbs / grams) * 100,
                            baseFats: (nutritionalData.fats / grams) * 100,
                          });
                        }}
                        grams={item.grams}
                      />
                    </td>
                    <td className="md3-table-td text-center">
                      <input
                        type="number"
                        value={item.grams || ''}
                        onChange={(e) => {
                          const grams = parseFloat(e.target.value) || 0;
                          if (item.food && item.baseCalories) {
                            updateItem(item.id, {
                              grams,
                              calories: (item.baseCalories * grams) / 100,
                              proteins: (item.baseProteins! * grams) / 100,
                              carbs: (item.baseCarbs! * grams) / 100,
                              fats: (item.baseFats! * grams) / 100
                            });
                          } else {
                            updateItem(item.id, { grams });
                          }
                        }}
                        className="md3-input py-1.5 px-3 text-center w-24 font-bold"
                        placeholder="0"
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
                  <button onClick={() => removeItem(item.id)} className="text-red-500 p-2"><Trash2 className="w-4 h-4" /></button>
                </div>
                <div className="space-y-4">
                  <FoodAutocomplete
                    value={item.food}
                    onChange={(food, nutritionalData) => {
                      const grams = item.grams || 100;
                      updateItem(item.id, {
                        food,
                        ...nutritionalData,
                        grams,
                        baseCalories: (nutritionalData.calories / grams) * 100,
                        baseProteins: (nutritionalData.proteins / grams) * 100,
                        baseCarbs: (nutritionalData.carbs / grams) * 100,
                        baseFats: (nutritionalData.fats / grams) * 100,
                      });
                    }}
                    grams={item.grams}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-sage-500 ml-1">Grammi</label>
                      <input
                        type="number"
                        value={item.grams || ''}
                        onChange={(e) => {
                          const grams = parseFloat(e.target.value) || 0;
                          if (item.food && item.baseCalories) {
                            updateItem(item.id, {
                              grams,
                              calories: (item.baseCalories * grams) / 100,
                              proteins: (item.baseProteins! * grams) / 100,
                              carbs: (item.baseCarbs! * grams) / 100,
                              fats: (item.baseFats! * grams) / 100
                            });
                          } else {
                            updateItem(item.id, { grams });
                          }
                        }}
                        className="md3-input w-full py-2 font-bold"
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
              <div className="bg-accent-50 dark:bg-accent-900/10 p-4 rounded-md3-small border border-accent-100 dark:border-accent-800/30">
                <p className="text-[10px] font-black text-accent-700 dark:text-accent-300 uppercase tracking-widest mb-1">Proteine</p>
                <p className="text-xl font-black text-sage-900 dark:text-sage-50">{totals.proteins.toFixed(1)} <span className="text-xs">g</span></p>
                <p className="text-[10px] font-bold text-accent-600">{((totals.proteins * 4) / totals.calories * 100).toFixed(0)}%</p>
              </div>
              <div className="bg-primary-50 dark:bg-primary-900/10 p-4 rounded-md3-small border border-primary-100 dark:border-primary-800/30">
                <p className="text-[10px] font-black text-primary-700 dark:text-primary-300 uppercase tracking-widest mb-1">Carbo</p>
                <p className="text-xl font-black text-sage-900 dark:text-sage-50">{totals.carbs.toFixed(1)} <span className="text-xs">g</span></p>
                <p className="text-[10px] font-bold text-primary-600">{((totals.carbs * 4) / totals.calories * 100).toFixed(0)}%</p>
              </div>
              <div className="bg-accent-50 dark:bg-accent-900/10 p-4 rounded-md3-small border border-accent-100 dark:border-accent-800/30">
                <p className="text-[10px] font-black text-accent-700 dark:text-accent-300 uppercase tracking-widest mb-1">Lipidi</p>
                <p className="text-xl font-black text-sage-900 dark:text-sage-50">{totals.fats.toFixed(1)} <span className="text-xs">g</span></p>
                <p className="text-[10px] font-bold text-accent-600">{((totals.fats * 9) / totals.calories * 100).toFixed(0)}%</p>
              </div>
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