import React, { useEffect, useState } from 'react';
import { Zap, Target } from 'lucide-react';
import { db, auth } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';

interface DayStatsProps {
  dayData: any;
  selectedDay: number;
}

export const DayStats: React.FC<DayStatsProps> = ({ dayData, selectedDay }) => {
  const [calorieLimit, setCalorieLimit] = useState<number | null>(null);
  const [proteinGoal, setProteinGoal] = useState<number | null>(null);
  const daysOfWeek = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
  
  useEffect(() => {
    const loadData = async () => {
      if (!auth.currentUser) return;
      
      try {
        // Carica i limiti di calorie giornalieri da Firestore
        const limitsDoc = doc(db, `users/${auth.currentUser.uid}/data/daily_limits`);
        const limitsSnapshot = await getDoc(limitsDoc);
        
        if (limitsSnapshot.exists()) {
          const limitsData = limitsSnapshot.data();
          const dayName = daysOfWeek[selectedDay];
          setCalorieLimit(limitsData[dayName] || null);
        }
        
        // Carica l'obiettivo proteico giornaliero da Firestore
        const calculationsDoc = doc(db, `users/${auth.currentUser.uid}/data/calculations`);
        const calculationsSnapshot = await getDoc(calculationsDoc);
        
        if (calculationsSnapshot.exists()) {
          const calculationsData = calculationsSnapshot.data();
          if (calculationsData.results && calculationsData.results.dailyProteinRda) {
            setProteinGoal(calculationsData.results.dailyProteinRda);
          }
        }
      } catch (error) {
        console.error('Errore nel caricamento dei dati da Firestore:', error);
        setCalorieLimit(null);
        setProteinGoal(null);
      }
    };
    
    loadData();
  }, [selectedDay]);

  const calculateTotals = () => {
    let totalCalories = 0;
    let totalProteins = 0;

    // Verifica che dayData sia un oggetto valido
    if (!dayData || typeof dayData !== 'object') {
      return { totalCalories, totalProteins };
    }

    Object.values(dayData).forEach((meal: any) => {
      if (Array.isArray(meal)) {
        meal.forEach((item: any) => {
          if (item && typeof item === 'object') {
            totalCalories += item.calories || 0;
            totalProteins += item.proteins || 0;
          }
        });
      }
    });

    return { totalCalories, totalProteins };
  };

  const { totalCalories, totalProteins } = calculateTotals();

  const caloriePercent = calorieLimit ? Math.min(100, (totalCalories / calorieLimit) * 100) : null;
  const proteinPercent = proteinGoal ? Math.min(100, (totalProteins / proteinGoal) * 100) : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="md3-card p-6 border border-primary-100 dark:border-primary-800/30">
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-md3-small flex items-center justify-center">
            <Zap className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <h3 className="text-lg font-bold text-sage-900 dark:text-sage-50 mb-0">Calorie Totali</h3>
        </div>
        <div className="flex items-end space-x-2 mt-3">
          <p className="text-3xl font-black text-sage-900 dark:text-sage-50">{Math.round(totalCalories)}</p>
          {calorieLimit && (
            <p className="text-lg text-sage-500 dark:text-sage-400 mb-1">/ {calorieLimit} kcal</p>
          )}
        </div>
        {caloriePercent !== null ? (
          <div className="mt-3">
            <div className="w-full bg-sage-100 dark:bg-sage-800 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  totalCalories > (calorieLimit || 0) ? 'bg-red-500' : 'bg-primary-500'
                }`}
                style={{ width: `${caloriePercent}%` }}
              ></div>
            </div>
            <p className="text-xs text-sage-500 dark:text-sage-400 mt-1">
              {totalCalories > (calorieLimit || 0)
                ? `Limite giornaliero superato di ${Math.round(totalCalories - (calorieLimit || 0))} kcal`
                : `${Math.round((calorieLimit || 0) - totalCalories)} kcal ancora disponibili`}
            </p>
          </div>
        ) : (
          <p className="text-sm text-sage-500 dark:text-sage-400 mt-1">kcal giornaliere • imposta un target nella scheda Calcoli</p>
        )}
      </div>

      <div className="md3-card p-6 border border-accent-100 dark:border-accent-800/30">
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-10 h-10 bg-accent-100 dark:bg-accent-900/30 rounded-md3-small flex items-center justify-center">
            <Target className="w-5 h-5 text-accent-600 dark:text-accent-400" />
          </div>
          <h3 className="text-lg font-bold text-sage-900 dark:text-sage-50 mb-0">Proteine Totali</h3>
        </div>
        <div className="flex items-end space-x-2 mt-3">
          <p className="text-3xl font-black text-sage-900 dark:text-sage-50">{totalProteins.toFixed(1)}</p>
          {proteinGoal && (
            <p className="text-lg text-sage-500 dark:text-sage-400 mb-1">/ {proteinGoal.toFixed(1)} g</p>
          )}
        </div>
        {proteinPercent !== null ? (
          <div className="mt-3">
            <div className="w-full bg-sage-100 dark:bg-sage-800 h-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent-500 rounded-full transition-all duration-700"
                style={{ width: `${proteinPercent}%` }}
              ></div>
            </div>
            <p className="text-xs text-sage-500 dark:text-sage-400 mt-1">{proteinPercent.toFixed(0)}% dell'obiettivo proteico</p>
          </div>
        ) : (
          <p className="text-sm text-sage-500 dark:text-sage-400 mt-1">grammi giornalieri • calcola l'obiettivo nella scheda Calcoli</p>
        )}
      </div>
    </div>
  );
};