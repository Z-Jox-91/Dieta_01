import React, { useState, useEffect } from 'react';
import { Calculator, Target, Info, ChevronDown, ChevronUp, Lock, Shuffle } from 'lucide-react';
import { db, auth } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { CREA_RANGES } from '../utils/mealBalance';
import { distributeExact } from '../utils/kcalDistribution';
import { useToast } from './ui/ToastProvider';

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

interface ActiveMeals {
  [meal: string]: boolean;
}

interface MealSplitPercents {
  [meal: string]: number;
}

type WeeklyDistributionMode = 'uniform' | 'weekend_boost' | 'custom';

type SectionId = 'personal' | 'results' | 'planning';

const daysOfWeek = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
const mealTypes = ['Colazione', 'Spuntino1', 'Pranzo', 'Spuntino2', 'Cena'];
const DEFAULT_SPLIT_PERCENTS: MealSplitPercents = { Colazione: 20, Spuntino1: 5, Pranzo: 35, Spuntino2: 5, Cena: 35 };
const WEEKEND_DAY_INDEXES = [5, 6]; // Sabato, Domenica

const DISTRIBUTION_OPTIONS: { id: WeeklyDistributionMode; label: string }[] = [
  { id: 'uniform', label: 'Uniforme' },
  { id: 'weekend_boost', label: 'Weekend più abbondante' },
  { id: 'custom', label: 'Personalizzato' },
];

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
  const { showToast } = useToast();
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

  const [activeMeals, setActiveMeals] = useState<ActiveMeals>(
    mealTypes.reduce((acc, m) => ({ ...acc, [m]: true }), {})
  );
  const [mealSplitPercents, setMealSplitPercents] = useState<MealSplitPercents>(DEFAULT_SPLIT_PERCENTS);
  const [weeklyDistributionMode, setWeeklyDistributionMode] = useState<WeeklyDistributionMode>('custom');
  const [weekendBoostPercent, setWeekendBoostPercent] = useState<number>(15);

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

        // Carica i parametri pasti (kcal per pasto, pasti attivi, percentuali, modalità settimanale)
        const mealParamsDoc = doc(db, `users/${auth.currentUser.uid}/data/meal_parameters`);
        const mealParamsSnapshot = await getDoc(mealParamsDoc);
        if (mealParamsSnapshot.exists()) {
          const mealParams = mealParamsSnapshot.data();
          if (mealParams.dailyMealKcal) setDailyMealKcal(mealParams.dailyMealKcal);
          if (mealParams.activeMeals) setActiveMeals(mealParams.activeMeals);
          if (mealParams.mealSplitPercents) setMealSplitPercents(mealParams.mealSplitPercents);
          if (mealParams.weeklyDistributionMode) setWeeklyDistributionMode(mealParams.weeklyDistributionMode);
          if (typeof mealParams.weekendBoostPercent === 'number') setWeekendBoostPercent(mealParams.weekendBoostPercent);
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

  const saveMealParameters = async (partial: Partial<{
    dailyMealKcal: DailyMealKcal;
    activeMeals: ActiveMeals;
    mealSplitPercents: MealSplitPercents;
    weeklyDistributionMode: WeeklyDistributionMode;
    weekendBoostPercent: number;
  }>) => {
    if (!auth.currentUser) return;
    try {
      await setDoc(doc(db, `users/${auth.currentUser.uid}/data/meal_parameters`), partial, { merge: true });
    } catch (error) {
      console.error('Errore nel salvataggio parametri pasti:', error);
    }
  };

  const handleMealKcalChange = async (day: string, meal: string, value: string) => {
    const newValue = parseInt(value) || 0;
    const newDailyMealKcal = {
      ...dailyMealKcal,
      [day]: { ...dailyMealKcal[day], [meal]: newValue }
    };
    setDailyMealKcal(newDailyMealKcal);
    await saveMealParameters({ dailyMealKcal: newDailyMealKcal });
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

  const toggleMeal = async (meal: string) => {
    const isCurrentlyActive = activeMeals[meal] !== false;
    const activeCount = mealTypes.filter(m => activeMeals[m] !== false).length;
    if (isCurrentlyActive && activeCount <= 1) {
      showToast('Deve rimanere almeno un pasto attivo.', 'error');
      return;
    }
    const newActiveMeals = { ...activeMeals, [meal]: !isCurrentlyActive };
    setActiveMeals(newActiveMeals);
    await saveMealParameters({ activeMeals: newActiveMeals });
  };

  const handleSplitPercentChange = async (meal: string, value: string) => {
    const newValue = parseFloat(value) || 0;
    const newPercents = { ...mealSplitPercents, [meal]: newValue };
    setMealSplitPercents(newPercents);
    await saveMealParameters({ mealSplitPercents: newPercents });
  };

  const handleDistributionModeChange = async (mode: WeeklyDistributionMode) => {
    setWeeklyDistributionMode(mode);
    await saveMealParameters({ weeklyDistributionMode: mode });
  };

  const handleWeekendBoostChange = async (value: string) => {
    const newValue = parseFloat(value) || 0;
    setWeekendBoostPercent(newValue);
    await saveMealParameters({ weekendBoostPercent: newValue });
  };

  const applyWeeklyDistribution = async () => {
    if (!results || weeklyDistributionMode === 'custom') return;

    let weights: number[];
    if (weeklyDistributionMode === 'uniform') {
      weights = daysOfWeek.map(() => 1);
    } else {
      const boost = weekendBoostPercent / 100;
      weights = daysOfWeek.map((_, idx) =>
        WEEKEND_DAY_INDEXES.includes(idx) ? (1 + boost) : (1 - 0.4 * boost)
      );
    }

    const distributed = distributeExact(results.weeklyCalories, weights);
    const newLimits: DailyCalorieLimit = {};
    daysOfWeek.forEach((day, idx) => { newLimits[day] = distributed[idx]; });
    setDailyCalorieLimits(newLimits);

    if (auth.currentUser) {
      try {
        await setDoc(doc(db, `users/${auth.currentUser.uid}/data/daily_limits`), newLimits);
        showToast('Suddivisione settimanale applicata ai 7 giorni.', 'success');
      } catch (error) {
        console.error('Errore nel salvataggio limiti giornalieri:', error);
      }
    }
  };

  const activeMealList = mealTypes.filter(m => activeMeals[m] !== false);
  const activePercentSum = activeMealList.reduce((sum, m) => sum + (mealSplitPercents[m] || 0), 0);
  const isPercentSumValid = activeMealList.length > 0 && Math.abs(activePercentSum - 100) < 0.5;

  const applyMealDistribution = async () => {
    if (!isPercentSumValid) return;

    const weights = activeMealList.map(m => mealSplitPercents[m] || 0);
    const newDailyMealKcal: DailyMealKcal = {};

    daysOfWeek.forEach(day => {
      const dayTarget = dailyCalorieLimits[day] || 0;
      const dayMeals: { [meal: string]: number } = { ...dailyMealKcal[day] };
      if (dayTarget > 0) {
        const distributed = distributeExact(dayTarget, weights);
        activeMealList.forEach((meal, idx) => { dayMeals[meal] = distributed[idx]; });
      } else {
        activeMealList.forEach(meal => { dayMeals[meal] = 0; });
      }
      newDailyMealKcal[day] = dayMeals;
    });

    setDailyMealKcal(newDailyMealKcal);
    await saveMealParameters({ dailyMealKcal: newDailyMealKcal });
    showToast('Distribuzione dei pasti applicata a tutti i giorni.', 'success');
  };

  const getTotalWeeklyLimit = (): number => {
    return Object.values(dailyCalorieLimits).reduce((sum, val) => sum + (val || 0), 0);
  };

  const getDayMealTotal = (day: string): number => {
    return activeMealList.reduce((sum, meal) => sum + (dailyMealKcal[day]?.[meal] || 0), 0);
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
        icon={Shuffle}
        title="Pianificazione Settimanale e Pasti"
        subtitle={isCalculated ? 'Target per giorno, suddivisione settimanale e per pasto' : 'Calcola prima i tuoi dati personali'}
        isOpen={activeSection === 'planning'}
        locked={!isCalculated}
        onToggle={() => toggleSection('planning')}
      >
        {isCalculated && results ? (
          <>
            {/* Info range CREA fissi (non più modificabili dall'utente) */}
            <div className="flex items-start space-x-3 mb-8 p-5 bg-accent-50 dark:bg-accent-900/10 rounded-md3-medium border border-accent-100 dark:border-accent-800/30">
              <Info className="w-5 h-5 text-accent-600 dark:text-accent-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-sage-700 dark:text-sage-300">
                <p className="font-bold text-sage-900 dark:text-sage-50 mb-1">Macronutrienti secondo le Linee guida CREA</p>
                <p>
                  Carboidrati {CREA_RANGES.carbs.min}–{CREA_RANGES.carbs.max}% • Proteine {CREA_RANGES.proteins.min}–{CREA_RANGES.proteins.max}% • Lipidi {CREA_RANGES.fats.min}–{CREA_RANGES.fats.max}% dell'energia.
                  Questi range sono applicati automaticamente all'ottimizzatore e ai consigli su Dieta e Ricette.
                </p>
              </div>
            </div>

            {/* Suddivisione della settimana */}
            <div className="mb-8">
              <p className="text-sm font-bold text-sage-900 dark:text-sage-50 mb-1">Come vuoi suddividere la settimana?</p>
              <p className="text-xs text-sage-500 dark:text-sage-400 mb-3">Il totale settimanale resta sempre quello del Calcolo Teorico: cambia solo come viene ripartito tra i giorni.</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {DISTRIBUTION_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => handleDistributionModeChange(opt.id)}
                    className={`px-4 py-2 rounded-full text-sm font-bold border transition-all duration-200 ${
                      weeklyDistributionMode === opt.id
                        ? 'bg-primary-600 dark:bg-primary-500 text-white border-primary-600 dark:border-primary-500'
                        : 'bg-sage-50 dark:bg-surface-container-dark text-sage-600 dark:text-sage-400 border-sage-200 dark:border-sage-800'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {weeklyDistributionMode === 'weekend_boost' && (
                <div className="flex items-center gap-3 mb-4">
                  <label className="text-sm font-bold text-sage-700 dark:text-sage-300">Aumento sabato/domenica</label>
                  <input
                    type="number"
                    value={weekendBoostPercent}
                    onChange={(e) => handleWeekendBoostChange(e.target.value)}
                    className="md3-input w-24 py-2 text-center font-bold"
                    min="0"
                    max="100"
                  />
                  <span className="text-sm text-sage-500 dark:text-sage-400">%</span>
                </div>
              )}

              {weeklyDistributionMode !== 'custom' && (
                <button
                  onClick={applyWeeklyDistribution}
                  className="md3-button-primary flex items-center justify-center space-x-2"
                >
                  <Target className="w-5 h-5" />
                  <span>Applica ai 7 giorni</span>
                </button>
              )}
            </div>

            {/* Pasti attivi */}
            <div className="mb-8">
              <p className="text-sm font-bold text-sage-900 dark:text-sage-50 mb-1">Quali pasti fai?</p>
              <p className="text-xs text-sage-500 dark:text-sage-400 mb-3">Disattiva quelli che salti: spariranno anche dalla scheda Dieta.</p>
              <div className="flex flex-wrap gap-2">
                {mealTypes.map(meal => {
                  const isActive = activeMeals[meal] !== false;
                  return (
                    <button
                      key={meal}
                      onClick={() => toggleMeal(meal)}
                      className={`px-4 py-2 rounded-full text-sm font-bold border transition-all duration-200 ${
                        isActive
                          ? 'bg-primary-600 dark:bg-primary-500 text-white border-primary-600 dark:border-primary-500'
                          : 'bg-sage-50 dark:bg-surface-container-dark text-sage-400 dark:text-sage-600 border-sage-200 dark:border-sage-800'
                      }`}
                    >
                      {meal}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Percentuali di suddivisione tra i pasti attivi */}
            <div className="mb-8">
              <p className="text-sm font-bold text-sage-900 dark:text-sage-50 mb-1">Come dividere le kcal tra i pasti attivi?</p>
              <p className="text-xs text-sage-500 dark:text-sage-400 mb-3">Percentuali di riferimento usate dalla distribuzione automatica: devono sommare a 100%.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-3">
                {activeMealList.map(meal => (
                  <div key={meal} className="space-y-1">
                    <label className="block text-xs font-bold text-sage-600 dark:text-sage-400">{meal}</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={mealSplitPercents[meal] ?? ''}
                        onChange={(e) => handleSplitPercentChange(meal, e.target.value)}
                        className="md3-input w-full py-2 text-center font-bold pr-7"
                        min="0"
                        max="100"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-sage-400">%</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className={`text-xs font-bold mb-4 ${isPercentSumValid ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
                Totale percentuali: {activePercentSum.toFixed(0)}% {isPercentSumValid ? '✓' : '— deve sommare a 100%'}
              </p>
              <button
                onClick={applyMealDistribution}
                disabled={!isPercentSumValid}
                className={`md3-button-primary flex items-center justify-center space-x-2 ${!isPercentSumValid ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
              >
                <Shuffle className="w-5 h-5" />
                <span>Distribuisci automaticamente i pasti</span>
              </button>
            </div>

            {/* Tabella unica: target giorno + pasti + assegnato/rimanente */}
            <div className="md3-table-container">
              <div className="overflow-x-auto">
                <table className="md3-table">
                  <thead className="md3-table-header">
                    <tr>
                      <th className="md3-table-th">Giorno</th>
                      <th className="md3-table-th text-center">Target Giorno</th>
                      {activeMealList.map(m => <th key={m} className="md3-table-th text-center">{m}</th>)}
                      <th className="md3-table-th text-center">Assegnato / Rimanente</th>
                    </tr>
                  </thead>
                  <tbody>
                    {daysOfWeek.map((day, idx) => {
                      const dayTarget = dailyCalorieLimits[day] || 0;
                      const dayTotal = getDayMealTotal(day);
                      const remaining = dayTarget - dayTotal;
                      const hasTarget = dayTarget > 0;
                      const isAligned = hasTarget && Math.abs(remaining) <= 50;
                      return (
                        <tr key={day} className={`md3-table-tr ${idx % 2 === 0 ? '' : 'md3-table-tr-even'}`}>
                          <td className="md3-table-td font-bold text-sage-900 dark:text-sage-100">{day}</td>
                          <td className="md3-table-td p-2">
                            <input
                              type="number"
                              value={dailyCalorieLimits[day] || ''}
                              onChange={(e) => handleDailyLimitChange(day, e.target.value)}
                              className="md3-input w-full max-w-[130px] mx-auto py-1.5 text-center font-bold"
                              placeholder="kcal"
                            />
                          </td>
                          {activeMealList.map(meal => (
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
                          <td className="md3-table-td text-center">
                            <p className="text-[10px] text-sage-500 dark:text-sage-400 mb-0.5">Assegnate</p>
                            <p className="font-black text-sage-900 dark:text-sage-50">
                              {dayTotal}{hasTarget ? ` / ${dayTarget}` : ''} <span className="text-xs font-normal text-sage-500">kcal</span>
                            </p>
                            {hasTarget ? (
                              <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                isAligned
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                  : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                              }`}>
                                {isAligned ? 'In pari' : remaining > 0 ? `Restano ${remaining}` : `Sfora di ${Math.abs(remaining)}`}
                              </span>
                            ) : (
                              <span className="inline-block mt-1 text-[10px] text-sage-400 dark:text-sage-500">Imposta un target</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-primary-50 dark:bg-primary-900/20 font-bold">
                      <td className="md3-table-td text-primary-900 dark:text-primary-100" colSpan={1 + activeMealList.length}>Totale Settimanale Effettivo</td>
                      <td className="md3-table-td text-primary-900 dark:text-primary-100 font-black text-xl">{getTotalWeeklyLimit()} <span className="text-sm">kcal</span></td>
                    </tr>
                    <tr className="bg-accent-50 dark:bg-accent-900/20 font-bold">
                      <td className="md3-table-td text-accent-900 dark:text-accent-100" colSpan={1 + activeMealList.length}>Calcolo Teorico</td>
                      <td className="md3-table-td text-accent-900 dark:text-accent-100 font-black text-xl">{Math.round(results.weeklyCalories)} <span className="text-sm">kcal</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <p className="text-sm text-sage-500 dark:text-sage-400">Compila la sezione "Dati Personali" e premi "Calcola Risultati" per impostare qui la pianificazione.</p>
        )}
      </AccordionSection>
    </div>
  );
};
