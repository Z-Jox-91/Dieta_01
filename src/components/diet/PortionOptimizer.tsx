import React, { useState, useEffect } from 'react';
import { Target, Calculator, RefreshCw, Check, TrendingUp, Lightbulb, CheckCircle2 } from 'lucide-react';
import { FoodMacroProfile, MacroTarget, optimizePortions, OptimizationResult } from '../../utils/portionOptimizer';
import { CREA_TARGET } from '../../utils/mealBalance';
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
  const [applied, setApplied] = useState(false);
  const [target, setTarget] = useState<MacroTarget>({
    totalCalories: 500,
    carbsPercent: CREA_TARGET.carbsPercent,
    proteinsPercent: CREA_TARGET.proteinsPercent,
    fatsPercent: CREA_TARGET.fatsPercent
  });

  // Carica solo il target calorico del pasto (giorno/tipo pasto) dal database.
  // Le percentuali di macronutrienti seguono sempre le Linee guida CREA (CREA_TARGET),
  // non sono più personalizzabili dall'utente.
  useEffect(() => {
    const loadParams = async () => {
      if (!auth.currentUser) return;
      try {
        const mealParamsDoc = doc(db, `users/${auth.currentUser.uid}/data/meal_parameters`);
        const snapshot = await getDoc(mealParamsDoc);
        const mealKcal = snapshot.exists()
          ? (snapshot.data().dailyMealKcal?.[dayName]?.[mealType] || 500)
          : 500;

        setTarget({
          totalCalories: mealKcal,
          carbsPercent: CREA_TARGET.carbsPercent,
          proteinsPercent: CREA_TARGET.proteinsPercent,
          fatsPercent: CREA_TARGET.fatsPercent
        });
      } catch (e) {
        console.error("Errore caricamento parametri ottimizzatore:", e);
      }
    };
    if (isOpen) loadParams();
  }, [isOpen, dayName, mealType]);

  const handleOptimize = () => {
    const optimizationResult = optimizePortions(selectedFoods, target);
    setResult(optimizationResult);
    setApplied(false);
  };

  const applyResults = () => {
    if (!result) return;
    onApply(result);
    setApplied(true);
  };

  const closePanel = () => {
    setIsOpen(false);
    setResult(null);
    setApplied(false);
  };

  if (selectedFoods.length === 0) return null;

  return (
    <div className="mt-6 pt-6 border-t border-sage-200 dark:border-sage-800">
      <button
        onClick={() => (isOpen ? closePanel() : setIsOpen(true))}
        className="flex items-center space-x-2 px-6 py-3 bg-primary-600 dark:bg-primary-500 text-white rounded-full hover:bg-primary-700 transition-all shadow-lg active:scale-95"
      >
        <Calculator className="w-5 h-5" />
        <span className="font-bold uppercase tracking-wider text-xs">Ottimizzatore Cunzari</span>
      </button>

      {isOpen && (
        <div className="mt-4 bg-white dark:bg-surface-dark p-6 rounded-3xl border border-sage-200 dark:border-sage-800 shadow-2xl animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-lg font-bold text-sage-900 dark:text-sage-50 flex items-center">
              <Target className="w-5 h-5 mr-3 text-primary-500" />
              Target Pasto: {mealType}
            </h4>
            <button onClick={closePanel} className="text-sage-400 hover:text-sage-600 dark:hover:text-sage-200">
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>

          {applied && (
            <div className="mb-6 p-5 bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-200 dark:border-green-800/30 flex items-start space-x-3 animate-in fade-in">
              <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-green-900 dark:text-green-100">Porzioni applicate!</p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  I grammi degli alimenti sono stati aggiornati nella tabella qui sopra. Scorri in alto per vedere i nuovi valori.
                </p>
                <button
                  onClick={closePanel}
                  className="mt-3 text-xs font-bold uppercase tracking-wider text-green-700 dark:text-green-300 underline"
                >
                  Chiudi
                </button>
              </div>
            </div>
          )}

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
                  disabled={applied}
                  className={`flex-[2] py-3 font-bold rounded-2xl shadow-lg flex items-center justify-center space-x-2 transition-all ${
                    applied
                      ? 'bg-sage-300 dark:bg-sage-700 text-sage-600 dark:text-sage-400 cursor-not-allowed'
                      : 'bg-green-500 text-white hover:bg-green-600'
                  }`}
                >
                  <Check className="w-5 h-5" />
                  <span>{applied ? 'Applicato' : `Applica ${result.portions.length} Porzioni`}</span>
                </button>
              </div>
            </div>
          )}

          <p className="mt-6 text-[10px] text-sage-400 dark:text-sage-500 text-center uppercase tracking-widest font-bold">
            Algoritmo Cunzari v2.0 • Gerarchia Nutrizionale Attiva
          </p>
        </div>
      )}
    </div>
  );
};
