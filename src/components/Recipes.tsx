import React, { useState, useEffect } from 'react';
import { CookingPot, Download, Plus, Trash2, Sparkles, Loader2, Info, Check } from 'lucide-react';
import { FoodAutocomplete, FoodOption } from './diet/FoodAutocomplete';
import * as XLSX from 'xlsx';
import { db, auth } from '../firebase';
import { collection, doc, getDocs, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { generateRecipesWithGemini, RecipeSuggestion } from '../utils/gemini';
import { MacroTarget } from '../utils/portionOptimizer';
import { CREA_TARGET, evaluateMealBalance, calculateFoodCategory } from '../utils/mealBalance';
import { MACRO_CARD_CLASSES, MACRO_LABELS } from '../config/macroColors';
import { MacroDonut } from './diet/MacroDonut';
import { MacroIcon } from './diet/MacroIcons';
import { useToast } from './ui/ToastProvider';
import { useConfirm } from './ui/ConfirmProvider';
import { SkeletonCard } from './ui/Skeleton';

interface RecipeItem {
  id: string;
  food: string;
  grams: number;
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
  category?: string;
  baseCalories?: number; // per 100g
  baseProteins?: number;
  baseCarbs?: number;
  baseFats?: number;
}

interface Recipe {
  id: string;
  name: string;
  ingredients: RecipeItem[];
  totalGrams: number;
  totalCalories: number;
  totalProteins: number;
  totalCarbs: number;
  totalFats: number;
  caloriesPer100g: number;
  proteinsPer100g: number;
  carbsPer100g: number;
  fatsPer100g: number;
}

const getBaseValues = (item: RecipeItem) => {
  const g = item.grams || 100;
  return {
    calories: item.baseCalories ?? (item.calories / g) * 100,
    proteins: item.baseProteins ?? (item.proteins / g) * 100,
    carbs: item.baseCarbs ?? (item.carbs / g) * 100,
    fats: item.baseFats ?? (item.fats / g) * 100,
  };
};

/** Sentinella dell'opzione "nuova ricetta" nel menu a tendina: nessun id generato può coincidere con questa. */
const NEW_RECIPE_VALUE = '__new__';

const generateRecipeId = () => `r_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

/** Id deterministico per le ricette del vecchio schema (id = nome): se la migrazione
 *  viene eseguita due volte in parallelo (doppio montaggio in sviluppo, due schede
 *  aperte insieme) scrive sullo stesso documento invece di crearne un duplicato. */
const legacyRecipeId = (name: string) => `legacy_${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;

export const Recipes: React.FC = () => {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [recipes, setRecipes] = useState<Record<string, Recipe>>({});
  // Le ricette sono identificate da un id stabile generato una volta sola, non più
  // dal nome: prima rinominare una ricetta creava una nuova voce in Firestore
  // invece di rinominare quella esistente (e la stessa cosa succedeva alla voce
  // "specchio" nel database alimenti). L'id è sempre pronto fin dal primo render,
  // così non serve gestire un caso "nessun id ancora" da nessuna parte.
  const [currentRecipeId, setCurrentRecipeId] = useState<string>(() => generateRecipeId());
  const [currentRecipeName, setCurrentRecipeName] = useState<string>('');
  const [ingredients, setIngredients] = useState<RecipeItem[]>([]);
  const [isLoadingRecipes, setIsLoadingRecipes] = useState(true);

  // AI Recipe Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<RecipeSuggestion[]>([]);
  const [showAiModal, setShowAiModal] = useState(false);
  const [userTarget, setUserTarget] = useState<MacroTarget>({
    totalCalories: 2000,
    carbsPercent: CREA_TARGET.carbsPercent,
    proteinsPercent: CREA_TARGET.proteinsPercent,
    fatsPercent: CREA_TARGET.fatsPercent
  });

  // Carica il target calorico reale calcolato nella scheda Calcoli.
  // Nota: prima leggeva un campo "dailyCalories" sul documento utente di primo
  // livello, che Calcoli non ha mai scritto — il target restava sempre bloccato
  // al valore di default (2000 kcal). Il risultato vero è salvato in
  // users/{uid}/data/calculations (results.dailyMetabolism - results.dailyDeficit).
  useEffect(() => {
    const loadUserParams = async () => {
      if (!auth.currentUser) return;
      try {
        const calculationsDoc = doc(db, `users/${auth.currentUser.uid}/data/calculations`);
        const snapshot = await getDoc(calculationsDoc);
        // Le percentuali di macronutrienti seguono sempre le Linee guida CREA:
        // solo il totale calorico giornaliero è personalizzabile.
        if (snapshot.exists() && snapshot.data().results) {
          const results = snapshot.data().results;
          const dailyTarget = Math.round((results.dailyMetabolism || 0) - (results.dailyDeficit || 0));
          setUserTarget({
            totalCalories: dailyTarget > 0 ? dailyTarget : 2000,
            carbsPercent: CREA_TARGET.carbsPercent,
            proteinsPercent: CREA_TARGET.proteinsPercent,
            fatsPercent: CREA_TARGET.fatsPercent
          });
        }
      } catch (e) {
        console.error("Errore caricamento parametri utente:", e);
      }
    };
    loadUserParams();
  }, []);

  // Carica le ricette salvate da Firestore
  useEffect(() => {
    const loadRecipes = async () => {
      if (!auth.currentUser) { setIsLoadingRecipes(false); return; }
      const uid = auth.currentUser.uid;

      try {
        // Migrazione da localStorage, se presente
        const savedRecipes = localStorage.getItem('piano_alimentare_recipes');
        if (savedRecipes) {
          try {
            const parsedRecipes = JSON.parse(savedRecipes);
            if (Object.keys(parsedRecipes).length > 0) {
              await migrateLocalStorageToFirestore(parsedRecipes);
              localStorage.removeItem('piano_alimentare_recipes');
            }
          } catch (error) {
            console.error('Errore nella migrazione delle ricette:', error);
          }
        }

        const recipesCollection = collection(db, `users/${uid}/recipes`);
        const recipesSnapshot = await getDocs(recipesCollection);

        const recipesData: Record<string, Recipe> = {};
        for (const d of recipesSnapshot.docs) {
          const data = d.data() as Partial<Recipe> & { name: string };
          if (data.id) {
            recipesData[data.id] = data as Recipe;
          } else {
            // Schema precedente: il documento era identificato dal nome invece che
            // da un id stabile. Migra a un id, così una futura ridenominazione non
            // creerà più una voce orfana.
            const newId = legacyRecipeId(d.id);
            // Le ricette del vecchio schema non avevano carboidrati/grassi per 100 g:
            // li ricalcoliamo dagli ingredienti, così la ricetta è subito richiamabile
            // come alimento nei pasti.
            const totals = calculateTotals((data as Recipe).ingredients || []);
            const migrated: Recipe = {
              ...(data as Recipe),
              id: newId,
              totalGrams: totals.grams,
              totalCalories: totals.calories,
              totalProteins: totals.proteins,
              totalCarbs: totals.carbs,
              totalFats: totals.fats,
              caloriesPer100g: totals.caloriesPer100g,
              proteinsPer100g: totals.proteinsPer100g,
              carbsPer100g: totals.carbsPer100g,
              fatsPer100g: totals.fatsPer100g,
            };
            await setDoc(doc(db, `users/${uid}/recipes/${newId}`), migrated);
            await deleteDoc(d.ref);
            recipesData[newId] = migrated;
            syncRecipeToFoodDatabase(migrated);
          }
        }

        if (Object.keys(recipesData).length > 0) {
          setRecipes(recipesData);
          const first = Object.values(recipesData)[0];
          setCurrentRecipeId(first.id);
          setCurrentRecipeName(first.name);
          setIngredients(first.ingredients);
        }
      } catch (error) {
        console.error('Errore nel caricamento delle ricette da Firestore:', error);
      } finally {
        setIsLoadingRecipes(false);
      }
    };

    loadRecipes();
  }, []);

  const handleGenerateAiRecipes = async () => {
    const ingredientNames = ingredients
      .filter(i => i.food.trim() !== '')
      .map(i => i.food);

    if (ingredientNames.length === 0) {
      showToast("Aggiungi almeno un ingrediente per generare ricette con l'AI.", 'error');
      return;
    }

    setIsGenerating(true);
    setShowAiModal(true);
    try {
      // Target per singolo pasto: circa un quarto del fabbisogno giornaliero
      const mealTarget = {
        ...userTarget,
        totalCalories: Math.round(userTarget.totalCalories / 4)
      };

      const suggestions = await generateRecipesWithGemini(ingredientNames, mealTarget);
      setAiSuggestions(suggestions);
    } catch (error: any) {
      console.error(error);
      showToast("Errore durante la generazione delle ricette: " + error.message, 'error');
      setShowAiModal(false);
    } finally {
      setIsGenerating(false);
    }
  };

  const applyAiRecipe = (suggestion: RecipeSuggestion) => {
    const id = generateRecipeId();
    const newIngredients: RecipeItem[] = suggestion.ingredients.map((ing, idx) => ({
      id: `ai-${Date.now()}-${idx}`,
      food: ing.name,
      grams: parseInt(ing.amount) || 100,
      calories: 0, // L'utente collega l'ingrediente al database con la ricerca
      proteins: 0,
      carbs: 0,
      fats: 0
    }));
    setCurrentRecipeId(id);
    setCurrentRecipeName(suggestion.title);
    setIngredients(newIngredients);
    setShowAiModal(false);
    saveRecipe(id, suggestion.title, newIngredients);
  };

  // Funzione per migrare i dati da localStorage a Firestore (schema legacy, senza id)
  const migrateLocalStorageToFirestore = async (recipesData: Record<string, Omit<Recipe, 'id'>>) => {
    if (!auth.currentUser) return;

    try {
      const batch = [];
      for (const [recipeName, recipe] of Object.entries(recipesData)) {
        const id = legacyRecipeId(recipeName);
        const recipeRef = doc(db, `users/${auth.currentUser.uid}/recipes/${id}`);
        batch.push(setDoc(recipeRef, { ...recipe, id, name: recipe.name || recipeName }));
      }
      await Promise.all(batch);
    } catch (error) {
      console.error('Errore durante la migrazione delle ricette:', error);
    }
  };

  // Salva le ricette in Firestore quando cambiano
  useEffect(() => {
    const saveRecipesToFirestore = async () => {
      if (!auth.currentUser || Object.keys(recipes).length === 0) return;

      try {
        const batch = [];
        for (const recipe of Object.values(recipes)) {
          const recipeRef = doc(db, `users/${auth.currentUser.uid}/recipes/${recipe.id}`);
          batch.push(setDoc(recipeRef, recipe));
        }
        await Promise.all(batch);
      } catch (error) {
        console.error('Errore nel salvataggio delle ricette su Firestore:', error);
      }
    };

    saveRecipesToFirestore();
  }, [recipes]);

  const addIngredient = () => {
    const newItem: RecipeItem = {
      id: Date.now().toString(),
      food: '',
      grams: 100,
      calories: 0,
      proteins: 0,
      carbs: 0,
      fats: 0,
      category: ''
    };
    setIngredients([...ingredients, newItem]);
  };

  const updateIngredient = (id: string, updates: Partial<RecipeItem>) => {
    const updatedIngredients = ingredients.map(item =>
      item.id === id ? { ...item, ...updates } : item
    );
    setIngredients(updatedIngredients);
    saveRecipe(currentRecipeId, currentRecipeName, updatedIngredients);
  };

  const handleFoodSelect = (item: RecipeItem, food: FoodOption | null) => {
    if (!food) {
      updateIngredient(item.id, {
        food: '', calories: 0, proteins: 0, carbs: 0, fats: 0, category: '',
        baseCalories: 0, baseProteins: 0, baseCarbs: 0, baseFats: 0
      });
      return;
    }
    const grams = item.grams || 100;
    updateIngredient(item.id, {
      food: food.name,
      category: food.category,
      grams,
      calories: (food.calories * grams) / 100,
      proteins: (food.proteins * grams) / 100,
      carbs: (food.carbs * grams) / 100,
      fats: (food.fats * grams) / 100,
      baseCalories: food.calories,
      baseProteins: food.proteins,
      baseCarbs: food.carbs,
      baseFats: food.fats,
    });
  };

  const handleGramsChange = (item: RecipeItem, rawValue: string) => {
    const grams = parseFloat(rawValue) || 0;
    if (item.food) {
      const base = getBaseValues(item);
      updateIngredient(item.id, {
        grams,
        calories: (base.calories * grams) / 100,
        proteins: (base.proteins * grams) / 100,
        carbs: (base.carbs * grams) / 100,
        fats: (base.fats * grams) / 100,
        baseCalories: base.calories,
        baseProteins: base.proteins,
        baseCarbs: base.carbs,
        baseFats: base.fats,
      });
    } else {
      updateIngredient(item.id, { grams });
    }
  };

  const removeIngredient = (id: string) => {
    const updatedIngredients = ingredients.filter(item => item.id !== id);
    setIngredients(updatedIngredients);
    saveRecipe(currentRecipeId, currentRecipeName, updatedIngredients);
  };

  const calculateTotals = (ingredientsList: RecipeItem[]) => {
    const totals = ingredientsList.reduce((acc, item) => ({
      grams: acc.grams + (item.grams || 0),
      calories: acc.calories + (item.calories || 0),
      proteins: acc.proteins + (item.proteins || 0),
      carbs: acc.carbs + (item.carbs || 0),
      fats: acc.fats + (item.fats || 0)
    }), { grams: 0, calories: 0, proteins: 0, carbs: 0, fats: 0 });

    const caloriesPer100g = totals.grams > 0 ? (totals.calories / totals.grams) * 100 : 0;
    const proteinsPer100g = totals.grams > 0 ? (totals.proteins / totals.grams) * 100 : 0;
    const carbsPer100g = totals.grams > 0 ? (totals.carbs / totals.grams) * 100 : 0;
    const fatsPer100g = totals.grams > 0 ? (totals.fats / totals.grams) * 100 : 0;

    return { ...totals, caloriesPer100g, proteinsPer100g, carbsPer100g, fatsPer100g };
  };

  // Id dell'alimento "specchio" della ricetta nel database condiviso, derivato
  // dall'id stabile della ricetta (non più dal nome): rinominare la ricetta ora
  // aggiorna questa stessa voce invece di lasciarne una orfana.
  const recipeFoodId = (uid: string, recipeId: string) => `recipe_${uid}_${recipeId}`;

  /** Rende la ricetta cercabile come un normale alimento in qualunque pasto (Dieta/Ricette),
   *  senza dover reinserire ogni volta i singoli ingredienti. */
  const syncRecipeToFoodDatabase = async (recipe: Recipe) => {
    if (!auth.currentUser || recipe.totalGrams <= 0) return;
    try {
      const foodId = recipeFoodId(auth.currentUser.uid, recipe.id);
      await setDoc(doc(db, 'alimenti', foodId), {
        name: `${recipe.name} (ricetta)`,
        category: calculateFoodCategory(recipe.carbsPer100g, recipe.proteinsPer100g, recipe.fatsPer100g),
        calories: recipe.caloriesPer100g,
        carbs: recipe.carbsPer100g,
        proteins: recipe.proteinsPer100g,
        fats: recipe.fatsPer100g,
        unit: 'g',
        creatorId: auth.currentUser.uid,
        isRecipe: true,
        sourceRecipeId: recipe.id,
        sourceRecipeName: recipe.name,
        createdAt: new Date().toISOString(),
      }, { merge: true });
    } catch (error) {
      console.error('Errore sincronizzazione ricetta come alimento:', error);
    }
  };

  const saveRecipe = (id: string, name: string, ingredientsList: RecipeItem[]) => {
    if (name.trim() === '') return;

    const totals = calculateTotals(ingredientsList);

    const updatedRecipe: Recipe = {
      id,
      name,
      ingredients: ingredientsList,
      totalGrams: totals.grams,
      totalCalories: totals.calories,
      totalProteins: totals.proteins,
      totalCarbs: totals.carbs,
      totalFats: totals.fats,
      caloriesPer100g: totals.caloriesPer100g,
      proteinsPer100g: totals.proteinsPer100g,
      carbsPer100g: totals.carbsPer100g,
      fatsPer100g: totals.fatsPer100g,
    };

    setRecipes(prev => ({ ...prev, [id]: updatedRecipe }));
    syncRecipeToFoodDatabase(updatedRecipe);
  };

  const startNewRecipe = () => {
    setCurrentRecipeId(generateRecipeId());
    setCurrentRecipeName('');
    setIngredients([]);
  };

  // Elimina una ricetta
  const deleteRecipe = async (id: string) => {
    const recipe = recipes[id];
    if (!id || !recipe) return;

    const ok = await confirm({
      title: 'Eliminare questa ricetta?',
      message: `"${recipe.name}" verrà rimossa, insieme alla voce corrispondente nel database alimenti. L'azione non può essere annullata.`,
      confirmLabel: 'Elimina',
      danger: true,
    });
    if (ok) {
      try {
        if (auth.currentUser) {
          await deleteDoc(doc(db, `users/${auth.currentUser.uid}/recipes/${id}`));
          try {
            await deleteDoc(doc(db, 'alimenti', recipeFoodId(auth.currentUser.uid, id)));
          } catch (mirrorError) {
            // La voce "specchio" può non esistere (ricetta mai sincronizzata): non è un errore.
            console.warn('Voce alimento della ricetta non eliminata:', mirrorError);
          }
        }

        const newRecipes = { ...recipes };
        delete newRecipes[id];
        setRecipes(newRecipes);

        if (currentRecipeId === id) {
          const remaining = Object.values(newRecipes);
          if (remaining.length > 0) {
            setCurrentRecipeId(remaining[0].id);
            setCurrentRecipeName(remaining[0].name);
            setIngredients(remaining[0].ingredients);
          } else {
            startNewRecipe();
          }
        }
        showToast('Ricetta eliminata.', 'success');
      } catch (error) {
        console.error('Errore nell\'eliminazione della ricetta da Firestore:', error);
        showToast('Errore durante l\'eliminazione della ricetta.', 'error');
      }
    }
  };

  const exportToExcel = () => {
    const totalsNow = calculateTotals(ingredients);
    if (ingredients.length === 0) return;

    type ExcelRow = Record<string, string | number>;
    const ingredientsData: ExcelRow[] = ingredients.map(item => ({
      'Alimento': item.food,
      'Grammi': item.grams,
      'Calorie': Math.round(item.calories),
      'Proteine (g)': item.proteins.toFixed(1),
      'Carboidrati (g)': item.carbs.toFixed(1),
      'Grassi (g)': item.fats.toFixed(1)
    }));

    ingredientsData.push({
      'Alimento': '', 'Grammi': '', 'Calorie': '', 'Proteine (g)': '', 'Carboidrati (g)': '', 'Grassi (g)': ''
    });

    ingredientsData.push({
      'Alimento': 'TOTALI',
      'Grammi': totalsNow.grams,
      'Calorie': Math.round(totalsNow.calories),
      'Proteine (g)': totalsNow.proteins.toFixed(1),
      'Carboidrati (g)': totalsNow.carbs.toFixed(1),
      'Grassi (g)': totalsNow.fats.toFixed(1)
    });

    ingredientsData.push({
      'Alimento': 'PER 100g',
      'Grammi': 100,
      'Calorie': Math.round(totalsNow.caloriesPer100g),
      'Proteine (g)': totalsNow.proteinsPer100g.toFixed(1),
      'Carboidrati (g)': '',
      'Grassi (g)': ''
    });

    const ws = XLSX.utils.json_to_sheet(ingredientsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ricetta');
    const fileName = currentRecipeName.trim() || 'ricetta';
    XLSX.writeFile(wb, `${fileName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.xlsx`);
  };

  const totals = calculateTotals(ingredients);
  const balance = evaluateMealBalance(totals);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('index', index.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    const sourceIndex = parseInt(e.dataTransfer.getData('index'));
    if (sourceIndex === targetIndex) return;

    const newIngredients = [...ingredients];
    const [movedItem] = newIngredients.splice(sourceIndex, 1);
    newIngredients.splice(targetIndex, 0, movedItem);
    setIngredients(newIngredients);
    saveRecipe(currentRecipeId, currentRecipeName, newIngredients);
  };

  if (isLoadingRecipes) {
    return (
      <div className="space-y-8">
        <SkeletonCard />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2"><SkeletonCard className="h-64" /></div>
          <SkeletonCard className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header e Selezione Ricetta */}
      <div className="md3-card p-6 sm:p-8 border border-sage-200 dark:border-sage-800">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex-1 space-y-2">
            <h2 className="text-3xl font-extrabold text-sage-900 dark:text-sage-50 flex items-center mb-0">
              <CookingPot className="w-8 h-8 mr-4 text-primary-600 dark:text-primary-400" />
              Ricettario Intelligente
            </h2>
            <p className="text-sage-500 dark:text-sage-400 font-medium">Crea, bilancia e genera ricette basate sui tuoi ingredienti.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              className="md3-input min-w-[200px]"
              value={recipes[currentRecipeId] ? currentRecipeId : NEW_RECIPE_VALUE}
              onChange={(e) => {
                const value = e.target.value;
                if (value === NEW_RECIPE_VALUE) {
                  startNewRecipe();
                } else if (recipes[value]) {
                  setCurrentRecipeId(value);
                  setCurrentRecipeName(recipes[value].name);
                  setIngredients(recipes[value].ingredients);
                }
              }}
            >
              <option value={NEW_RECIPE_VALUE}>+ Crea Nuova Ricetta</option>
              {Object.values(recipes).map(recipe => (
                <option key={recipe.id} value={recipe.id}>{recipe.name}</option>
              ))}
            </select>

            <button
              onClick={() => deleteRecipe(currentRecipeId)}
              disabled={!recipes[currentRecipeId]}
              className="p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md3-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              title="Elimina ricetta"
            >
              <Trash2 className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Editor Ingredienti */}
        <div className="lg:col-span-2 space-y-6">
          <div className="md3-card p-6 border border-sage-200 dark:border-sage-800">
            <div className="flex items-center justify-between mb-6 gap-3">
              <input
                type="text"
                value={currentRecipeName}
                onChange={(e) => setCurrentRecipeName(e.target.value)}
                onBlur={() => saveRecipe(currentRecipeId, currentRecipeName, ingredients)}
                className="text-2xl font-extrabold bg-transparent border-none focus:ring-0 text-sage-900 dark:text-sage-50 placeholder-sage-300 w-full"
                placeholder="Nome della ricetta..."
              />
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleGenerateAiRecipes}
                  className="flex items-center space-x-2 px-4 py-2 bg-primary-600 dark:bg-primary-500 text-white rounded-full hover:bg-primary-700 transition-all shadow-md3-1 font-bold text-sm whitespace-nowrap"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>AI Gourmet</span>
                </button>
                <button
                  onClick={addIngredient}
                  className="p-2 bg-sage-100 dark:bg-sage-800 text-sage-600 dark:text-sage-300 rounded-full hover:bg-sage-200 dark:hover:bg-sage-700 transition-all"
                  title="Aggiungi ingrediente"
                >
                  <Plus className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {ingredients.map((item, idx) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, idx)}
                  className="grid grid-cols-12 gap-3 items-center p-3 bg-sage-50/50 dark:bg-sage-900/20 rounded-md3-medium border border-transparent hover:border-sage-200 dark:hover:border-sage-800 transition-all group cursor-move"
                >
                  <div className="col-span-1 flex justify-center opacity-30 group-hover:opacity-100 transition-opacity">
                    <span className="text-sage-400 dark:text-sage-600 font-extrabold">⋮⋮</span>
                  </div>
                  <div className="col-span-5 md:col-span-5">
                    <FoodAutocomplete
                      value={item.food}
                      onSelect={(food) => handleFoodSelect(item, food)}
                    />
                  </div>
                  <div className="col-span-3 md:col-span-2">
                    <div className="relative">
                      <input
                        type="number"
                        value={item.grams || ''}
                        onChange={(e) => handleGramsChange(item, e.target.value)}
                        className="md3-input w-full py-2 pr-8 font-bold"
                        placeholder="0"
                        min="0"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-sage-400 uppercase">g</span>
                    </div>
                  </div>
                  <div className="col-span-2 text-center">
                    <div className="text-sm font-extrabold text-sage-900 dark:text-sage-50">{Math.round(item.calories || 0)}</div>
                    <div className="text-[9px] font-bold uppercase tracking-widest text-sage-400">kcal</div>
                  </div>
                  <div className="col-span-1 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => removeIngredient(item.id)} className="text-red-400 hover:text-red-600" title="Rimuovi ingrediente">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}

              {ingredients.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-sage-200 dark:border-sage-800 rounded-md3-large">
                  <CookingPot className="w-12 h-12 text-sage-300 dark:text-sage-700 mx-auto mb-4" />
                  <p className="text-sage-500 dark:text-sage-400 font-medium">Inizia aggiungendo degli ingredienti o usa l'AI</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Riepilogo Nutrizionale */}
        <div className="space-y-6">
          <div className="md3-card p-6 border border-sage-200 dark:border-sage-800 sticky top-24">
            <h3 className="text-xl font-bold text-sage-900 dark:text-sage-50 mb-6 flex items-center">
              <Info className="w-5 h-5 mr-3 text-primary-500" />
              Valori Totali
            </h3>

            <div className="space-y-6">
              <div className="flex flex-col items-center gap-4">
                <MacroDonut
                  carbsPercent={balance.evaluations.find(e => e.macro === 'carbs')?.percent || 0}
                  proteinsPercent={balance.evaluations.find(e => e.macro === 'proteins')?.percent || 0}
                  fatsPercent={balance.evaluations.find(e => e.macro === 'fats')?.percent || 0}
                  centerLabel={`${Math.round(totals.calories)}`}
                  centerSubLabel="kcal"
                />
                <div className="grid grid-cols-3 gap-3 w-full">
                  {(['carbs', 'proteins', 'fats'] as const).map(macro => {
                    const c = MACRO_CARD_CLASSES[macro];
                    const grams = macro === 'carbs' ? totals.carbs : macro === 'proteins' ? totals.proteins : totals.fats;
                    return (
                      <div key={macro} className={`p-3 rounded-md3-medium text-center border ${c.bg} ${c.border}`}>
                        <div className={`text-lg font-extrabold ${c.textStrong}`}>{Math.round(grams)}g</div>
                        <div className={`flex items-center justify-center gap-1 text-[9px] font-bold uppercase tracking-widest ${c.text}`}>
                          <MacroIcon macro={macro} className="w-3 h-3 flex-shrink-0" />
                          {MACRO_LABELS[macro]}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {!balance.isEmpty && (
                <div className={`p-4 rounded-md3-medium border text-sm ${
                  balance.isBalanced
                    ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800/30 text-green-800 dark:text-green-200'
                    : 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800/30 text-orange-800 dark:text-orange-200'
                }`}>
                  <p className="font-bold mb-1">{balance.isBalanced ? '✓ Ricetta equilibrata (CREA)' : 'Ricetta da bilanciare'}</p>
                  {!balance.isBalanced && (
                    <ul className="space-y-1 text-xs">
                      {balance.suggestions.map((s, i) => <li key={i}>• {s}</li>)}
                    </ul>
                  )}
                </div>
              )}

              <div className="pt-6 border-t border-sage-100 dark:border-sage-800 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-sage-500 uppercase tracking-wider">Per 100g</span>
                  <span className="text-lg font-extrabold text-sage-900 dark:text-sage-50">{Math.round(totals.caloriesPer100g)} kcal</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-sage-500 uppercase tracking-wider">Proteine/100g</span>
                  <span className="text-lg font-extrabold text-sage-900 dark:text-sage-50">{Math.round(totals.proteinsPer100g)}g</span>
                </div>
              </div>

              <button
                onClick={exportToExcel}
                className="w-full py-4 bg-sage-900 dark:bg-sage-100 text-white dark:text-sage-900 rounded-full font-bold flex items-center justify-center space-x-2 hover:opacity-90 transition-all"
              >
                <Download className="w-5 h-5" />
                <span>Esporta Ricetta</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* AI Suggestions Modal */}
      {showAiModal && (
        <div className="md3-modal-overlay">
          <div className="bg-white dark:bg-surface-dark w-full max-w-4xl max-h-[90vh] rounded-md3-large shadow-md3-3 overflow-hidden flex flex-col border border-sage-200 dark:border-sage-800">
            <div className="p-6 sm:p-8 bg-primary-600 dark:bg-primary-700 text-white flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-white/20 p-3 rounded-md3-medium">
                  <Sparkles className="w-8 h-8 text-accent-300" />
                </div>
                <div>
                  <h3 className="text-2xl font-extrabold mb-0 text-white">Suggerimenti AI</h3>
                  <p className="text-primary-100 text-sm font-medium">Ricette bilanciate create apposta per te</p>
                </div>
              </div>
              <button onClick={() => setShowAiModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors" title="Chiudi">
                <Plus className="w-8 h-8 rotate-45" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8 scroll-smooth">
              {isGenerating ? (
                <div className="h-full flex flex-col items-center justify-center space-y-6 py-20">
                  <div className="relative">
                    <Loader2 className="w-20 h-20 text-primary-500 animate-spin" />
                    <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-accent-500 animate-pulse" />
                  </div>
                  <div className="text-center">
                    <h4 className="text-xl font-bold text-sage-900 dark:text-sage-50 mb-2">Lo Chef AI sta cucinando...</h4>
                    <p className="text-sage-500 dark:text-sage-400">Analizzando combinazioni e bilanciando i macronutrienti</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {aiSuggestions.map((suggestion, idx) => (
                    <div key={idx} className="flex flex-col bg-sage-50/50 dark:bg-sage-900/30 rounded-md3-large border border-sage-200 dark:border-sage-800 hover:border-primary-400 transition-all group overflow-hidden">
                      <div className="p-6 flex-1 space-y-4">
                        <div className="bg-white dark:bg-surface-dark p-4 rounded-md3-medium shadow-sm">
                          <h4 className="font-extrabold text-sage-900 dark:text-sage-50 group-hover:text-primary-600 transition-colors leading-tight mb-0">
                            {suggestion.title}
                          </h4>
                        </div>
                        <p className="text-xs text-sage-600 dark:text-sage-400 leading-relaxed">
                          {suggestion.description}
                        </p>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-primary-100/50 dark:bg-primary-900/30 p-2 rounded-md3-small text-center">
                            <div className="text-sm font-extrabold text-primary-700 dark:text-primary-300">{suggestion.macros.calories}</div>
                            <div className="text-[8px] font-bold uppercase tracking-tighter text-primary-600/60">kcal</div>
                          </div>
                          <div className="bg-accent-100/50 dark:bg-accent-900/30 p-2 rounded-md3-small text-center">
                            <div className="text-sm font-extrabold text-accent-700 dark:text-accent-300">{suggestion.macros.proteins}g</div>
                            <div className="text-[8px] font-bold uppercase tracking-tighter text-accent-600/60">Prot</div>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-sage-200/50 dark:border-sage-800/50">
                          <div className="flex items-center space-x-2 mb-2">
                            <Info className="w-3 h-3 text-primary-500" />
                            <span className="text-[10px] font-bold uppercase text-sage-400">Perché è bilanciata</span>
                          </div>
                          <p className="text-[10px] text-sage-500 dark:text-sage-400 italic leading-relaxed">
                            "{suggestion.nutritionalReasoning}"
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => applyAiRecipe(suggestion)}
                        className="w-full py-4 bg-primary-600 dark:bg-primary-500 text-white font-extrabold text-sm flex items-center justify-center space-x-2 hover:bg-primary-700 transition-all"
                      >
                        <Check className="w-4 h-4" />
                        <span>Seleziona Ricetta</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 bg-sage-50 dark:bg-sage-900/50 border-t border-sage-200 dark:border-sage-800 text-center">
              <p className="text-[10px] font-bold text-sage-400 uppercase tracking-[0.2em]">
                Generato con Google Gemini • Collega gli ingredienti al tuo database con la ricerca
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
