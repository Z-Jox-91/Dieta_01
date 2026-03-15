import React, { useState } from 'react';
import { Target, Calculator, RefreshCw, Sliders, Check } from 'lucide-react';
import { FoodMacroProfile, MacroTarget, optimizePortions } from '../../utils/portionOptimizer';

interface PortionOptimizerProps {
  selectedFoods: FoodMacroProfile[];
  onApply: (optimizedGrams: { [foodId: string]: number }) => void;
  currentCalories: number;
}

export const PortionOptimizer: React.FC<PortionOptimizerProps> = ({ 
  selectedFoods, 
  onApply,
  currentCalories 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [target, setTarget] = useState<MacroTarget>({
    totalCalories: currentCalories || 500,
    carbsPercent: 50,
    proteinsPercent: 30,
    fatsPercent: 20
  });

  const [constraints, setConstraints] = useState<{ [foodId: string]: { min: number, max: number } }>(
    selectedFoods.reduce((acc, food) => ({
      ...acc,
      [food.id]: { min: 0, max: 1000 }
    }), {})
  );

  const handleOptimize = () => {
    const foodsWithConstraints = selectedFoods.map(food => ({
      ...food,
      minGrams: constraints[food.id]?.min || 0,
      maxGrams: constraints[food.id]?.max || 1000
    }));

    const results = optimizePortions(foodsWithConstraints, target);
    const optimizedGrams: { [foodId: string]: number } = {};
    results.forEach(res => {
      optimizedGrams[res.foodId] = res.grams;
    });

    onApply(optimizedGrams);
    setIsOpen(false);
  };

  const updateConstraint = (foodId: string, type: 'min' | 'max', value: number) => {
    setConstraints(prev => ({
      ...prev,
      [foodId]: { ...prev[foodId], [type]: value }
    }));
  };

  if (selectedFoods.length === 0) return null;

  return (
    <div className="mt-4 border-t border-sage-200 pt-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition-colors shadow-sm"
      >
        <Calculator className="w-4 h-4" />
        <span>Ottimizzatore Porzioni Automatico</span>
      </button>

      {isOpen && (
        <div className="mt-4 p-6 bg-white rounded-2xl border border-sage-200 shadow-xl animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-lg font-bold text-sage-900 flex items-center">
              <Target className="w-5 h-5 mr-2 text-accent-500" />
              Target Nutrizionali
            </h4>
            <button onClick={() => setIsOpen(false)} className="text-sage-400 hover:text-sage-600">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-sage-700">Calorie Totali</label>
              <input
                type="number"
                value={target.totalCalories}
                onChange={(e) => setTarget(prev => ({ ...prev, totalCalories: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-sage-200 rounded-lg focus:ring-2 focus:ring-accent-500"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-sage-700">Carboidrati (%)</label>
              <input
                type="number"
                value={target.carbsPercent}
                onChange={(e) => setTarget(prev => ({ ...prev, carbsPercent: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-sage-200 rounded-lg focus:ring-2 focus:ring-accent-500"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-sage-700">Proteine (%)</label>
              <input
                type="number"
                value={target.proteinsPercent}
                onChange={(e) => setTarget(prev => ({ ...prev, proteinsPercent: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-sage-200 rounded-lg focus:ring-2 focus:ring-accent-500"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-sage-700">Grassi (%)</label>
              <input
                type="number"
                value={target.fatsPercent}
                onChange={(e) => setTarget(prev => ({ ...prev, fatsPercent: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-sage-200 rounded-lg focus:ring-2 focus:ring-accent-500"
              />
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <h5 className="text-sm font-bold text-sage-900 flex items-center">
              <Sliders className="w-4 h-4 mr-2 text-sage-500" />
              Vincoli Grammi Alimenti
            </h5>
            <div className="max-h-60 overflow-y-auto pr-2 space-y-3">
              {selectedFoods.map(food => (
                <div key={food.id} className="flex flex-wrap items-center justify-between p-3 bg-sage-50 rounded-xl border border-sage-100 gap-4">
                  <span className="text-sm font-medium text-sage-700 flex-1 min-w-[150px]">{food.name}</span>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-sage-500 uppercase font-semibold">Min</span>
                      <input
                        type="number"
                        value={constraints[food.id]?.min}
                        onChange={(e) => updateConstraint(food.id, 'min', parseFloat(e.target.value) || 0)}
                        className="w-20 px-2 py-1 border border-sage-200 rounded-md text-sm"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-sage-500 uppercase font-semibold">Max</span>
                      <input
                        type="number"
                        value={constraints[food.id]?.max}
                        onChange={(e) => updateConstraint(food.id, 'max', parseFloat(e.target.value) || 0)}
                        className="w-20 px-2 py-1 border border-sage-200 rounded-md text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-sage-100">
            <button
              onClick={() => setIsOpen(false)}
              className="px-6 py-2 border border-sage-300 text-sage-600 rounded-xl hover:bg-sage-50 transition-colors"
            >
              Annulla
            </button>
            <button
              onClick={handleOptimize}
              className="px-6 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors flex items-center shadow-md"
            >
              <Check className="w-4 h-4 mr-2" />
              Applica Ottimizzazione
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
