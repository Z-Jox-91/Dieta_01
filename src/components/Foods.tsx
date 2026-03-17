import React, { useState, useEffect } from 'react';
import { Plus, Upload, Trash2, Edit3, Save, X, CheckCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { db, auth } from '../firebase';
import { collection, doc, getDocs, setDoc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp, Timestamp } from 'firebase/firestore';

export interface FoodItem {
  id: string;
  name: string;
  category: 'CRB' | 'PRT' | 'LPD';
  calories: number;
  carbs: number;
  proteins: number;
  fats: number;
  unit: string;
  createdAt: any;
  creatorId: string;
}

interface NewFoodForm {
  name: string;
  calories: number;
  carbs: number;
  proteins: number;
  fats: number;
  unit: string;
}

export const Foods: React.FC = () => {
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newFood, setNewFood] = useState<NewFoodForm>({
    name: '',
    calories: 0,
    carbs: 0,
    proteins: 0,
    fats: 0,
    unit: 'g'
  });
  const [editFood, setEditFood] = useState<NewFoodForm>({
    name: '',
    calories: 0,
    carbs: 0,
    proteins: 0,
    fats: 0,
    unit: 'g'
  });
  const [isExcelLoaded, setIsExcelLoaded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | 'CRB' | 'PRT' | 'LPD'>('all');

  // Carica i dati da Firestore all'avvio con onSnapshot per real-time sync
  useEffect(() => {
    if (!auth.currentUser) return;

    const foodsCollection = collection(db, 'alimenti');
    const q = query(foodsCollection, orderBy('name', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const foodsList = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as FoodItem[];
      setFoods(foodsList);
      if (foodsList.length > 0) setIsExcelLoaded(true);
    }, (error) => {
      console.error('Errore nel caricamento del database alimentare:', error);
    });

    // Migrazione legacy se necessaria
    const checkMigration = async () => {
      const savedFoods = localStorage.getItem('piano_alimentare_food_database');
      if (savedFoods) {
        try {
          const parsedFoods = JSON.parse(savedFoods);
          if (Array.isArray(parsedFoods) && parsedFoods.length > 0) {
            await migrateToUnifiedDatabase(parsedFoods);
            localStorage.removeItem('piano_alimentare_food_database');
          }
        } catch (e) {
          console.error('Errore migrazione localStorage:', e);
        }
      }
      
      // Controlla anche la vecchia collezione utente
      const userFoodsCollection = collection(db, `users/${auth.currentUser?.uid}/foods`);
      const userFoodsSnapshot = await getDocs(userFoodsCollection);
      if (!userFoodsSnapshot.empty) {
        const userFoods = userFoodsSnapshot.docs.map(doc => doc.data() as FoodItem);
        await migrateToUnifiedDatabase(userFoods);
        // Opzionale: pulisci la vecchia collezione dopo la migrazione
      }
    };

    checkMigration();

    return () => unsubscribe();
  }, []);

  const migrateToUnifiedDatabase = async (foodsData: any[]) => {
    if (!auth.currentUser) return;
    try {
      for (const food of foodsData) {
        const foodId = food.id || `migrated_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const foodRef = doc(db, 'alimenti', foodId);
        await setDoc(foodRef, {
          ...food,
          unit: food.unit || 'g',
          creatorId: auth.currentUser.uid,
          createdAt: food.createdAt || new Date().toISOString()
        }, { merge: true });
      }
      console.log('Migrazione completata');
    } catch (error) {
      console.error('Errore migrazione:', error);
    }
  };

  // Calcola automaticamente la categoria basata sui macronutrienti
  const calculateCategory = (carbs: number, proteins: number, fats: number): 'CRB' | 'PRT' | 'LPD' => {
    const carbCalories = carbs * 4;
    const proteinCalories = proteins * 4;
    const fatCalories = fats * 9;

    if (carbCalories >= proteinCalories && carbCalories >= fatCalories) {
      return 'CRB';
    } else if (proteinCalories >= fatCalories) {
      return 'PRT';
    } else {
      return 'LPD';
    }
  };

  // Gestisce il caricamento del file Excel
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      for (const row of jsonData as any[]) {
        const carbs = parseFloat(row.carbs || row.carboidrati || 0);
        const proteins = parseFloat(row.proteins || row.proteine || 0);
        const fats = parseFloat(row.fats || row.lipidi || 0);
        const name = row.name || row.nome || '';
        
        if (!name) continue;

        const foodId = `excel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const foodRef = doc(db, 'alimenti', foodId);
        
        await setDoc(foodRef, {
          name,
          category: row.category || calculateCategory(carbs, proteins, fats),
          calories: parseFloat(row.calories || row.energia || 0),
          carbs,
          proteins,
          fats,
          unit: row.unit || 'g',
          creatorId: auth.currentUser.uid,
          createdAt: new Date().toISOString()
        });
      }

      alert(`Database alimentare caricato con successo!`);
    } catch (error) {
      console.error('Errore durante l\'elaborazione del file Excel:', error);
      alert('Errore durante l\'elaborazione del file Excel.');
    }

    e.target.value = '';
  };

  // Aggiunge un nuovo alimento
  const handleAddFood = async () => {
    if (!newFood.name.trim() || !auth.currentUser) {
      alert('Il nome dell\'alimento è obbligatorio');
      return;
    }

    const category = calculateCategory(newFood.carbs, newFood.proteins, newFood.fats);
    const foodId = `new_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      await setDoc(doc(db, 'alimenti', foodId), {
        name: newFood.name.trim(),
        category,
        calories: newFood.calories,
        carbs: newFood.carbs,
        proteins: newFood.proteins,
        fats: newFood.fats,
        unit: newFood.unit,
        creatorId: auth.currentUser.uid,
        createdAt: new Date().toISOString()
      });

      setNewFood({ name: '', calories: 0, carbs: 0, proteins: 0, fats: 0, unit: 'g' });
      setIsAddingNew(false);
    } catch (error) {
      console.error('Errore aggiunta alimento:', error);
      alert('Errore durante il salvataggio.');
    }
  };

  // Elimina un alimento
  const handleDeleteFood = async (food: FoodItem) => {
    if (!auth.currentUser) return;
    
    if (food.creatorId !== auth.currentUser.uid) {
      alert('Puoi eliminare solo gli alimenti creati da te.');
      return;
    }

    if (confirm('Sei sicuro di voler eliminare questo alimento?')) {
      try {
        await deleteDoc(doc(db, 'alimenti', food.id));
      } catch (error) {
        console.error('Errore eliminazione:', error);
        alert('Errore durante l\'eliminazione.');
      }
    }
  };

  // Inizia la modifica di un alimento
  const startEditing = (food: FoodItem) => {
    if (food.creatorId !== auth.currentUser?.uid) {
      alert('Puoi modificare solo gli alimenti creati da te.');
      return;
    }
    setEditingId(food.id);
    setEditFood({
      name: food.name,
      calories: food.calories,
      carbs: food.carbs,
      proteins: food.proteins,
      fats: food.fats,
      unit: food.unit || 'g'
    });
  };

  // Salva le modifiche
  const saveEdit = async () => {
    if (!editFood.name.trim() || !editingId || !auth.currentUser) return;

    const category = calculateCategory(editFood.carbs, editFood.proteins, editFood.fats);
    
    try {
      await setDoc(doc(db, 'alimenti', editingId), {
        name: editFood.name.trim(),
        category,
        calories: editFood.calories,
        carbs: editFood.carbs,
        proteins: editFood.proteins,
        fats: editFood.fats,
        unit: editFood.unit,
        // creatorId e createdAt rimangono invariati se usiamo merge o riscriviamo tutto
      }, { merge: true });

      setEditingId(null);
    } catch (error) {
      console.error('Errore modifica:', error);
      alert('Errore durante il salvataggio.');
    }
  };

  // Annulla la modifica
  const cancelEdit = () => {
    setEditingId(null);
    setEditFood({ name: '', calories: 0, carbs: 0, proteins: 0, fats: 0, unit: 'g' });
  };

  // Filtra gli alimenti
  const filteredFoods = foods.filter(food => {
    const matchesSearch = food.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || food.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'CRB': return 'Carboidrato';
      case 'PRT': return 'Proteina';
      case 'LPD': return 'Lipidi';
      default: return category;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'CRB': return 'bg-blue-100 text-blue-800';
      case 'PRT': return 'bg-green-100 text-green-800';
      case 'LPD': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <>
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
        <h1 className="text-2xl font-bold text-sage-900 mb-4">Database Alimenti</h1>
        <p className="text-sage-600">Gestisci il tuo database personalizzato di alimenti con le relative proprietà nutrizionali.</p>
      </div>

      {/* Caricamento Excel */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
        <div className="flex items-center space-x-3 mb-6">
          <Upload className="w-6 h-6 text-primary-600" />
          <h2 className="text-xl font-bold text-sage-900">Importa da Excel</h2>
        </div>
        
        <p className="text-sage-700 mb-4">Carica un file Excel con il tuo database di alimenti.</p>
        <p className="text-sm text-sage-600 mb-4">Il file deve contenere le colonne: name/nome, calories/energia, carbs/carboidrati, proteins/proteine, fats/lipidi.</p>
        
        <div className="flex items-center space-x-2">
          <input
            type="file"
            accept=".xlsx, .xls"
            onChange={handleFileUpload}
            className="block w-full text-sm text-sage-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-medium
              file:bg-primary-50 file:text-primary-700
              hover:file:bg-primary-100"
          />
        </div>
        
        {isExcelLoaded && (
          <div className="mt-3 text-sm text-green-600 flex items-center">
            <CheckCircle className="w-5 h-5 mr-2" />
            <span>Database caricato con successo! ({foods.length} alimenti)</span>
          </div>
        )}
      </div>

      {/* Filtri e ricerca */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-white/20">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Cerca alimenti..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 border border-sage-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm sm:text-base"
            />
          </div>
          <div className="w-full sm:w-auto">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as any)}
              className="w-full px-3 sm:px-4 py-2 border border-sage-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm sm:text-base"
            >
              <option value="all">Tutte le categorie</option>
              <option value="CRB">Carboidrati</option>
              <option value="PRT">Proteine</option>
              <option value="LPD">Lipidi</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista alimenti */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 overflow-hidden">
        <div className="p-6 border-b border-sage-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-sage-900">Alimenti ({filteredFoods.length})</h2>
            <button
              onClick={() => setIsAddingNew(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Aggiungi Alimento</span>
            </button>
          </div>
        </div>

        {/* Form per nuovo alimento */}
        {isAddingNew && (
          <div className="p-6 border-b border-sage-200 bg-sage-50">
            <h3 className="text-lg font-semibold text-sage-900 mb-4">Nuovo Alimento</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3 sm:gap-4">
              <div className="sm:col-span-2 lg:col-span-2">
                <label className="block text-sm font-medium text-sage-700 mb-1">Nome</label>
                <input
                  type="text"
                  value={newFood.name}
                  onChange={(e) => setNewFood(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-sage-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Nome alimento"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-sage-700 mb-1">Unità</label>
                <select
                  value={newFood.unit}
                  onChange={(e) => setNewFood(prev => ({ ...prev, unit: e.target.value }))}
                  className="w-full px-3 py-2 border border-sage-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="g">Grammi (g)</option>
                  <option value="ml">Millilitri (ml)</option>
                  <option value="unità">Unità</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-sage-700 mb-1">Energia (kcal/100 o u)</label>
                <input
                  type="number"
                  value={newFood.calories}
                  onChange={(e) => setNewFood(prev => ({ ...prev, calories: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-sage-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  min="0"
                  step="0.1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-sage-700 mb-1">Carboidrati (g/100 o u)</label>
                <input
                  type="number"
                  value={newFood.carbs}
                  onChange={(e) => setNewFood(prev => ({ ...prev, carbs: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-sage-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  min="0"
                  step="0.1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-sage-700 mb-1">Proteine (g/100 o u)</label>
                <input
                  type="number"
                  value={newFood.proteins}
                  onChange={(e) => setNewFood(prev => ({ ...prev, proteins: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-sage-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  min="0"
                  step="0.1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-sage-700 mb-1">Lipidi (g/100 o u)</label>
                <input
                  type="number"
                  value={newFood.fats}
                  onChange={(e) => setNewFood(prev => ({ ...prev, fats: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-sage-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  min="0"
                  step="0.1"
                />
              </div>
            </div>
            <div className="flex space-x-2 mt-4">
              <button
                onClick={handleAddFood}
                className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>Salva</span>
              </button>
              <button
                onClick={() => {
                  setIsAddingNew(false);
                  setNewFood({ name: '', calories: 0, carbs: 0, proteins: 0, fats: 0, unit: 'g' });
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
                <span>Annulla</span>
              </button>
            </div>
          </div>
        )}

        {/* Tabella alimenti - Desktop */}
        <div className="hidden lg:block md3-table-container">
          <table className="md3-table">
            <thead className="md3-table-header">
              <tr>
                <th className="md3-table-th">Nome</th>
                <th className="md3-table-th">Unità</th>
                <th className="md3-table-th">Categoria</th>
                <th className="md3-table-th">Energia (kcal)</th>
                <th className="md3-table-th">Carboidrati (g)</th>
                <th className="md3-table-th">Proteine (g)</th>
                <th className="md3-table-th">Lipidi (g)</th>
                <th className="md3-table-th text-right">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filteredFoods.map((food, index) => (
                <tr key={food.id} className={`md3-table-tr ${index % 2 === 0 ? '' : 'md3-table-tr-even'}`}>
                  <td className="md3-table-td font-medium">
                    {editingId === food.id ? (
                      <input
                        type="text"
                        value={editFood.name}
                        onChange={(e) => setEditFood(prev => ({ ...prev, name: e.target.value }))}
                        className="md3-input py-1 px-2 text-sm w-full"
                      />
                    ) : (
                      <div className="flex flex-col">
                        <div className="text-sage-900 dark:text-sage-50">{food.name}</div>
                        {food.creatorId === auth.currentUser?.uid && (
                          <span className="text-[10px] text-primary-600 dark:text-primary-400 font-black uppercase tracking-tighter">Creato da te</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="md3-table-td">
                    {editingId === food.id ? (
                      <select
                        value={editFood.unit}
                        onChange={(e) => setEditFood(prev => ({ ...prev, unit: e.target.value }))}
                        className="md3-input py-1 px-2 text-sm"
                      >
                        <option value="g">g</option>
                        <option value="ml">ml</option>
                        <option value="unità">unità</option>
                      </select>
                    ) : (
                      food.unit || 'g'
                    )}
                  </td>
                  <td className="md3-table-td">
                    <span className={`inline-flex px-2 py-1 text-[10px] font-black uppercase tracking-widest rounded-full ${getCategoryColor(food.category)}`}>
                      {getCategoryLabel(food.category)}
                    </span>
                  </td>
                  <td className="md3-table-td font-bold text-sage-900 dark:text-sage-50">
                    {editingId === food.id ? (
                      <input
                        type="number"
                        value={editFood.calories}
                        onChange={(e) => setEditFood(prev => ({ ...prev, calories: parseFloat(e.target.value) || 0 }))}
                        className="md3-input py-1 px-2 text-sm w-20"
                        min="0"
                        step="0.1"
                      />
                    ) : (
                      food.calories.toFixed(1)
                    )}
                  </td>
                  <td className="md3-table-td">
                    {editingId === food.id ? (
                      <input
                        type="number"
                        value={editFood.carbs}
                        onChange={(e) => setEditFood(prev => ({ ...prev, carbs: parseFloat(e.target.value) || 0 }))}
                        className="md3-input py-1 px-2 text-sm w-16"
                        min="0"
                        step="0.1"
                      />
                    ) : (
                      food.carbs.toFixed(1)
                    )}
                  </td>
                  <td className="md3-table-td">
                    {editingId === food.id ? (
                      <input
                        type="number"
                        value={editFood.proteins}
                        onChange={(e) => setEditFood(prev => ({ ...prev, proteins: parseFloat(e.target.value) || 0 }))}
                        className="md3-input py-1 px-2 text-sm w-16"
                        min="0"
                        step="0.1"
                      />
                    ) : (
                      food.proteins.toFixed(1)
                    )}
                  </td>
                  <td className="md3-table-td">
                    {editingId === food.id ? (
                      <input
                        type="number"
                        value={editFood.fats}
                        onChange={(e) => setEditFood(prev => ({ ...prev, fats: parseFloat(e.target.value) || 0 }))}
                        className="md3-input py-1 px-2 text-sm w-16"
                        min="0"
                        step="0.1"
                      />
                    ) : (
                      food.fats.toFixed(1)
                    )}
                  </td>
                  <td className="md3-table-td text-right">
                    {editingId === food.id ? (
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={saveEdit}
                          className="p-2 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full hover:bg-primary-200 transition-colors shadow-sm"
                          title="Salva"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="p-2 bg-sage-100 dark:bg-sage-800 text-sage-600 dark:text-sage-400 rounded-full hover:bg-sage-200 transition-colors shadow-sm"
                          title="Annulla"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => startEditing(food)}
                          className={`p-2 rounded-full transition-all duration-200 ${
                            food.creatorId === auth.currentUser?.uid 
                              ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/40 shadow-sm' 
                              : 'bg-sage-50 dark:bg-sage-900/10 text-sage-300 dark:text-sage-700 cursor-not-allowed'
                          }`}
                          disabled={food.creatorId !== auth.currentUser?.uid}
                          title="Modifica"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteFood(food)}
                          className={`p-2 rounded-full transition-all duration-200 ${
                            food.creatorId === auth.currentUser?.uid 
                              ? 'bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 shadow-sm' 
                              : 'bg-sage-50 dark:bg-sage-900/10 text-sage-300 dark:text-sage-700 cursor-not-allowed'
                          }`}
                          disabled={food.creatorId !== auth.currentUser?.uid}
                          title="Elimina"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Layout a card per mobile e tablet */}
        <div className="lg:hidden space-y-4 p-4">
          {filteredFoods.map((food) => (
            <div key={food.id} className="bg-white rounded-lg border border-sage-200 p-4 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  {editingId === food.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editFood.name}
                        onChange={(e) => setEditFood(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-2 py-1 border border-sage-200 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent font-medium"
                      />
                      <select
                        value={editFood.unit}
                        onChange={(e) => setEditFood(prev => ({ ...prev, unit: e.target.value }))}
                        className="w-full px-2 py-1 border border-sage-200 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                      >
                        <option value="g">g</option>
                        <option value="ml">ml</option>
                        <option value="unità">unità</option>
                      </select>
                    </div>
                  ) : (
                    <>
                      <h3 className="font-medium text-sage-900 text-lg">{food.name}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(food.category)}`}>
                          {getCategoryLabel(food.category)}
                        </span>
                        <span className="text-xs text-sage-500">Unità: {food.unit || 'g'}</span>
                        {food.creatorId === auth.currentUser?.uid && (
                          <span className="text-[10px] text-primary-600 font-semibold uppercase">Tuo</span>
                        )}
                      </div>
                    </>
                  )}
                </div>
                <div className="flex space-x-2 ml-4">
                  {editingId === food.id ? (
                    <>
                      <button
                        onClick={saveEdit}
                        className="p-2 text-green-600 hover:text-green-900 hover:bg-green-50 rounded-lg transition-colors"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => startEditing(food)}
                        className={`p-2 text-primary-600 hover:text-primary-900 hover:bg-primary-50 rounded-lg transition-colors ${food.creatorId !== auth.currentUser?.uid ? 'opacity-30' : ''}`}
                        disabled={food.creatorId !== auth.currentUser?.uid}
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteFood(food)}
                        className={`p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors ${food.creatorId !== auth.currentUser?.uid ? 'opacity-30' : ''}`}
                        disabled={food.creatorId !== auth.currentUser?.uid}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-sage-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-sage-600 mb-1">Energia</p>
                  {editingId === food.id ? (
                    <input
                      type="number"
                      value={editFood.calories}
                      onChange={(e) => setEditFood(prev => ({ ...prev, calories: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-2 py-1 border border-sage-200 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                      min="0"
                      step="0.1"
                    />
                  ) : (
                    <p className="text-sm font-semibold text-sage-900">{food.calories.toFixed(1)} kcal</p>
                  )}
                </div>
                
                <div className="bg-sage-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-sage-600 mb-1">Proteine</p>
                  {editingId === food.id ? (
                    <input
                      type="number"
                      value={editFood.proteins}
                      onChange={(e) => setEditFood(prev => ({ ...prev, proteins: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-2 py-1 border border-sage-200 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                      min="0"
                      step="0.1"
                    />
                  ) : (
                    <p className="text-sm font-semibold text-sage-900">{food.proteins.toFixed(1)}g</p>
                  )}
                </div>
                
                <div className="bg-sage-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-sage-600 mb-1">Carboidrati</p>
                  {editingId === food.id ? (
                    <input
                      type="number"
                      value={editFood.carbs}
                      onChange={(e) => setEditFood(prev => ({ ...prev, carbs: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-2 py-1 border border-sage-200 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                      min="0"
                      step="0.1"
                    />
                  ) : (
                    <p className="text-sm font-semibold text-sage-900">{food.carbs.toFixed(1)}g</p>
                  )}
                </div>
                
                <div className="bg-sage-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-sage-600 mb-1">Lipidi</p>
                  {editingId === food.id ? (
                    <input
                      type="number"
                      value={editFood.fats}
                      onChange={(e) => setEditFood(prev => ({ ...prev, fats: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-2 py-1 border border-sage-200 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                      min="0"
                      step="0.1"
                    />
                  ) : (
                    <p className="text-sm font-semibold text-sage-900">{food.fats.toFixed(1)}g</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {filteredFoods.length === 0 && (
          <div className="text-center py-8 text-sage-500">
            {foods.length === 0 ? 'Nessun alimento presente. Carica un file Excel o aggiungi manualmente.' : 'Nessun alimento trovato con i filtri selezionati.'}
          </div>
        )}
        
      </div>
      </div>
    </>
  );
};