import React, { useState, useEffect } from 'react';
import { Calculator, Target, Settings, Info, ChevronDown, ChevronUp, Lock } from 'lucide-react';
import { db, auth } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { CREA_RANGES } from '../utils/mealBalance';

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

interface DailyMealKcal {
  [day: string]: {
    [meal: string]: number;
  };
}

type SectionId = 'personal' | 'results' | 'weekly' | 'meals';

const daysOfWeek = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
const mealTypes = ['Colazione', 'Pranzo', 'Cena', 'Spuntino1', 'Spuntino2'];

interface AccordionSectionProps {
  step: number;
  icon: React.ElementType;
  title: string;
  subtitle: string;
  isOpen: boolean;
  locked?: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const AccordionSection: React.FC<AccordionSectionProps> = ({ step, icon: Icon, title, subtitle, isOpen, locked, onToggle, children }) => (
  <div className="md3-card border border-sage-200 dark:border-sage-800 shadow-none overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full p-5 sm:p-6 flex items-center justify-between text-left hover:bg-sage-50/50 dark:hover:bg-surface-container-dark/50 transition-colors duration-200"
    >
      <div className="flex items-center space-x-4">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
          isOpen ? 'bg-primary-600 dark:bg-primary-500 text-white' : 'bg-sage-100 dark:bg-surface-container-dark text-sage-500 dark:text-sage-400'
        }`}>
          {locked ? <Lock className="w-4 h-4" /> : <Icon className="w-5 h-5" />}
        </div>
        <div>
          <p className="font-black text-sage-900 dark:text-sage-50 mb-0 flex items-center gap-2">
            <span className="text-xs text-sage-400 dark:text-sage-500">{step}</span> {title}
          </p>
          <p className="text-xs text-sage-500 dark:text-sage-400">{subtitle}</p>
        </div>
      </div>
      {isOpen ? <ChevronUp className="w-5 h-5 text-sage-400 flex-shrink-0" /> : <ChevronDown className="w-5 h-5 text-sage-400 flex-shrink-0" />}
    </button>
    {isOpen && (
      <div className="p-5 sm:p-8 pt-0 sm:pt-2 border-t border-sage-100 dark:border-sage-800 animate-slide-up">
        {children}
      </div>
    )}
  </div>
);

export const Calculations: React.FC = () => {
  const [activeSection, setActiveSection] = useState<SectionId | null>('personal');
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
          setActiveSection('results');
        }

        // Carica i limiti di calorie giornalieri
        const limitsDoc = doc(db, `users/${auth.currentUser.uid}/data/daily_limits`);
        const limitsSnapshot = await getDoc(limitsDoc);
        if (limitsSnapshot.exists()) {
          setDailyCalorieLimits(limitsSnapshot.data() as DailyCalorieLimit);
        }

        // Carica i parametri pasti (kcal per pasto)
        const mealParamsDoc = doc(db, `users/${auth.currentUser.uid}/data/meal_parameters`);
        const mealParamsSnapshot = await getDoc(mealParamsDoc);
        if (mealParamsSnapshot.exists()) {
          const mealParams = mealParamsSnapshot.data();
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
    setActiveSection('results');

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

  const toggleSection = (id: SectionId) => {
    setActiveSection(prev => (prev === id ? null : id));
  };

  return (
    <div className="space-y-4">
      <AccordionSection
        step={1}
        icon={Calculator}
        title="Dati Personali"
        subtitle="Età, altezza, peso, LAF: il punto di partenza del calcolo"
        isOpen={activeSection === 'personal'}
        onToggle={() => toggleSection('personal')}
      >
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
            <label className="block text-sm font-bold text-sage-700 dark:text-sage-300 ml-1">LAF (Livello Attività Fisica)</label>
            <input type="number" value={data.laf || ''} step="0.05" min="1.2" max="2.4" onChange={(e) => setData({...data, laf: parseFloat(e.target.value) || 1.4})} className="md3-input w-full" />
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
      </AccordionSection>

      <AccordionSection
        step={2}
        icon={Target}
        title="Risultati Analisi"
        subtitle={isCalculated ? 'Metabolismo e target' : 'Calcola prima i tuoi dati personali'}
        isOpen={activeSection === 'results'}
        locked={!isCalculated}
        onToggle={() => toggleSection('results')}
      >
        {isCalculated && results ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-primary-50 dark:bg-primary-900/10 p-6 rounded-md3-medium border border-primary-100 dark:border-primary-800/30">
              <p className="text-xs font-black text-primary-700 dark:text-primary-300 uppercase tracking-widest mb-2">BMI (Indice Massa Corporea)</p>
              <p className="text-3xl font-black text-sage-900 dark:text-sage-50">{results.bmi.toFixed(1)}</p>
              <div className="mt-3 inline-block px-3 py-1 bg-white dark:bg-surface-dark rounded-full text-xs font-bold text-sage-600 dark:text-sage-400 border border-primary-100 dark:border-primary-800">{getBmiCategory(results.bmi)}</div>
            </div>
            <div className="bg-accent-50 dark:bg-accent-900/10 p-6 rounded-md3-medium border border-accent-100 dark:border-accent-800/30">
              <p className="text-xs font-black text-accent-700 dark:text-accent-300 uppercase tracking-widest mb-2">Peso Ideale</p>
              <p className="text-3xl font-black text-sage-900 dark:text-sage-50">{results.idealWeight.toFixed(1)} <span className="text-lg">kg</span></p>
            </div>
            <div className="bg-primary-50 dark:bg-primary-900/10 p-6 rounded-md3-medium border border-primary-100 dark:border-primary-800/30">
              <p className="text-xs font-black text-primary-700 dark:text-primary-300 uppercase tracking-widest mb-2">MB (Metabolismo Basale)</p>
              <p className="text-3xl font-black text-sage-900 dark:text-sage-50">{Math.round(results.basalMetabolism)} <span className="text-lg">kcal</span></p>
            </div>
            <div className="bg-accent-50 dark:bg-accent-900/10 p-6 rounded-md3-medium border border-accent-100 dark:border-accent-800/30">
              <p className="text-xs font-black text-accent-700 dark:text-accent-300 uppercase tracking-widest mb-2">TDEE (Fabbisogno Calorico Giornaliero)</p>
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
        ) : (
          <p className="text-sm text-sage-500 dark:text-sage-400">Compila la sezione "Dati Personali" e premi "Calcola Risultati" per vedere qui BMI, metabolismo e target proteico.</p>
        )}
      </AccordionSection>

      <AccordionSection
        step={3}
        icon={Target}
        title="Pianificazione Settimanale"
        subtitle={isCalculated ? 'Target kcal per ogni giorno della settimana' : 'Calcola prima i tuoi dati personali'}
        isOpen={activeSection === 'weekly'}
        locked={!isCalculated}
        onToggle={() => toggleSection('weekly')}
      >
        {isCalculated && results ? (
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
        ) : (
          <p className="text-sm text-sage-500 dark:text-sage-400">Compila la sezione "Dati Personali" per impostare qui i target di calorie giornalieri.</p>
        )}
      </AccordionSection>

      <AccordionSection
        step={4}
        icon={Settings}
        title="Kcal per Pasto"
        subtitle="Target calorico per ogni pasto della settimana"
        isOpen={activeSection === 'meals'}
        onToggle={() => toggleSection('meals')}
      >
        {/* Info range CREA fissi (non più modificabili dall'utente) */}
        <div className="flex items-start space-x-3 mb-8 p-5 bg-accent-50 dark:bg-accent-900/10 rounded-md3-medium border border-accent-100 dark:border-accent-800/30">
          <Info className="w-5 h-5 text-accent-600 dark:text-accent-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-sage-700 dark:text-sage-300">
            <p className="font-bold text-sage-900 dark:text-sage-50 mb-1">Macronutrienti secondo le Linee guida CREA</p>
            <p>
              Carboidrati {CREA_RANGES.carbs.min}–{CREA_RANGES.carbs.max}% • Proteine {CREA_RANGES.proteins.min}–{CREA_RANGES.proteins.max}% • Lipidi {CREA_RANGES.fats.min}–{CREA_RANGES.fats.max}% dell'energia.
              Questi range sono applicati automaticamente all'ottimizzatore e ai consigli su Dieta e Ricette: qui puoi impostare solo le kcal target per ogni pasto della settimana.
            </p>
          </div>
        </div>

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
                          value={dailyMealKcal[day]?.[meal] || ''}
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
      </AccordionSection>
    </div>
  );
};
