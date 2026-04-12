import React, { useState, useEffect } from 'react';
import { Target, Calculator, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { FoodMacroProfile, MacroTarget, optimizePortions } from '../../utils/portionOptimizer';
import { db, auth } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';

interface PortionOptimizerProps {
  selectedFoods: FoodMacroProfile[];
  onApply: (optimizedGrams: { [foodId: string]: number }) => void;
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
  const [error, setError] = useState<string | null>(null);
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
    setError(null);
    const results = optimizePortions(selectedFoods, target);
    
    // Validazione real-time dei risultati
    if (results.some(r => r.grams === 0) && selectedFoods.length > 0) {
      setError("Impossibile trovare una soluzione ottimale con questi alimenti. Prova a cambiare combinazione.");
      return;
    }

    const optimizedGrams: { [foodId: string]: number } = {};
    results.forEach(res => {
      optimizedGrams[res.foodId] = res.grams;
    });

    onApply(optimizedGrams);
    setIsOpen(false);
  };

  if (selectedFoods.length === 0) return null;

  return (
    <div className="mt-6 pt-6 border-t border-sage-200 dark:border-sage-800">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-6 py-3 bg-accent-500 text-white rounded-full hover:bg-accent-600 transition-all shadow-md3-1 hover:shadow-md3-2 active:scale-95"
      >
        <Calculator className="w-5 h-5" />
        <span className="font-bold uppercase tracking-wider text-xs">Ottimizzazione Automatica MacroMind</span>
      </button>

      {isOpen && (
        <div className="mt-4 md3-card p-6 border border-accent-100 dark:border-accent-900/30 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-lg font-black text-sage-900 dark:text-sage-50 flex items-center">
              <Target className="w-5 h-5 mr-3 text-accent-500" />
              Target Pasto: {mealType} ({dayName})
            </h4>
            <button onClick={() => setIsOpen(false)} className="text-sage-400 hover:text-sage-600 dark:hover:text-sage-200 transition-colors">
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md3-small flex items-center space-x-3 text-red-600 dark:text-red-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-surface-container-light dark:bg-surface-container-dark p-4 rounded-md3-small border border-sage-100 dark:border-sage-800">
              <label className="block text-[10px] font-black uppercase tracking-widest text-sage-500 mb-1">Calorie</label>
              <div className="text-xl font-black text-sage-900 dark:text-sage-50">{target.totalCalories} <span className="text-xs">kcal</span></div>
            </div>
            <div className="bg-primary-50 dark:bg-primary-900/10 p-4 rounded-md3-small border border-primary-100 dark:border-primary-800/30">
              <label className="block text-[10px] font-black uppercase tracking-widest text-primary-700 dark:text-primary-300 mb-1">Carboidrati</label>
              <div className="text-xl font-black text-sage-900 dark:text-sage-50">{target.carbsPercent}%</div>
            </div>
            <div className="bg-accent-50 dark:bg-accent-900/10 p-4 rounded-md3-small border border-accent-100 dark:border-accent-800/30">
              <label className="block text-[10px] font-black uppercase tracking-widest text-accent-700 dark:text-accent-300 mb-1">Proteine</label>
              <div className="text-xl font-black text-sage-900 dark:text-sage-50">{target.proteinsPercent}%</div>
            </div>
            <div className="bg-primary-50 dark:bg-primary-900/10 p-4 rounded-md3-small border border-primary-100 dark:border-primary-800/30">
              <label className="block text-[10px] font-black uppercase tracking-widest text-primary-700 dark:text-primary-300 mb-1">Lipidi</label>
              <div className="text-xl font-black text-sage-900 dark:text-sage-50">{target.fatsPercent}%</div>
            </div>
          </div>

          <p className="text-xs text-sage-500 dark:text-sage-400 mb-6 italic">
            * I target sono calcolati automaticamente in base ai parametri impostati nella scheda "Calcoli".
          </p>

          <div className="flex justify-end space-x-3 pt-6 border-t border-sage-100 dark:border-sage-800">
            <button
              onClick={() => setIsOpen(false)}
              className="px-6 py-2 text-sage-600 dark:text-sage-400 font-bold hover:bg-sage-100 dark:hover:bg-sage-800 rounded-full transition-colors"
            >
              Annulla
            </button>
            <button
              onClick={handleOptimize}
              className="md3-button-primary px-8 flex items-center shadow-md3-2"
            >
              <Check className="w-5 h-5 mr-2" />
              Ottimizza Porzioni
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
