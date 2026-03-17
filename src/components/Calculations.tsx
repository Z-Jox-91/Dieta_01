import React, { useState, useEffect } from 'react';
import { Calculator, RotateCcw, Target } from 'lucide-react';
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

const daysOfWeek = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

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

  useEffect(() => {
    const loadCalculationsData = async () => {
      if (!auth.currentUser) return;
      
      try {
        // Prima controlla se ci sono dati in localStorage da migrare
        const saved = localStorage.getItem('piano_alimentare_calculations');
        if (saved) {
          try {
            const savedData = JSON.parse(saved);
            // Migra i dati da localStorage a Firestore
            await migrateCalculationsToFirestore(savedData);
            // Rimuovi i dati da localStorage dopo la migrazione
            localStorage.removeItem('piano_alimentare_calculations');
            
            // Imposta i dati migrati nello state
            setData(savedData.data);
            setResults(savedData.results);
            setIsCalculated(true);
          } catch (error) {
            console.error('Errore nella migrazione dei calcoli:', error);
          }
        }
        
        // Carica i dati da Firestore
        const calculationsDoc = doc(db, `users/${auth.currentUser.uid}/data/calculations`);
        const calculationsSnapshot = await getDoc(calculationsDoc);
        
        if (calculationsSnapshot.exists()) {
          const calculationsData = calculationsSnapshot.data();
          setData(calculationsData.data);
          setResults(calculationsData.results);
          setIsCalculated(true);
        }
        
        // Carica i limiti di calorie giornalieri
        const savedLimits = localStorage.getItem('piano_alimentare_daily_limits');
        if (savedLimits) {
          try {
            const parsedLimits = JSON.parse(savedLimits);
            // Migra i limiti da localStorage a Firestore
            await migrateLimitsToFirestore(parsedLimits);
            // Rimuovi i dati da localStorage dopo la migrazione
            localStorage.removeItem('piano_alimentare_daily_limits');
            
            // Imposta i limiti migrati nello state
            setDailyCalorieLimits(parsedLimits);
          } catch (error) {
            console.error('Errore nella migrazione dei limiti giornalieri:', error);
          }
        }
        
        // Carica i limiti da Firestore
        const limitsDoc = doc(db, `users/${auth.currentUser.uid}/data/daily_limits`);
        const limitsSnapshot = await getDoc(limitsDoc);
        
        if (limitsSnapshot.exists()) {
          const limitsData = limitsSnapshot.data() as DailyCalorieLimit;
          setDailyCalorieLimits(limitsData);
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
    
    // Usa il valore del deficit giornaliero dal state invece di un valore fisso
    const dailyDeficit = data.dailyDeficit || 0;
    const weeklyDeficit = dailyDeficit * 7;
    const weeklyCalories = weeklyMetabolism - weeklyDeficit;
    
    const dailyProteinRda = idealWeight * data.y;
    const weeklyProteinRda = dailyProteinRda * 7;

    return {
      bmi,
      idealWeight,
      basalMetabolism,
      dailyMetabolism,
      weeklyMetabolism,
      dailyDeficit,
      weeklyDeficit,
      weeklyCalories,
      dailyProteinRda,
      weeklyProteinRda
    };
  };

  // Funzione per migrare i calcoli da localStorage a Firestore
  const migrateCalculationsToFirestore = async (calculationsData: any) => {
    if (!auth.currentUser) return;
    
    try {
      const calculationsDoc = doc(db, `users/${auth.currentUser.uid}/data/calculations`);
      await setDoc(calculationsDoc, calculationsData);
      console.log('Migrazione dei calcoli completata con successo');
    } catch (error) {
      console.error('Errore durante la migrazione dei calcoli:', error);
    }
  };
  
  // Funzione per migrare i limiti giornalieri da localStorage a Firestore
  const migrateLimitsToFirestore = async (limitsData: DailyCalorieLimit) => {
    if (!auth.currentUser) return;
    
    try {
      const limitsDoc = doc(db, `users/${auth.currentUser.uid}/data/daily_limits`);
      await setDoc(limitsDoc, limitsData);
      console.log('Migrazione dei limiti giornalieri completata con successo');
    } catch (error) {
      console.error('Errore durante la migrazione dei limiti giornalieri:', error);
    }
  };
  
  const handleCalculate = async () => {
    const newResults = calculateResults();
    setResults(newResults);
    setIsCalculated(true);
    
    // Salva i dati e i risultati in Firestore
    if (auth.currentUser) {
      try {
        const calculationsData = {
          data,
          results: newResults
        };
        
        const calculationsDoc = doc(db, `users/${auth.currentUser.uid}/data/calculations`);
        await setDoc(calculationsDoc, calculationsData);
      } catch (error) {
        console.error('Errore nel salvataggio dei calcoli su Firestore:', error);
      }
    } else {
      console.error('Utente non autenticato, impossibile salvare i calcoli');
    }
  };

  const handleReset = async () => {
    setData({
      age: 0,
      height: 0,
      weight: 0,
      gender: 'female',
      laf: 1.4,
      y: 0.8,
      dailyDeficit: 275
    });
    setResults(null);
    setIsCalculated(false);
    
    // Rimuovi i dati da Firestore
    if (auth.currentUser) {
      try {
        const calculationsDoc = doc(db, `users/${auth.currentUser.uid}/data/calculations`);
        await setDoc(calculationsDoc, {});
      } catch (error) {
        console.error('Errore nella rimozione dei calcoli da Firestore:', error);
      }
    }
  };

  const handleDailyLimitChange = async (day: string, value: string) => {
    const newLimits = { ...dailyCalorieLimits };
    newLimits[day] = parseInt(value) || 0;
    setDailyCalorieLimits(newLimits);
    
    // Salva i limiti giornalieri in Firestore
    if (auth.currentUser) {
      try {
        const limitsDoc = doc(db, `users/${auth.currentUser.uid}/data/daily_limits`);
        await setDoc(limitsDoc, newLimits);
      } catch (error) {
        console.error('Errore nel salvataggio dei limiti giornalieri su Firestore:', error);
      }
    } else {
      console.error('Utente non autenticato, impossibile salvare i limiti giornalieri');
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
      {/* Input Form */}
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
            <label htmlFor="age" className="block text-sm font-bold text-sage-700 dark:text-sage-300 ml-1">Età</label>
            <input
              type="number"
              id="age"
              value={data.age || ''}
              onChange={(e) => setData({...data, age: parseInt(e.target.value) || 0})}
              className="md3-input w-full"
              placeholder="Anni"
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="height" className="block text-sm font-bold text-sage-700 dark:text-sage-300 ml-1">Altezza (cm)</label>
            <input
              type="number"
              id="height"
              value={data.height || ''}
              onChange={(e) => setData({...data, height: parseInt(e.target.value) || 0})}
              className="md3-input w-full"
              placeholder="175"
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="weight" className="block text-sm font-bold text-sage-700 dark:text-sage-300 ml-1">Peso (kg)</label>
            <input
              type="number"
              id="weight"
              value={data.weight || ''}
              onChange={(e) => setData({...data, weight: parseInt(e.target.value) || 0})}
              className="md3-input w-full"
              placeholder="70"
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="gender" className="block text-sm font-bold text-sage-700 dark:text-sage-300 ml-1">Genere</label>
            <select
              id="gender"
              value={data.gender}
              onChange={(e) => setData({...data, gender: e.target.value as 'female' | 'male'})}
              className="md3-input w-full appearance-none"
            >
              <option value="female">Donna</option>
              <option value="male">Uomo</option>
            </select>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="laf" className="block text-sm font-bold text-sage-700 dark:text-sage-300 ml-1">LAF (Livello Attività)</label>
            <input
              type="number"
              id="laf"
              value={data.laf || ''}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                const validValue = Math.min(Math.max(value, 1.45), 2.1);
                const roundedValue = Math.round(validValue * 20) / 20;
                setData({...data, laf: roundedValue});
              }}
              step="0.05"
              min="1.45"
              max="2.1"
              className="md3-input w-full"
              placeholder="1.45 - 2.1"
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="y" className="block text-sm font-bold text-sage-700 dark:text-sage-300 ml-1">Proteine per kg</label>
            <input
              type="number"
              id="y"
              value={data.y || ''}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                const validValue = Math.min(Math.max(value, 0.8), 3);
                setData({...data, y: validValue});
              }}
              step="0.1"
              min="0.8"
              max="3"
              className="md3-input w-full"
              placeholder="0.8 - 3.0"
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="dailyDeficit" className="block text-sm font-bold text-sage-700 dark:text-sage-300 ml-1">Deficit (kcal)</label>
            <input
              type="number"
              id="dailyDeficit"
              value={data.dailyDeficit || ''}
              onChange={(e) => setData({...data, dailyDeficit: parseInt(e.target.value) || 0})}
              className="md3-input w-full"
              placeholder="200"
            />
          </div>
        </div>
        
        <div className="mt-10 flex flex-col sm:flex-row gap-4">
          <button
            onClick={handleCalculate}
            disabled={!isFormValid}
            className={`md3-button-primary flex-1 flex items-center justify-center space-x-2 ${
              !isFormValid ? 'opacity-50 grayscale cursor-not-allowed' : ''
            }`}
          >
            <Calculator className="w-5 h-5" />
            <span>Calcola Risultati</span>
          </button>
          
          <button
            onClick={handleReset}
            className="px-8 py-3 bg-sage-100 dark:bg-surface-container-dark text-sage-700 dark:text-sage-300 rounded-full font-bold hover:bg-sage-200 dark:hover:bg-surface-dark transition-all flex items-center justify-center space-x-2"
          >
            <RotateCcw className="w-5 h-5" />
            <span>Reset</span>
          </button>
        </div>
      </div>
      
      {/* Results Section */}
      {isCalculated && results && (
        <div className="md3-card p-6 sm:p-10 border border-primary-100 dark:border-primary-900/30">
          <div className="flex items-center space-x-4 mb-8">
            <div className="w-12 h-12 bg-accent-500 rounded-md3-medium flex items-center justify-center shadow-md3-2">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-sage-900 dark:text-sage-50 tracking-tight">Analisi Nutrizionale</h3>
              <p className="text-sm text-sage-500 font-medium uppercase tracking-wider">Target Suggeriti</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-primary-50 dark:bg-primary-900/10 p-6 rounded-md3-medium border border-primary-100 dark:border-primary-800/30">
              <p className="text-xs font-black text-primary-700 dark:text-primary-300 uppercase tracking-widest mb-2">BMI</p>
              <p className="text-3xl font-black text-sage-900 dark:text-sage-50">{results.bmi.toFixed(1)}</p>
              <div className="mt-3 inline-block px-3 py-1 bg-white dark:bg-surface-dark rounded-full text-xs font-bold text-sage-600 dark:text-sage-400 border border-primary-100 dark:border-primary-800">
                {getBmiCategory(results.bmi)}
              </div>
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
          
          {/* Tabella limiti calorie giornalieri */}
          <div className="mt-10 md3-card bg-surface-container-light dark:bg-surface-container-dark p-6 sm:p-8 border border-sage-200 dark:border-sage-800 shadow-none">
            <h3 className="text-xl font-black text-sage-900 dark:text-sage-50 mb-6 flex items-center">
              <Target className="w-6 h-6 text-primary-600 dark:text-primary-400 mr-3" />
              Pianificazione Settimanale
            </h3>
            <div className="overflow-x-auto rounded-md3-medium border border-sage-200 dark:border-sage-800">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-primary-100 dark:bg-primary-900/30">
                    <th className="px-6 py-4 text-left text-primary-900 dark:text-primary-100 font-black uppercase tracking-widest text-xs">Giorno</th>
                    <th className="px-6 py-4 text-left text-primary-900 dark:text-primary-100 font-black uppercase tracking-widest text-xs">Target Kcal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sage-200 dark:divide-sage-800">
                  {daysOfWeek.map((day) => (
                    <tr key={day} className="bg-white dark:bg-surface-dark hover:bg-sage-50 dark:hover:bg-surface-container-dark transition-colors">
                      <td className="px-6 py-4 text-sage-700 dark:text-sage-300 font-bold">{day}</td>
                      <td className="px-6 py-4">
                        <input
                          type="number"
                          value={dailyCalorieLimits[day] || ''}
                          onChange={(e) => handleDailyLimitChange(day, e.target.value)}
                          className="w-full max-w-[150px] px-4 py-2 bg-sage-50 dark:bg-surface-container-dark border-none rounded-md3-small focus:ring-2 focus:ring-primary-500 transition-all font-bold text-sage-900 dark:text-sage-50"
                          placeholder="Kcal"
                        />
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-primary-50 dark:bg-primary-900/20 font-bold">
                    <td className="px-6 py-4 text-primary-900 dark:text-primary-100">Totale Settimanale</td>
                    <td className="px-6 py-4 text-primary-900 dark:text-primary-100 font-black text-xl">{getTotalWeeklyLimit()} <span className="text-sm">kcal</span></td>
                  </tr>
                  <tr className="bg-accent-50 dark:bg-accent-900/20 font-bold">
                    <td className="px-6 py-4 text-accent-900 dark:text-accent-100">Calcolo Teorico</td>
                    <td className="px-6 py-4 text-accent-900 dark:text-accent-100 font-black text-xl">{Math.round(results.weeklyCalories)} <span className="text-sm">kcal</span></td>
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