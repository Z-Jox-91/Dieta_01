import React, { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, GraduationCap, ChevronDown, ChevronUp } from 'lucide-react';
import { DaySelector } from './diet/DaySelector';
import { MealSection } from './diet/MealSection';
import { DayStats } from './diet/DayStats';
import { db, auth } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { CREA_RANGES, FOOD_EXAMPLES } from '../utils/mealBalance';

// Definizione delle interfacce per i dati
interface MealItem {
  id: string;
  food: string;
  grams: number;
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
  category?: string;
}

interface DayMeals {
  breakfast: MealItem[];
  morningSnack: MealItem[];
  lunch: MealItem[];
  afternoonSnack: MealItem[];
  dinner: MealItem[];
}

interface MealsDataStore {
  [key: string]: DayMeals;
}

const daysOfWeek = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

export const Diet: React.FC = () => {
  const [selectedDay, setSelectedDay] = useState(0);
  const [currentWeek, setCurrentWeek] = useState(0);
  const [mealsData, setMealsData] = useState<MealsDataStore>({});
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    const loadMealsData = async () => {
      if (!auth.currentUser) return;
      
      try {
        // Prima controlla se ci sono dati in localStorage da migrare
        const saved = localStorage.getItem('piano_alimentare_meals');
        if (saved) {
          try {
            const parsedData = JSON.parse(saved);
            if (parsedData && typeof parsedData === 'object' && Object.keys(parsedData).length > 0) {
              // Migra i dati da localStorage a Firestore
              await migrateLocalStorageToFirestore(parsedData);
              // Rimuovi i dati da localStorage dopo la migrazione
              localStorage.removeItem('piano_alimentare_meals');
            }
          } catch (error) {
            console.error('Errore nella migrazione dei pasti:', error);
          }
        }
        
        // Carica i dati da Firestore
        const mealsDoc = doc(db, `users/${auth.currentUser.uid}/data/meals`);
        const mealsSnapshot = await getDoc(mealsDoc);
        
        if (mealsSnapshot.exists()) {
          const mealsData = mealsSnapshot.data() as MealsDataStore;
          setMealsData(mealsData);
        } else {
          console.log('Nessun dato pasti trovato, inizializzazione con oggetto vuoto');
          setMealsData({});
        }
      } catch (error) {
        console.error('Errore nel caricamento dei dati da Firestore:', error);
        // In caso di errore, inizializza con un oggetto vuoto
        setMealsData({});
      }
    };
    
    loadMealsData();
  }, []);

  // Funzione per migrare i dati da localStorage a Firestore
  const migrateLocalStorageToFirestore = async (mealsData: MealsDataStore) => {
    if (!auth.currentUser) return;
    
    try {
      const mealsDoc = doc(db, `users/${auth.currentUser.uid}/data/meals`);
      await setDoc(mealsDoc, mealsData);
      console.log('Migrazione dei pasti completata con successo');
    } catch (error) {
      console.error('Errore durante la migrazione dei pasti:', error);
    }
  };
  
  const saveMealsData = async (data: MealsDataStore) => {
    try {
      setMealsData(data);
      
      if (auth.currentUser) {
        const mealsDoc = doc(db, `users/${auth.currentUser.uid}/data/meals`);
        await setDoc(mealsDoc, data);
      } else {
        console.error('Utente non autenticato, impossibile salvare i dati');
      }
    } catch (error) {
      console.error('Errore nel salvataggio dei dati su Firestore:', error);
    }
  };

  const getWeekKey = () => `week_${currentWeek}`;
  const getDayKey = () => `${getWeekKey()}_day_${selectedDay}`;

  const getCurrentDayData = (): DayMeals => {
    try {
      const dayKey = getDayKey();
      const dayData = mealsData[dayKey];
      
      // Se non ci sono dati per il giorno corrente o sono incompleti, crea un oggetto completo
      if (!dayData) {
        return {
          breakfast: [],
          morningSnack: [],
          lunch: [],
          afternoonSnack: [],
          dinner: []
        };
      }
      
      // Assicurati che tutte le proprietà esistano
      return {
        breakfast: Array.isArray(dayData.breakfast) ? dayData.breakfast : [],
        morningSnack: Array.isArray(dayData.morningSnack) ? dayData.morningSnack : [],
        lunch: Array.isArray(dayData.lunch) ? dayData.lunch : [],
        afternoonSnack: Array.isArray(dayData.afternoonSnack) ? dayData.afternoonSnack : [],
        dinner: Array.isArray(dayData.dinner) ? dayData.dinner : []
      };
    } catch (error) {
      console.error('Errore nel recupero dei dati del giorno:', error);
      // In caso di errore, ritorna un oggetto vuoto ma completo
      return {
        breakfast: [],
        morningSnack: [],
        lunch: [],
        afternoonSnack: [],
        dinner: []
      };
    }
  };

  const updateDayData = (newData: DayMeals) => {
    try {
      const dayKey = getDayKey();
      const updated = {
        ...mealsData,
        [dayKey]: newData
      };
      saveMealsData(updated);
    } catch (error) {
      console.error('Errore nell\'aggiornamento dei dati del giorno:', error);
    }
  };

  const getCurrentWeekDate = () => {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + 1 + (currentWeek * 7));
    return weekStart;
  };

  const formatWeekRange = () => {
    const weekStart = getCurrentWeekDate();
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    return `${weekStart.getDate()}/${weekStart.getMonth() + 1} - ${weekEnd.getDate()}/${weekEnd.getMonth() + 1}`;
  };

  return (
    <div className="space-y-8">
      {/* Week Navigation */}
      <div className="md3-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Calendar className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            <h2 className="text-xl font-bold text-sage-900 dark:text-sage-50 mb-0">Piano Alimentare</h2>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setCurrentWeek(prev => prev - 1)}
              className="p-2 text-sage-600 dark:text-sage-400 hover:text-sage-900 dark:hover:text-sage-100 hover:bg-sage-100 dark:hover:bg-surface-container-dark rounded-lg transition-colors duration-200"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <div className="text-center">
              <p className="text-sm font-medium text-sage-900 dark:text-sage-50">
                Settimana {currentWeek === 0 ? 'corrente' : currentWeek > 0 ? `+${currentWeek}` : currentWeek}
              </p>
              <p className="text-xs text-sage-600 dark:text-sage-400">{formatWeekRange()}</p>
            </div>
            
            <button
              onClick={() => setCurrentWeek(prev => prev + 1)}
              className="p-2 text-sage-600 dark:text-sage-400 hover:text-sage-900 dark:hover:text-sage-100 hover:bg-sage-100 dark:hover:bg-surface-container-dark rounded-lg transition-colors duration-200"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <DaySelector
          days={daysOfWeek}
          selectedDay={selectedDay}
          onDaySelect={setSelectedDay}
        />
      </div>

      {/* Guida per principianti: come si compone un pasto equilibrato */}
      <div className="md3-card border border-primary-100 dark:border-primary-900/30">
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="w-full p-5 flex items-center justify-between text-left"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-md3-small flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h3 className="font-bold text-sage-900 dark:text-sage-50 mb-0">Non sai come comporre un pasto equilibrato?</h3>
              <p className="text-xs text-sage-500 dark:text-sage-400">Guida rapida basata sulle Linee guida CREA per una sana alimentazione</p>
            </div>
          </div>
          {showGuide ? <ChevronUp className="w-5 h-5 text-sage-400" /> : <ChevronDown className="w-5 h-5 text-sage-400" />}
        </button>

        {showGuide && (
          <div className="px-5 pb-6 space-y-4">
            <p className="text-sm text-sage-700 dark:text-sage-300 leading-relaxed">
              Un pasto equilibrato distribuisce l'energia tra i tre macronutrienti. In ogni pasto cerca di
              includere <strong>una fonte per ciascun gruppo</strong>; il sito calcolerà le percentuali e ti
              segnalerà cosa manca. Puoi anche usare l'<strong>Ottimizzatore</strong> dentro ogni pasto per
              ottenere automaticamente le quantità in grammi.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-primary-50 dark:bg-primary-900/10 p-4 rounded-md3-medium border border-primary-100 dark:border-primary-800/30">
                <p className="text-xs font-black uppercase tracking-widest text-primary-700 dark:text-primary-300 mb-1">
                  Carboidrati • {CREA_RANGES.carbs.min}–{CREA_RANGES.carbs.max}%
                </p>
                <p className="text-sm text-sage-700 dark:text-sage-300">{FOOD_EXAMPLES.carbs}</p>
              </div>
              <div className="bg-accent-50 dark:bg-accent-900/10 p-4 rounded-md3-medium border border-accent-100 dark:border-accent-800/30">
                <p className="text-xs font-black uppercase tracking-widest text-accent-700 dark:text-accent-300 mb-1">
                  Proteine • {CREA_RANGES.proteins.min}–{CREA_RANGES.proteins.max}%
                </p>
                <p className="text-sm text-sage-700 dark:text-sage-300">{FOOD_EXAMPLES.proteins}</p>
              </div>
              <div className="bg-sage-50 dark:bg-sage-900/20 p-4 rounded-md3-medium border border-sage-200 dark:border-sage-800">
                <p className="text-xs font-black uppercase tracking-widest text-sage-700 dark:text-sage-300 mb-1">
                  Grassi • {CREA_RANGES.fats.min}–{CREA_RANGES.fats.max}%
                </p>
                <p className="text-sm text-sage-700 dark:text-sage-300">{FOOD_EXAMPLES.fats}</p>
              </div>
            </div>
            <p className="text-xs text-sage-500 dark:text-sage-400">
              Ricorda inoltre: verdura e frutta in ogni pasto, preferisci cereali integrali, limita sale e zuccheri
              aggiunti e bevi almeno 1,5–2 litri di acqua al giorno. Le percentuali indicate si riferiscono
              all'energia del pasto (kcal), non al peso in grammi.
            </p>
          </div>
        )}
      </div>

      {/* Day Stats */}
      <DayStats dayData={getCurrentDayData()} selectedDay={selectedDay} />

      {/* Meals */}
      <div className="space-y-6">
        <MealSection
          title="Colazione"
          mealData={getCurrentDayData().breakfast}
          onUpdate={(data) => updateDayData({ ...getCurrentDayData(), breakfast: data })}
          dayName={daysOfWeek[selectedDay]}
        />
        
        <MealSection
          title="Spuntino1"
          mealData={getCurrentDayData().morningSnack}
          onUpdate={(data) => updateDayData({ ...getCurrentDayData(), morningSnack: data })}
          dayName={daysOfWeek[selectedDay]}
        />
        
        <MealSection
          title="Pranzo"
          mealData={getCurrentDayData().lunch}
          onUpdate={(data) => updateDayData({ ...getCurrentDayData(), lunch: data })}
          dayName={daysOfWeek[selectedDay]}
        />
        
        <MealSection
          title="Spuntino2"
          mealData={getCurrentDayData().afternoonSnack}
          onUpdate={(data) => updateDayData({ ...getCurrentDayData(), afternoonSnack: data })}
          dayName={daysOfWeek[selectedDay]}
        />
        
        <MealSection
          title="Cena"
          mealData={getCurrentDayData().dinner}
          onUpdate={(data) => updateDayData({ ...getCurrentDayData(), dinner: data })}
          dayName={daysOfWeek[selectedDay]}
        />
      </div>
    </div>
  );
};