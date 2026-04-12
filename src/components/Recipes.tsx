import React, { useState, useEffect } from 'react';
import { CookingPot, Download, Plus, Trash2, Sparkles, Loader2, ChevronRight, Info, Check } from 'lucide-react';
import { FoodAutocomplete } from './diet/FoodAutocomplete';
import * as XLSX from 'xlsx';
import { db, auth } from '../firebase';
import { collection, doc, getDocs, setDoc, deleteDoc, query, where, getDoc } from 'firebase/firestore';
import { generateRecipesWithGemini, RecipeSuggestion } from '../utils/gemini';
import { MacroTarget } from '../utils/portionOptimizer';

interface RecipeItem {
  id: string;
  food: string;
  grams: number;
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
  category?: string;
}

interface Recipe {
  name: string;
  ingredients: RecipeItem[];
  totalGrams: number;
  totalCalories: number;
  totalProteins: number;
  caloriesPer100g: number;
  proteinsPer100g: number;
}

export const Recipes: React.FC = () => {
  const [recipes, setRecipes] = useState<Record<string, Recipe>>({});
  const [currentRecipe, setCurrentRecipe] = useState<string>('Nuova Ricetta');
  const [ingredients, setIngredients] = useState<RecipeItem[]>([]);
  
  // AI Recipe Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<RecipeSuggestion[]>([]);
  const [showAiModal, setShowAiModal] = useState(false);
  const [userTarget, setUserTarget] = useState<MacroTarget>({
    totalCalories: 2000,
    carbsPercent: 50,
    proteinsPercent: 20,
    fatsPercent: 30
  });

  // Carica i parametri dal database
  useEffect(() => {
    const loadUserParams = async () => {
      if (!auth.currentUser) return;
      try {
        const userDoc = doc(db, 'users', auth.currentUser.uid);
        const snapshot = await getDoc(userDoc);
        if (snapshot.exists()) {
          const data = snapshot.data();
          setUserTarget({
            totalCalories: data.dailyCalories || 2000,
            carbsPercent: data.preferences?.carbsPercent || 50,
            proteinsPercent: data.preferences?.proteinsPercent || 20,
            fatsPercent: data.preferences?.fatsPercent || 30
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
      if (!auth.currentUser) return;
      
      try {
        // Prima controlla se ci sono dati in localStorage da migrare
        const savedRecipes = localStorage.getItem('piano_alimentare_recipes');
        if (savedRecipes) {
          try {
            const parsedRecipes = JSON.parse(savedRecipes);
            if (Object.keys(parsedRecipes).length > 0) {
              // Migra i dati da localStorage a Firestore
              await migrateLocalStorageToFirestore(parsedRecipes);
              // Rimuovi i dati da localStorage dopo la migrazione
              localStorage.removeItem('piano_alimentare_recipes');
            }
          } catch (error) {
            console.error('Errore nella migrazione delle ricette:', error);
          }
        }
        
        // Carica i dati da Firestore
        const recipesCollection = collection(db, `users/${auth.currentUser.uid}/recipes`);
        const recipesSnapshot = await getDocs(recipesCollection);
        
        const recipesData: Record<string, Recipe> = {};
        recipesSnapshot.docs.forEach(doc => {
          recipesData[doc.id] = doc.data() as Recipe;
        });
        
        if (Object.keys(recipesData).length > 0) {
          setRecipes(recipesData);
          
          // Se ci sono ricette salvate, imposta la prima come ricetta corrente
          const recipeNames = Object.keys(recipesData);
          if (recipeNames.length > 0) {
            setCurrentRecipe(recipeNames[0]);
            setIngredients(recipesData[recipeNames[0]].ingredients);
          }
        }
      } catch (error) {
        console.error('Errore nel caricamento delle ricette da Firestore:', error);
      }
    };
    
    loadRecipes();
  }, []);

  const handleGenerateAiRecipes = async () => {
    const ingredientNames = ingredients
      .filter(i => i.food.trim() !== '')
      .map(i => i.food);
    
    if (ingredientNames.length === 0) {
      alert("Aggiungi almeno un ingrediente per generare ricette con l'AI.");
      return;
    }

    setIsGenerating(true);
    setShowAiModal(true);
    try {
      // Dividiamo il target giornaliero per 4 per avere un target per pasto
      const mealTarget = {
        ...userTarget,
        totalCalories: Math.round(userTarget.totalCalories / 4)
      };
      
      const suggestions = await generateRecipesWithGemini(ingredientNames, mealTarget);
      setAiSuggestions(suggestions);
    } catch (error: any) {
      console.error(error);
      alert("Errore durante la generazione delle ricette: " + error.message);
      setShowAiModal(false);
    } finally {
      setIsGenerating(false);
    }
  };

  const applyAiRecipe = (suggestion: RecipeSuggestion) => {
    setCurrentRecipe(suggestion.title);
    const newIngredients: RecipeItem[] = suggestion.ingredients.map((ing, idx) => ({
      id: `ai-${Date.now()}-${idx}`,
      food: ing.name,
      grams: parseInt(ing.amount) || 100,
      calories: 0, // Verranno ricalcolati o l'utente li cercherà
      proteins: 0,
      carbs: 0,
      fats: 0
    }));
    setIngredients(newIngredients);
    setShowAiModal(false);
    saveCurrentRecipe(newIngredients);
  };
  
  // Funzione per migrare i dati da localStorage a Firestore
  const migrateLocalStorageToFirestore = async (recipesData: Record<string, Recipe>) => {
    if (!auth.currentUser) return;
    
    try {
      const batch = [];
      for (const [recipeName, recipe] of Object.entries(recipesData)) {
        const recipeRef = doc(db, `users/${auth.currentUser.uid}/recipes/${recipeName}`);
        batch.push(setDoc(recipeRef, recipe));
      }
      await Promise.all(batch);
      console.log('Migrazione delle ricette completata con successo');
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
        for (const [recipeName, recipe] of Object.entries(recipes)) {
          const recipeRef = doc(db, `users/${auth.currentUser.uid}/recipes/${recipeName}`);
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
      grams: 0,
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
    saveCurrentRecipe(updatedIngredients);
  };

  const removeIngredient = (id: string) => {
    const updatedIngredients = ingredients.filter(item => item.id !== id);
    setIngredients(updatedIngredients);
    saveCurrentRecipe(updatedIngredients);
  };
  
  const calculateTotals = (ingredientsList: RecipeItem[]) => {
    const totals = ingredientsList.reduce((acc, item) => ({
      grams: acc.grams + (item.grams || 0),
      calories: acc.calories + (item.calories || 0),
      proteins: acc.proteins + (item.proteins || 0),
      carbs: acc.carbs + (item.carbs || 0),
      fats: acc.fats + (item.fats || 0)
    }), { grams: 0, calories: 0, proteins: 0, carbs: 0, fats: 0 });
    
    // Calcola valori per 100g
    const caloriesPer100g = totals.grams > 0 ? (totals.calories / totals.grams) * 100 : 0;
    const proteinsPer100g = totals.grams > 0 ? (totals.proteins / totals.grams) * 100 : 0;
    
    return {
      ...totals,
      caloriesPer100g,
      proteinsPer100g
    };
  };
  
  const saveCurrentRecipe = (ingredientsList: RecipeItem[] = ingredients) => {
    if (currentRecipe.trim() === '') return;
    
    const totals = calculateTotals(ingredientsList);
    
    const updatedRecipe: Recipe = {
      name: currentRecipe,
      ingredients: ingredientsList,
      totalGrams: totals.grams,
      totalCalories: totals.calories,
      totalProteins: totals.proteins,
      caloriesPer100g: totals.caloriesPer100g,
      proteinsPer100g: totals.proteinsPer100g
    };
    
    setRecipes(prev => ({
      ...prev,
      [currentRecipe]: updatedRecipe
    }));
  };
  
  // Elimina una ricetta
  const deleteRecipe = async (recipeName: string) => {
    if (!recipeName || recipeName === 'Nuova Ricetta') return;
    
    if (confirm(`Sei sicuro di voler eliminare la ricetta "${recipeName}"?`)) {
      try {
        if (auth.currentUser) {
          // Elimina il documento da Firestore
          const recipeRef = doc(db, `users/${auth.currentUser.uid}/recipes/${recipeName}`);
          await deleteDoc(recipeRef);
        }
        
        const newRecipes = { ...recipes };
        delete newRecipes[recipeName];
        setRecipes(newRecipes);
        
        // Se abbiamo eliminato la ricetta corrente, passa alla prima disponibile o resetta
        if (currentRecipe === recipeName) {
          const remainingNames = Object.keys(newRecipes);
          if (remainingNames.length > 0) {
            setCurrentRecipe(remainingNames[0]);
            setIngredients(newRecipes[remainingNames[0]].ingredients);
          } else {
            setCurrentRecipe('Nuova Ricetta');
            setIngredients([]);
          }
        }
      } catch (error) {
        console.error('Errore nell\'eliminazione della ricetta da Firestore:', error);
      }
    }
  };
  
  const createNewRecipe = () => {
    setCurrentRecipe('Nuova Ricetta');
    setIngredients([]);
  };
  
  const loadRecipe = (recipeName: string) => {
    if (recipes[recipeName]) {
      setCurrentRecipe(recipeName);
      setIngredients(recipes[recipeName].ingredients);
    }
  };
  
  const exportToExcel = () => {
    if (!currentRecipe || !recipes[currentRecipe]) return;
    
    const recipe = recipes[currentRecipe];
    
    // Prepara i dati per l'export
    const ingredientsData = recipe.ingredients.map(item => ({
      'Alimento': item.food,
      'Grammi': item.grams,
      'Calorie': Math.round(item.calories),
      'Proteine (g)': item.proteins.toFixed(1),
      'Carboidrati (g)': item.carbs.toFixed(1),
      'Grassi (g)': item.fats.toFixed(1)
    }));
    
    // Aggiungi una riga vuota e poi i totali
    ingredientsData.push({
      'Alimento': '',
      'Grammi': '',
      'Calorie': '',
      'Proteine (g)': '',
      'Carboidrati (g)': '',
      'Grassi (g)': ''
    });
    
    ingredientsData.push({
      'Alimento': 'TOTALI',
      'Grammi': recipe.totalGrams,
      'Calorie': Math.round(recipe.totalCalories),
      'Proteine (g)': recipe.totalProteins.toFixed(1),
      'Carboidrati (g)': '',
      'Grassi (g)': ''
    });
    
    ingredientsData.push({
      'Alimento': 'PER 100g',
      'Grammi': 100,
      'Calorie': Math.round(recipe.caloriesPer100g),
      'Proteine (g)': recipe.proteinsPer100g.toFixed(1),
      'Carboidrati (g)': '',
      'Grassi (g)': ''
    });
    
    // Crea il workbook e il worksheet
    const ws = XLSX.utils.json_to_sheet(ingredientsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ricetta');
    
    // Genera il file Excel e lo scarica
    XLSX.writeFile(wb, `${currentRecipe.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.xlsx`);
  };
  
  const totals = calculateTotals(ingredients);
  
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
    saveCurrentRecipe(newIngredients);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      {/* Header e Selezione Ricetta */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex-1 space-y-2">
          <h2 className="text-3xl font-black text-sage-900 dark:text-sage-50 flex items-center">
            <CookingPot className="w-8 h-8 mr-4 text-primary-600 dark:text-primary-400" />
            Ricettario Intelligente
          </h2>
          <p className="text-sage-500 dark:text-sage-400 font-medium">Crea, bilancia e genera ricette gourmet basate sui tuoi ingredienti.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <select 
            className="bg-white dark:bg-surface-dark border border-sage-200 dark:border-sage-800 rounded-2xl px-4 py-2 text-sage-900 dark:text-sage-50 min-w-[200px] shadow-sm focus:ring-2 focus:ring-primary-500"
            value={currentRecipe}
            onChange={(e) => {
              const name = e.target.value;
              setCurrentRecipe(name);
              if (recipes[name]) {
                setIngredients(recipes[name].ingredients);
              } else {
                setIngredients([]);
              }
            }}
          >
            <option value="Nuova Ricetta">+ Crea Nuova Ricetta</option>
            {Object.keys(recipes).map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          
          <button 
            onClick={() => deleteRecipe(currentRecipe)}
            className="p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-all"
            title="Elimina ricetta"
          >
            <Trash2 className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Editor Ingredienti */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-surface-dark p-6 rounded-[32px] border border-sage-200 dark:border-sage-800 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <input
                type="text"
                value={currentRecipe}
                onChange={(e) => setCurrentRecipe(e.target.value)}
                className="text-2xl font-black bg-transparent border-none focus:ring-0 text-sage-900 dark:text-sage-50 placeholder-sage-300 w-full"
                placeholder="Nome della ricetta..."
              />
              <div className="flex items-center space-x-2">
                <button 
                  onClick={handleGenerateAiRecipes}
                  className="flex items-center space-x-2 px-4 py-2 bg-primary-600 dark:bg-primary-500 text-white rounded-xl hover:bg-primary-700 transition-all shadow-md font-bold text-sm whitespace-nowrap"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>AI Gourmet</span>
                </button>
                <button 
                  onClick={addIngredient}
                  className="p-2 bg-sage-100 dark:bg-sage-800 text-sage-600 dark:text-sage-300 rounded-xl hover:bg-sage-200 dark:hover:bg-sage-700 transition-all"
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
                  className="grid grid-cols-12 gap-3 items-center p-3 bg-sage-50/50 dark:bg-sage-900/20 rounded-2xl border border-transparent hover:border-sage-200 dark:hover:border-sage-800 transition-all group cursor-move"
                >
                  <div className="col-span-1 flex justify-center opacity-30 group-hover:opacity-100 transition-opacity">
                    <span className="text-sage-400 dark:text-sage-600 font-black">⋮⋮</span>
                  </div>
                  <div className="col-span-5 md:col-span-6">
                    <FoodAutocomplete
                      onSelect={(food) => {
                        updateIngredient(item.id, {
                          food: food.name,
                          calories: food.calories,
                          proteins: food.proteins,
                          carbs: food.carbs,
                          fats: food.fats,
                          category: food.category
                        });
                      }}
                      initialValue={item.food}
                    />
                  </div>
                  <div className="col-span-4 md:col-span-3">
                    <div className="relative">
                      <input
                        type="number"
                        value={item.grams || ''}
                        onChange={(e) => {
                          const g = parseFloat(e.target.value) || 0;
                          updateIngredient(item.id, {
                            grams: g,
                            calories: (item.calories / (item.grams || 100)) * g || 0,
                            proteins: (item.proteins / (item.grams || 100)) * g || 0,
                            carbs: (item.carbs / (item.grams || 100)) * g || 0,
                            fats: (item.fats / (item.grams || 100)) * g || 0
                          });
                        }}
                        className="w-full bg-white dark:bg-surface-dark border-sage-200 dark:border-sage-800 rounded-xl pr-8 font-bold text-sage-900 dark:text-sage-50"
                        placeholder="0"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-sage-400 uppercase">g</span>
                    </div>
                  </div>
                  <div className="col-span-2 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => removeIngredient(item.id)} className="text-red-400 hover:text-red-600">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}

              
              {ingredients.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-sage-200 dark:border-sage-800 rounded-3xl">
                  <CookingPot className="w-12 h-12 text-sage-300 dark:text-sage-700 mx-auto mb-4" />
                  <p className="text-sage-500 dark:text-sage-400 font-medium">Inizia aggiungendo degli ingredienti o usa l'AI</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Riepilogo Nutrizionale */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-surface-dark p-6 rounded-[32px] border border-sage-200 dark:border-sage-800 shadow-xl sticky top-8">
            <h3 className="text-xl font-bold text-sage-900 dark:text-sage-50 mb-6 flex items-center">
              <Info className="w-5 h-5 mr-3 text-primary-500" />
              Valori Totali
            </h3>
            
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-primary-50 dark:bg-primary-900/20 p-4 rounded-2xl text-center">
                  <div className="text-2xl font-black text-primary-700 dark:text-primary-300">{Math.round(totals.calories)}</div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-primary-600/60 dark:text-primary-400/60">Calorie</div>
                </div>
                <div className="bg-accent-50 dark:bg-accent-900/20 p-4 rounded-2xl text-center">
                  <div className="text-2xl font-black text-accent-700 dark:text-accent-300">{Math.round(totals.proteins)}g</div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-accent-600/60 dark:text-accent-400/60">Proteine</div>
                </div>
              </div>
              
              <div className="pt-6 border-t border-sage-100 dark:border-sage-800 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-sage-500 uppercase tracking-wider">Per 100g</span>
                  <span className="text-lg font-black text-sage-900 dark:text-sage-50">{Math.round(totals.caloriesPer100g)} kcal</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-sage-500 uppercase tracking-wider">Proteine/100g</span>
                  <span className="text-lg font-black text-sage-900 dark:text-sage-50">{Math.round(totals.proteinsPer100g)}g</span>
                </div>
              </div>

              <button 
                onClick={exportToExcel}
                className="w-full py-4 bg-sage-900 dark:bg-sage-100 text-white dark:text-sage-900 rounded-2xl font-bold flex items-center justify-center space-x-2 hover:opacity-90 transition-all"
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-sage-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-surface-dark w-full max-w-4xl max-h-[90vh] rounded-[40px] shadow-2xl overflow-hidden flex flex-col border border-sage-200 dark:border-sage-800">
            <div className="p-8 bg-primary-600 dark:bg-primary-700 text-white flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-white/20 p-3 rounded-2xl">
                  <Sparkles className="w-8 h-8 text-accent-300" />
                </div>
                <div>
                  <h3 className="text-2xl font-black">AI Gourmet Suggestions</h3>
                  <p className="text-primary-100 text-sm font-medium">Ricette bilanciate create apposta per te</p>
                </div>
              </div>
              <button onClick={() => setShowAiModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <Plus className="w-8 h-8 rotate-45" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 scroll-smooth">
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
                    <div key={idx} className="flex flex-col bg-sage-50/50 dark:bg-sage-900/30 rounded-[32px] border border-sage-200 dark:border-sage-800 hover:border-primary-400 transition-all group overflow-hidden">
                      <div className="p-6 flex-1 space-y-4">
                        <div className="bg-white dark:bg-surface-dark p-4 rounded-2xl shadow-sm">
                          <h4 className="font-black text-sage-900 dark:text-sage-50 group-hover:text-primary-600 transition-colors leading-tight">
                            {suggestion.title}
                          </h4>
                        </div>
                        <p className="text-xs text-sage-600 dark:text-sage-400 line-clamp-3 leading-relaxed">
                          {suggestion.description}
                        </p>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-primary-100/50 dark:bg-primary-900/30 p-2 rounded-xl text-center">
                            <div className="text-sm font-black text-primary-700 dark:text-primary-300">{suggestion.macros.calories}</div>
                            <div className="text-[8px] font-bold uppercase tracking-tighter text-primary-600/60">kcal</div>
                          </div>
                          <div className="bg-accent-100/50 dark:bg-accent-900/30 p-2 rounded-xl text-center">
                            <div className="text-sm font-black text-accent-700 dark:text-accent-300">{suggestion.macros.proteins}g</div>
                            <div className="text-[8px] font-bold uppercase tracking-tighter text-accent-600/60">Prot</div>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-sage-200/50 dark:border-sage-800/50">
                          <div className="flex items-center space-x-2 mb-2">
                            <Info className="w-3 h-3 text-primary-500" />
                            <span className="text-[10px] font-bold uppercase text-sage-400">Nutritional Logic</span>
                          </div>
                          <p className="text-[10px] text-sage-500 dark:text-sage-400 italic leading-relaxed">
                            "{suggestion.nutritionalReasoning}"
                          </p>
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => applyAiRecipe(suggestion)}
                        className="w-full py-4 bg-primary-600 dark:bg-primary-500 text-white font-black text-sm flex items-center justify-center space-x-2 hover:bg-primary-700 transition-all"
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
                Generato da Gemini 1.5 Pro • Ottimizzato per MacroMind
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};