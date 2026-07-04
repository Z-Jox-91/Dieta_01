import React, { useState, useEffect, useRef } from 'react';
import { Search, Check } from 'lucide-react';
import { db, auth } from '../../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

/** Valori nutrizionali per 100 g dell'alimento selezionato. */
export interface FoodOption {
  name: string;
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
  category: string;
}

interface FoodAutocompleteProps {
  value: string;
  /** Chiamato con l'alimento selezionato (valori per 100 g), o null se il campo viene svuotato. */
  onSelect: (food: FoodOption | null) => void;
}

// ---------------------------------------------------------------------------
// Store condiviso del database alimenti: una sola sottoscrizione Firestore
// in tempo reale per tutti i campi di ricerca, avviata dopo il login.
// ---------------------------------------------------------------------------
let foodDatabase: FoodOption[] = [];
const listeners = new Set<(foods: FoodOption[]) => void>();
let subscriptionStarted = false;

const startFoodSubscription = () => {
  if (subscriptionStarted) return;
  subscriptionStarted = true;

  onAuthStateChanged(auth, (user) => {
    if (!user) return;
    const q = query(collection(db, 'alimenti'), orderBy('name', 'asc'));
    onSnapshot(q, (snapshot) => {
      foodDatabase = snapshot.docs.map(d => {
        const data = d.data();
        return {
          name: data.name || '',
          calories: Number(data.calories) || 0,
          proteins: Number(data.proteins) || 0,
          carbs: Number(data.carbs) || 0,
          fats: Number(data.fats) || 0,
          category: data.category || '',
        };
      });
      listeners.forEach(fn => fn(foodDatabase));
    }, (error) => {
      console.error('Errore nel caricamento del database alimentare:', error);
    });
  });
};

export const FoodAutocomplete: React.FC<FoodAutocompleteProps> = ({ value, onSelect }) => {
  const [searchTerm, setSearchTerm] = useState(value);
  const [suggestions, setSuggestions] = useState<FoodOption[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  // Avvia (una sola volta) la sottoscrizione al database e registra il listener
  useEffect(() => {
    startFoodSubscription();
    const listener = () => {
      // il database è arrivato/cambiato: se l'utente sta già digitando, aggiorna i suggerimenti
      setSuggestions(prev => (prev.length > 0 ? filterFoods(searchTermRef.current) : prev));
    };
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);

  const searchTermRef = useRef(searchTerm);
  searchTermRef.current = searchTerm;

  // Sincronizza il campo quando il valore cambia dall'esterno (ottimizzatore, AI, cambio ricetta)
  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  // Chiude i suggerimenti cliccando fuori
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filterFoods = (term: string): FoodOption[] => {
    const normalized = term.toLowerCase().trim();
    if (!normalized) return [];
    const startsWith: FoodOption[] = [];
    const contains: FoodOption[] = [];
    for (const food of foodDatabase) {
      const name = food.name.toLowerCase();
      if (name.startsWith(normalized)) startsWith.push(food);
      else if (name.includes(normalized)) contains.push(food);
    }
    return [...startsWith, ...contains].slice(0, 50);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    setShowSuggestions(true);
    setHighlighted(-1);
    setSuggestions(filterFoods(term));

    if (!term) {
      onSelect(null);
    }
  };

  const handleSelectFood = (food: FoodOption) => {
    setSearchTerm(food.name);
    setShowSuggestions(false);
    setHighlighted(-1);
    onSelect(food);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted(prev => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted(prev => (prev <= 0 ? suggestions.length - 1 : prev - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSelectFood(suggestions[highlighted >= 0 ? highlighted : 0]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="relative" ref={autocompleteRef}>
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (searchTerm) {
              setShowSuggestions(true);
              setSuggestions(filterFoods(searchTerm));
            }
          }}
          className="md3-input pl-10 w-full text-sm py-2"
          placeholder="Cerca alimento..."
        />
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-sage-400 dark:text-sage-500" />
      </div>

      {showSuggestions && (
        <div className="md3-dropdown max-h-[300px] overflow-y-auto scrollbar-thin shadow-2xl">
          {suggestions.length > 0 ? (
            suggestions.map((food, index) => (
              <div
                key={`${food.name}-${index}`}
                className={`md3-dropdown-item flex-col items-start space-x-0 border-b border-sage-50 dark:border-sage-800/50 last:border-none ${
                  index === highlighted ? 'bg-primary-50 dark:bg-primary-900/30' : ''
                }`}
                onMouseEnter={() => setHighlighted(index)}
                onClick={() => handleSelectFood(food)}
              >
                <div className="font-bold text-sage-900 dark:text-sage-100 flex items-center">
                  {food.name === value && <Check className="w-3 h-3 mr-1 text-primary-500" />}
                  {food.name}
                </div>
                <div className="text-[10px] uppercase tracking-widest font-black text-sage-500 dark:text-sage-400 mt-1">
                  {Math.round(food.calories)} kcal • P: {food.proteins}g • C: {food.carbs}g • G: {food.fats}g (per 100g)
                </div>
              </div>
            ))
          ) : (
            searchTerm.trim() !== '' && (
              <div className="px-4 py-3 text-sm text-sage-500 dark:text-sage-400">
                {foodDatabase.length === 0
                  ? 'Database alimenti vuoto: aggiungi alimenti nella scheda "Alimenti".'
                  : 'Nessun alimento trovato.'}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
};
