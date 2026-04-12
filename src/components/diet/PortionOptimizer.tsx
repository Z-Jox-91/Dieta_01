import React, { useState, useEffect } from 'react';
import { Target, Calculator, RefreshCw, Check, AlertCircle, Info, TrendingUp, Lightbulb } from 'lucide-react';
import { FoodMacroProfile, MacroTarget, optimizePortions, OptimizationResult } from '../../utils/portionOptimizer';
import { db, auth } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';

interface PortionOptimizerProps {
  selectedFoods: FoodMacroProfile[];
  onApply: (result: OptimizationResult) => void;
  dayName: string;
  mealType: string;
}

export const PortionOptimizer: React.FC<PortionOptimizerProps> = ({ 
  selectedFoods, 
  onApply,
  dayName,
  mealType
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [target, setTarget] = useState<MacroTarget>({
    totalCalories: 500,
    carbsPercent: 50,
    proteinsPercent: 30,
    fatsPercent: 20
  });

  // Carica i parametri dal database in base al giorno e al tipo di pasto
  useEffect(() => {
    const loadParams = async () => {
      if (!auth.currentUser) return;
      try {
        const mealParamsDoc = doc(db, `users/${auth.currentUser.uid}/data/meal_parameters`);
        const snapshot = await getDoc(mealParamsDoc);
        if (snapshot.exists()) {
          const data = snapshot.data();
          const mealKcal = data.dailyMealKcal?.[dayName]?.[mealType] || 500;
          const ranges = data.ranges || { carbs: { min: 45, max: 55 }, proteins: { min: 25, max: 35 }, fats: { min: 15, max: 25 } };
          
          setTarget({
            totalCalories: mealKcal,
            carbsPercent: (ranges.carbs.min + ranges.carbs.max) / 2,
            proteinsPercent: (ranges.proteins.min + ranges.proteins.max) / 2,
            fatsPercent: (ranges.fats.min + ranges.fats.max) / 2
          });
        }
      } catch (e) {
        console.error("Errore caricamento parametri ottimizzatore:", e);
      }
    };
    if (isOpen) loadParams();
  }, [isOpen, dayName, mealType]);

  const handleOptimize = () => {
    const optimizationResult = optimizePortions(selectedFoods, target);
    setResult(optimizationResult);
  };

  const applyResults = () => {
    if (!result) return;
    onApply(result);
    setIsOpen(false);
  };

  if (selectedFoods.length === 0) return null;

  return (
    <div className="mt-6 pt-6 border-t border-sage-200 dark:border-sage-800">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-6 py-3 bg-primary-600 dark:bg-primary-500 text-white rounded-full hover:bg-primary-700 transition-all shadow-lg active:scale-95"
      >
        <Calculator className="w-5 h-5" />
        <span className="font-bold uppercase tracking-wider text-xs">Ottimizzatore MacroMind</span>
      </button>

      {isOpen && (
        <div className="mt-4 bg-white dark:bg-surface-dark p-6 rounded-3xl border border-sage-200 dark:border-sage-800 shadow-2xl animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-lg font-bold text-sage-900 dark:text-sage-50 flex items-center">
              <Target className="w-5 h-5 mr-3 text-primary-500" />
              Target Pasto: {mealType}
            </h4>
            <button onClick={() => setIsOpen(false)} className="text-sage-400 hover:text-sage-600 dark:hover:text-sage-200">
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>

          {/* Target Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-sage-50 dark:bg-sage-900/20 p-4 rounded-2xl border border-sage-100 dark:border-sage-800">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-sage-500 mb-1">Calorie</label>
              <div className="text-xl font-bold text-sage-900 dark:text-sage-50">{target.totalCalories} <span className="text-xs">kcal</span></div>
            </div>
            <div className="bg-primary-50 dark:bg-primary-900/10 p-4 rounded-2xl border border-primary-100 dark:border-primary-800/30">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-primary-700 dark:text-primary-300 mb-1">Carbo</label>
              <div className="text-xl font-bold text-sage-900 dark:text-sage-50">{target.carbsPercent}%</div>
            </div>
            <div className="bg-accent-50 dark:bg-accent-900/10 p-4 rounded-2xl border border-accent-100 dark:border-accent-800/30">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-accent-700 dark:text-accent-300 mb-1">Proteine</label>
              <div className="text-xl font-bold text-sage-900 dark:text-sage-50">{target.proteinsPercent}%</div>
            </div>
            <div className="bg-primary-50 dark:bg-primary-900/10 p-4 rounded-2xl border border-primary-100 dark:border-primary-800/30">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-primary-700 dark:text-primary-300 mb-1">Lipidi</label>
              <div className="text-xl font-bold text-sage-900 dark:text-sage-50">{target.fatsPercent}%</div>
            </div>
          </div>

          {!result ? (
            <button
              onClick={handleOptimize}
              className="w-full py-4 bg-accent-500 text-white rounded-2xl font-bold hover:bg-accent-600 transition-all flex items-center justify-center space-x-2"
            >
              <Calculator className="w-5 h-5" />
              <span>Calcola Porzioni Ottimali</span>
            </button>
          ) : (
            <div className="space-y-6 animate-in fade-in duration-500">
              {/* Risultato Ottimizzazione */}
              <div className="p-5 bg-sage-50 dark:bg-sage-900/30 rounded-2xl border border-sage-100 dark:border-sage-800">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className={`w-5 h-5 ${result.isFeasible ? 'text-green-500' : 'text-orange-500'}`} />
                    <span className="font-bold text-sage-900 dark:text-sage-100">Accuratezza Soluzione</span>
                  </div>
                  <span className={`text-lg font-black ${result.accuracy > 90 ? 'text-green-500' : result.accuracy > 70 ? 'text-orange-500' : 'text-red-500'}`}>
                    {Math.round(result.accuracy)}%
                  </span>
                </div>
                <div className="w-full bg-sage-200 dark:bg-sage-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-1000 ${result.accuracy > 90 ? 'bg-green-500' : result.accuracy > 70 ? 'bg-orange-500' : 'bg-red-500'}`}
                    style={{ width: `${result.accuracy}%` }}
                  ></div>
                </div>
              </div>

              {/* Suggerimenti Intelligenti */}
              {result.suggestions && result.suggestions.length > 0 && (
                <div className="p-5 bg-primary-50 dark:bg-primary-900/20 rounded-2xl border border-primary-100 dark:border-primary-800/30">
                  <div className="flex items-center space-x-2 mb-3">
                    <Lightbulb className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                    <span className="font-bold text-primary-900 dark:text-primary-100">Consigli Proattivi</span>
                  </div>
                  <ul className="space-y-2">
                    {result.suggestions.map((s, i) => (
                      <li key={i} className="text-sm text-primary-800 dark:text-primary-300 flex items-start space-x-2">
                        <span className="mt-1.5 w-1.5 h-1.5 bg-primary-400 rounded-full flex-shrink-0"></span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setResult(null)}
                  className="flex-1 py-3 border border-sage-200 dark:border-sage-800 text-sage-600 dark:text-sage-400 font-bold rounded-2xl hover:bg-sage-50 dark:hover:bg-sage-900/50"
                >
                  Ricalcola
                </button>
                <button
                  onClick={applyResults}
                  className="flex-[2] py-3 bg-green-500 text-white font-bold rounded-2xl hover:bg-green-600 shadow-lg flex items-center justify-center space-x-2"
                >
                  <Check className="w-5 h-5" />
                  <span>Applica {result.portions.length} Porzioni</span>
                </button>
              </div>
            </div>
          )}

          <p className="mt-6 text-[10px] text-sage-400 dark:text-sage-500 text-center uppercase tracking-widest font-bold">
            Algoritmo MacroMind v2.0 • Gerarchia Nutrizionale Attiva
          </p>
        </div>
      )}
    </div>
  );
};
