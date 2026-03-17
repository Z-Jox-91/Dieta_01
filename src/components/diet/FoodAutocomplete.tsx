import React, { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { db, auth } from '../../firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

// Definizione dell'interfaccia per i dati nutrizionali
interface NutritionalData {
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
  category: string;
}

interface FoodItem {
  name: string;
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
  category: string;
}

interface FoodAutocompleteProps {
  value: string;
  onChange: (food: string, nutritionalData: NutritionalData) => void;
  grams: number;
}

// Database alimenti iniziale vuoto
let foodDatabase: FoodItem[] = [];

// Funzione per caricare il database da Firestore
const loadFoodDatabase = async () => {
  if (!auth.currentUser) return;
  
  try {
    const foodsCollection = collection(db, 'alimenti');
    const q = query(foodsCollection, orderBy('name', 'asc'));
    const foodsSnapshot = await getDocs(q);
    const foodsList = foodsSnapshot.docs.map(doc => doc.data() as FoodItem);
    
    if (foodsList.length > 0) {
      foodDatabase = foodsList;
    }
  } catch (error) {
    console.error('Errore nel caricamento del database alimentare da Firestore:', error);
  }
};

// Carica il database all'inizializzazione
loadFoodDatabase();

export const FoodAutocomplete: React.FC<FoodAutocompleteProps> = ({ value, onChange, grams }) => {
  // Carica il database alimentare da Firestore all'avvio del componente
  useEffect(() => {
    loadFoodDatabase();
  }, []);
  const [searchTerm, setSearchTerm] = useState(value);
  const [suggestions, setSuggestions] = useState<FoodItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  // Inizializza lo stato selezionato se il valore è già impostato
  useEffect(() => {
    if (value && !selectedFood) {
      const food = foodDatabase.find(item => item.name === value);
      if (food) {
        setSelectedFood(food);
      }
    }
  }, [value, selectedFood]);

  // Gestisce il click fuori dal componente per chiudere i suggerimenti
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filtra i suggerimenti in base al termine di ricerca
  const filterSuggestions = (term: string) => {
    if (!term.trim()) {
      setSuggestions([]);
      return;
    }

    const normalizedTerm = term.toLowerCase().trim();
    const filtered = foodDatabase.filter(food => {
      const normalizedFood = food.name.toLowerCase();
      // Ricerca più intelligente: 
      // 1. Deve contenere il termine come sottostringa continua
      // 2. Oppure deve iniziare con il termine
      return normalizedFood.includes(normalizedTerm);
    });

    setSuggestions(filtered);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    setShowSuggestions(true);
    filterSuggestions(term);

    // Se l'input viene cancellato, resetta il cibo selezionato
    if (!term) {
      setSelectedFood(null);
      onChange('', { calories: 0, proteins: 0, carbs: 0, fats: 0, category: '' });
    }
  };

  const handleSelectFood = (food: FoodItem) => {
    setSearchTerm(food.name);
    setSelectedFood(food);
    setShowSuggestions(false);

    // Calcola i valori nutrizionali in base ai grammi
    const calculatedValues = {
      calories: (food.calories / 100) * (grams || 0),
      proteins: (food.proteins / 100) * (grams || 0),
      carbs: (food.carbs / 100) * (grams || 0),
      fats: (food.fats / 100) * (grams || 0),
      category: food.category
    };

    onChange(food.name, calculatedValues);
  };

  return (
    <div className="relative" ref={autocompleteRef}>
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => {
            if (searchTerm) {
              setShowSuggestions(true);
              filterSuggestions(searchTerm);
            }
          }}
          className="md3-input pl-10 w-full text-sm py-2"
          placeholder="Cerca alimento..."
        />
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-sage-400 dark:text-sage-500" />
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="md3-dropdown max-h-[300px] overflow-y-auto scrollbar-thin">
          {suggestions.map((food) => (
            <div
              key={`${food.name}-${food.calories}`}
              className="md3-dropdown-item flex-col items-start space-x-0"
              onClick={() => handleSelectFood(food)}
            >
              <div className="font-bold text-sage-900 dark:text-sage-100">{food.name}</div>
              <div className="text-[10px] uppercase tracking-widest font-black text-sage-500 dark:text-sage-400 mt-1">
                {food.calories} kcal • P: {food.proteins}g • C: {food.carbs}g • F: {food.fats}g
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};