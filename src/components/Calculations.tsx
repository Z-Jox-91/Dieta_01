import React, { useState, useEffect } from 'react';
import { Calculator, RotateCcw, Target, Settings, Percent } from 'lucide-react';
import { db, auth } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface CalculationData {
  age: number;
  height: number;
  weight: number;
  gender: 'female' | 'male';
  laf: number;
  y: number;
  dailyDeficit: number;
}

interface Results {
  bmi: number;
  idealWeight: number;
  basalMetabolism: number;
  dailyMetabolism: number;
  weeklyMetabolism: number;
  dailyDeficit: number;
  weeklyDeficit: number;
  weeklyCalories: number;
  dailyProteinRda: number;
  weeklyProteinRda: number;
}

interface DailyCalorieLimit {
  [day: string]: number;
}

interface MealNutrientRanges {
  carbs: { min: number; max: number };
  proteins: { min: number; max: number };
  fats: { min: number; max: number };
}

interface DailyMealKcal {
  [day: string]: {
    Colazione: number;
    Pranzo: number;
    Cena: number;
    Spuntino1: number;
    Spuntino2: number;
  };
}

const daysOfWeek = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
const mealTypes = ['Colazione', 'Pranzo', 'Cena', 'Spuntino1', 'Spuntino2'];

export const Calculations: React.FC = () => {
  const [data, setData] = useState<CalculationData>({
    age: 0,
    height: 0,
    weight: 0,
    gender: 'female',
    laf: 1.4,
    y: 0.8,
    dailyDeficit: 275
  });

  const [results, setResults] = useState<Results | null>(null);
  const [isCalculated, setIsCalculated] = useState(false);
  const [dailyCalorieLimits, setDailyCalorieLimits] = useState<DailyCalorieLimit>({});
  
  // Nuovi stati per parametri pasti
  const [mealRanges, setMealRanges] = useState<MealNutrientRanges>({
    carbs: { min: 45, max: 55 },
    proteins: { min: 25, max: 35 },
    fats: { min: 15, max: 25 }
  });
  
  const [dailyMealKcal, setDailyMealKcal] = useState<DailyMealKcal>(
    daysOfWeek.reduce((acc, day) => ({
      ...acc,
      [day]: mealTypes.reduce((mAcc, m) => ({ ...mAcc, [m]: 0 }), {})
    }), {})
  );

  useEffect(() => {
    const loadCalculationsData = async () => {
      if (!auth.currentUser) return;
      
      try {
        // Carica i calcoli
        const calculationsDoc = doc(db, `users/${auth.currentUser.uid}/data/calculations`);
        const calculationsSnapshot = await getDoc(calculationsDoc);
        if (calculationsSnapshot.exists()) {
          const calculationsData = calculationsSnapshot.data();
          setData(calculationsData.data);
          setResults(calculationsData.results);
          setIsCalculated(true);
        }
        
        // Carica i limiti di calorie giornalieri
        const limitsDoc = doc(db, `users/${auth.currentUser.uid}/data/daily_limits`);
        const limitsSnapshot = await getDoc(limitsDoc);
        if (limitsSnapshot.exists()) {
          setDailyCalorieLimits(limitsSnapshot.data() as DailyCalorieLimit);
        }

        // Carica i parametri pasti
        const mealParamsDoc = doc(db, `users/${auth.currentUser.uid}/data/meal_parameters`);
        const mealParamsSnapshot = await getDoc(mealParamsDoc);
        if (mealParamsSnapshot.exists()) {
          const mealParams = mealParamsSnapshot.data();
          if (mealParams.ranges) setMealRanges(mealParams.ranges);
          if (mealParams.dailyMealKcal) setDailyMealKcal(mealParams.dailyMealKcal);
        }
      } catch (error) {
        console.error('Errore nel caricamento dei dati da Firestore:', error);
      }
    };
    
    loadCalculationsData();
  }, []);

  const calculateResults = (): Results => {
    const heightM = data.height / 100;
    const bmi = data.weight / (heightM * heightM);
    const idealWeight = 21.5 * (heightM * heightM);
    
    const basalMetabolism = data.gender === 'female'
      ? 655 + (9.5 * idealWeight) + (1.8 * data.height) - (4.6 * data.age)
      : 66.5 + (13.75 * idealWeight) + (5 * data.height) - (6.75 * data.age);
    
    const dailyMetabolism = basalMetabolism * data.laf;
    const weeklyMetabolism = dailyMetabolism * 7;
    
    const dailyDeficit = data.dailyDeficit || 0;
    const weeklyDeficit = dailyDeficit * 7;
    const weeklyCalories = weeklyMetabolism - weeklyDeficit;
    
    const dailyProteinRda = idealWeight * data.y;
    const weeklyProteinRda = dailyProteinRda * 7;

    return {
      bmi, idealWeight, basalMetabolism, dailyMetabolism, weeklyMetabolism,
      dailyDeficit, weeklyDeficit, weeklyCalories, dailyProteinRda, weeklyProteinRda
    };
  };

  const handleCalculate = async () => {
    const newResults = calculateResults();
    setResults(newResults);
    setIsCalculated(true);
    
    if (auth.currentUser) {
      try {
        await setDoc(doc(db, `users/${auth.currentUser.uid}/data/calculations`), {
          data, results: newResults
        });
      } catch (error) {
        console.error('Errore nel salvataggio dei calcoli:', error);
      }
    }
  };

  const handleMealRangeChange = async (macro: keyof MealNutrientRanges, type: 'min' | 'max', value: string) => {
    const newValue = parseInt(value) || 0;
    const newRanges = {
      ...mealRanges,
      [macro]: { ...mealRanges[macro], [type]: newValue }
    };
    setMealRanges(newRanges);
    
    if (auth.currentUser) {
      try {
        await setDoc(doc(db, `users/${auth.currentUser.uid}/data/meal_parameters`), {
          ranges: newRanges,
          dailyMealKcal
        }, { merge: true });
      } catch (error) {
        console.error('Errore nel salvataggio dei range:', error);
      }
    }
  };

  const handleMealKcalChange = async (day: string, meal: string, value: string) => {
    const newValue = parseInt(value) || 0;
    const newDailyMealKcal = {
      ...dailyMealKcal,
      [day]: { ...dailyMealKcal[day], [meal]: newValue }
    };
    setDailyMealKcal(newDailyMealKcal);
    
    if (auth.currentUser) {
      try {
        await setDoc(doc(db, `users/${auth.currentUser.uid}/data/meal_parameters`), {
          ranges: mealRanges,
          dailyMealKcal: newDailyMealKcal
        }, { merge: true });
      } catch (error) {
        console.error('Errore nel salvataggio kcal pasti:', error);
      }
    }
  };

  const handleDailyLimitChange = async (day: string, value: string) => {
    const newLimits = { ...dailyCalorieLimits };
    newLimits[day] = parseInt(value) || 0;
    setDailyCalorieLimits(newLimits);
    
    if (auth.currentUser) {
      try {
        await setDoc(doc(db, `users/${auth.currentUser.uid}/data/daily_limits`), newLimits);
      } catch (error) {
        console.error('Errore nel salvataggio limiti giornalieri:', error);
      }
    }
  };

  const getTotalWeeklyLimit = (): number => {
    return Object.values(dailyCalorieLimits).reduce((sum, val) => sum + (val || 0), 0);
  };

  const isFormValid = data.age > 0 && data.height > 0 && data.weight > 0;

  const getBmiCategory = (bmi: number): string => {
    if (bmi < 18.5) return "Sottopeso";
    if (bmi < 25) return "Normopeso";
    if (bmi < 30) return "Sovrappeso";
    if (bmi < 35) return "Obesità di classe I";
    if (bmi < 40) return "Obesità di classe II";
    return "Obesità di classe III";
  };

  return (
    <div className="space-y-6 sm:space-y-10">
      {/* Input Form Dati Personali */}
      <div className="md3-card p-6 sm:p-10 border border-sage-200 dark:border-sage-800">
        <div className="flex items-center space-x-4 mb-8">
          <div className="w-12 h-12 bg-primary-600 dark:bg-primary-500 rounded-md3-medium flex items-center justify-center shadow-md3-2">
            <Calculator className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-sage-900 dark:text-sage-50 tracking-tight">Dati Personali</h2>
            <p className="text-sm text-sage-500 font-medium uppercase tracking-wider">Parametri Biometrici</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-bold text-sage-700 dark:text-sage-300 ml-1">Età</label>
            <input type="number" value={data.age || ''} onChange={(e) => setData({...data, age: parseInt(e.target.value) || 0})} className="md3-input w-full" placeholder="Anni" />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-bold text-sage-700 dark:text-sage-300 ml-1">Altezza (cm)</label>
            <input type="number" value={data.height || ''} onChange={(e) => setData({...data, height: parseInt(e.target.value) || 0})} className="md3-input w-full" placeholder="175" />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-bold text-sage-700 dark:text-sage-300 ml-1">Peso (kg)</label>
            <input type="number" value={data.weight || ''} onChange={(e) => setData({...data, weight: parseInt(e.target.value) || 0})} className="md3-input w-full" placeholder="70" />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-bold text-sage-700 dark:text-sage-300 ml-1">Genere</label>
            <select value={data.gender} onChange={(e) => setData({...data, gender: e.target.value as 'female' | 'male'})} className="md3-input w-full appearance-none">
              <option value="female">Donna</option>
              <option value="male">Uomo</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-bold text-sage-700 dark:text-sage-300 ml-1">LAF</label>
            <input type="number" value={data.laf || ''} step="0.05" min="1.45" max="2.1" onChange={(e) => setData({...data, laf: parseFloat(e.target.value) || 1.45})} className="md3-input w-full" />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-bold text-sage-700 dark:text-sage-300 ml-1">Proteine/kg</label>
            <input type="number" value={data.y || ''} step="0.1" min="0.8" max="3" onChange={(e) => setData({...data, y: parseFloat(e.target.value) || 0.8})} className="md3-input w-full" />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-bold text-sage-700 dark:text-sage-300 ml-1">Deficit (kcal)</label>
            <input type="number" value={data.dailyDeficit || ''} onChange={(e) => setData({...data, dailyDeficit: parseInt(e.target.value) || 0})} className="md3-input w-full" />
          </div>
        </div>
        
        <div className="mt-10">
          <button onClick={handleCalculate} disabled={!isFormValid} className={`md3-button-primary w-full sm:w-auto flex items-center justify-center space-x-2 ${!isFormValid ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}>
            <Calculator className="w-5 h-5" />
            <span>Calcola Risultati</span>
          </button>
        </div>
      </div>

      {/* Pannello Parametri di Calcolo Pasti */}
      <div className="md3-card p-6 sm:p-10 border border-accent-200 dark:border-accent-800/30">
        <div className="flex items-center space-x-4 mb-8">
          <div className="w-12 h-12 bg-accent-500 rounded-md3-medium flex items-center justify-center shadow-md3-2">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-sage-900 dark:text-sage-50 tracking-tight">Parametri Calcolo Pasti</h2>
            <p className="text-sm text-sage-500 font-medium uppercase tracking-wider">Target Macronutrienti e Calorie</p>
          </div>
        </div>

        {/* Range Percentuali */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {(['carbs', 'proteins', 'fats'] as const).map((macro) => (
            <div key={macro} className="bg-surface-container-light dark:bg-surface-container-dark p-6 rounded-md3-medium border border-sage-200 dark:border-sage-800">
              <div className="flex items-center space-x-2 mb-4">
                <Percent className="w-4 h-4 text-accent-500" />
                <span className="text-sm font-black uppercase tracking-widest text-sage-700 dark:text-sage-300">
                  {macro === 'carbs' ? 'Carboidrati' : macro === 'proteins' ? 'Proteine' : 'Lipidi'}
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <input
                  type="number"
                  value={mealRanges[macro].min}
                  onChange={(e) => handleMealRangeChange(macro, 'min', e.target.value)}
                  className="md3-input w-full py-2 text-center font-bold"
                  placeholder="Min %"
                />
                <span className="text-sage-400 font-bold">-</span>
                <input
                  type="number"
                  value={mealRanges[macro].max}
                  onChange={(e) => handleMealRangeChange(macro, 'max', e.target.value)}
                  className="md3-input w-full py-2 text-center font-bold"
                  placeholder="Max %"
                />
                <span className="text-sage-600 dark:text-sage-400 font-bold">%</span>
              </div>
            </div>
          ))}
        </div>

        {/* Kcal per Pasto della Settimana */}
        <div className="md3-table-container">
          <div className="overflow-x-auto">
            <table className="md3-table">
              <thead className="md3-table-header">
                <tr>
                  <th className="md3-table-th">Giorno</th>
                  {mealTypes.map(m => <th key={m} className="md3-table-th text-center">{m}</th>)}
                </tr>
              </thead>
              <tbody>
                {daysOfWeek.map((day, idx) => (
                  <tr key={day} className={`md3-table-tr ${idx % 2 === 0 ? '' : 'md3-table-tr-even'}`}>
                    <td className="md3-table-td font-bold text-sage-900 dark:text-sage-100">{day}</td>
                    {mealTypes.map(meal => (
                      <td key={meal} className="md3-table-td p-2">
                        <input
                          type="number"
                          value={dailyMealKcal[day][meal] || ''}
                          onChange={(e) => handleMealKcalChange(day, meal, e.target.value)}
                          className="md3-input w-full py-1 text-center text-xs font-bold"
                          placeholder="kcal"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* Results Section (BMI, MB, TDEE, etc) */}
      {isCalculated && results && (
        <div className="md3-card p-6 sm:p-10 border border-primary-100 dark:border-primary-900/30">
          <div className="flex items-center space-x-4 mb-8">
            <div className="w-12 h-12 bg-primary-600 rounded-md3-medium flex items-center justify-center shadow-md3-2">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-sage-900 dark:text-sage-50 tracking-tight">Risultati Analisi</h3>
              <p className="text-sm text-sage-500 font-medium uppercase tracking-wider">Metabolismo e Target</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-primary-50 dark:bg-primary-900/10 p-6 rounded-md3-medium border border-primary-100 dark:border-primary-800/30">
              <p className="text-xs font-black text-primary-700 dark:text-primary-300 uppercase tracking-widest mb-2">BMI</p>
              <p className="text-3xl font-black text-sage-900 dark:text-sage-50">{results.bmi.toFixed(1)}</p>
              <div className="mt-3 inline-block px-3 py-1 bg-white dark:bg-surface-dark rounded-full text-xs font-bold text-sage-600 dark:text-sage-400 border border-primary-100 dark:border-primary-800">{getBmiCategory(results.bmi)}</div>
            </div>
            <div className="bg-accent-50 dark:bg-accent-900/10 p-6 rounded-md3-medium border border-accent-100 dark:border-accent-800/30">
              <p className="text-xs font-black text-accent-700 dark:text-accent-300 uppercase tracking-widest mb-2">Peso Ideale</p>
              <p className="text-3xl font-black text-sage-900 dark:text-sage-50">{results.idealWeight.toFixed(1)} <span className="text-lg">kg</span></p>
            </div>
            <div className="bg-primary-50 dark:bg-primary-900/10 p-6 rounded-md3-medium border border-primary-100 dark:border-primary-800/30">
              <p className="text-xs font-black text-primary-700 dark:text-primary-300 uppercase tracking-widest mb-2">MB</p>
              <p className="text-3xl font-black text-sage-900 dark:text-sage-50">{Math.round(results.basalMetabolism)} <span className="text-lg">kcal</span></p>
            </div>
            <div className="bg-accent-50 dark:bg-accent-900/10 p-6 rounded-md3-medium border border-accent-100 dark:border-accent-800/30">
              <p className="text-xs font-black text-accent-700 dark:text-accent-300 uppercase tracking-widest mb-2">TDEE</p>
              <p className="text-3xl font-black text-sage-900 dark:text-sage-50">{Math.round(results.dailyMetabolism)} <span className="text-lg">kcal</span></p>
            </div>
            <div className="bg-primary-50 dark:bg-primary-900/10 p-6 rounded-md3-medium border border-primary-100 dark:border-primary-800/30">
              <p className="text-xs font-black text-primary-700 dark:text-primary-300 uppercase tracking-widest mb-2">Deficit</p>
              <p className="text-3xl font-black text-sage-900 dark:text-sage-50">{Math.round(results.dailyDeficit)} <span className="text-lg">kcal</span></p>
            </div>
            <div className="bg-accent-50 dark:bg-accent-900/10 p-6 rounded-md3-medium border border-accent-100 dark:border-accent-800/30">
              <p className="text-xs font-black text-accent-700 dark:text-accent-300 uppercase tracking-widest mb-2">Target Proteico</p>
              <p className="text-3xl font-black text-sage-900 dark:text-sage-50">{results.dailyProteinRda.toFixed(1)} <span className="text-lg">g</span></p>
            </div>
          </div>
          
          {/* Pianificazione Settimanale Kcal Totali */}
          <div className="mt-10 md3-card bg-surface-container-light dark:bg-surface-container-dark p-6 sm:p-8 border border-sage-200 dark:border-sage-800 shadow-none">
            <h3 className="text-xl font-black text-sage-900 dark:text-sage-50 mb-6 flex items-center">
              <Target className="w-6 h-6 text-primary-600 dark:text-primary-400 mr-3" />
              Pianificazione Settimanale Totale
            </h3>
            <div className="md3-table-container">
              <table className="md3-table">
                <thead className="md3-table-header">
                  <tr>
                    <th className="md3-table-th">Giorno</th>
                    <th className="md3-table-th">Target Kcal</th>
                  </tr>
                </thead>
                <tbody>
                  {daysOfWeek.map((day, idx) => (
                    <tr key={day} className={`md3-table-tr ${idx % 2 === 0 ? '' : 'md3-table-tr-even'}`}>
                      <td className="md3-table-td font-bold">{day}</td>
                      <td className="md3-table-td">
                        <input
                          type="number"
                          value={dailyCalorieLimits[day] || ''}
                          onChange={(e) => handleDailyLimitChange(day, e.target.value)}
                          className="md3-input w-full max-w-[150px] py-2 font-bold"
                          placeholder="Kcal"
                        />
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-primary-50 dark:bg-primary-900/20 font-bold">
                    <td className="md3-table-td text-primary-900 dark:text-primary-100">Totale Settimanale Effettivo</td>
                    <td className="md3-table-td text-primary-900 dark:text-primary-100 font-black text-xl">{getTotalWeeklyLimit()} <span className="text-sm">kcal</span></td>
                  </tr>
                  <tr className="bg-accent-50 dark:bg-accent-900/20 font-bold">
                    <td className="md3-table-td text-accent-900 dark:text-accent-100">Calcolo Teorico</td>
                    <td className="md3-table-td text-accent-900 dark:text-accent-100 font-black text-xl">{Math.round(results.weeklyCalories)} <span className="text-sm">kcal</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};