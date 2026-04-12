import React from 'react';

interface MacroChartProps {
  foods: Array<{
    name: string;
    nutritionalData: {
      calories: number;
      proteins: number;
      carbs: number;
      fats: number;
      category: string;
    };
  }>;
}

export const MacroChart: React.FC<MacroChartProps> = ({ foods }) => {
  // Verifica che foods sia un array valido
  if (!Array.isArray(foods) || foods.length === 0) {
    return <div className="text-center text-sage-500 text-sm">Aggiungi alimenti per visualizzare la distribuzione dei macronutrienti</div>;
  }

  // Calcola le calorie totali per macronutriente con controlli di sicurezza
  const proteinCalories = foods.reduce((sum, food) => {
    const proteins = food?.nutritionalData?.proteins || 0;
    return sum + proteins * 4;
  }, 0);
  
  const carbCalories = foods.reduce((sum, food) => {
    const carbs = food?.nutritionalData?.carbs || 0;
    return sum + carbs * 4;
  }, 0);
  
  const fatCalories = foods.reduce((sum, food) => {
    const fats = food?.nutritionalData?.fats || 0;
    return sum + fats * 9;
  }, 0);
  
  const totalCalories = proteinCalories + carbCalories + fatCalories;
  
  // Se non ci sono calorie, mostra un messaggio
  if (totalCalories === 0) {
    return <div className="text-center text-sage-500 text-sm">Aggiungi alimenti per visualizzare la distribuzione dei macronutrienti</div>;
  }
  
  // Calcola le percentuali
  const proteinPercentage = (proteinCalories / totalCalories) * 100;
  const carbPercentage = (carbCalories / totalCalories) * 100;
  const fatPercentage = (fatCalories / totalCalories) * 100;

  return (
    <div className="mt-4">
      <h4 className="text-sm font-semibold text-sage-900 mb-3 text-center">Distribuzione Macronutrienti</h4>
      
      {/* Layout Desktop */}
      <div className="hidden sm:block">
        <div className="flex flex-col space-y-3">
          {/* Proteine */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 min-w-0 flex-1">
              <div className="w-3 h-3 bg-red-500 rounded-full flex-shrink-0"></div>
              <span className="text-xs font-medium text-sage-700 truncate">Proteine</span>
            </div>
            <div className="flex items-center space-x-2 ml-2">
              <div className="w-20 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-red-500 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${Math.min(proteinPercentage, 100)}%` }}
                ></div>
              </div>
              <span className="text-xs font-semibold text-red-600 min-w-[3rem] text-right">
                {proteinPercentage.toFixed(1)}%
              </span>
              <span className="text-xs text-sage-500 min-w-[2rem] text-right">(30%)</span>
            </div>
          </div>
          
          {/* Carboidrati */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 min-w-0 flex-1">
              <div className="w-3 h-3 bg-yellow-500 rounded-full flex-shrink-0"></div>
              <span className="text-xs font-medium text-sage-700 truncate">Carboidrati</span>
            </div>
            <div className="flex items-center space-x-2 ml-2">
              <div className="w-20 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-yellow-500 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${Math.min(carbPercentage, 100)}%` }}
                ></div>
              </div>
              <span className="text-xs font-semibold text-yellow-600 min-w-[3rem] text-right">
                {carbPercentage.toFixed(1)}%
              </span>
              <span className="text-xs text-sage-500 min-w-[2rem] text-right">(50%)</span>
            </div>
          </div>
          
          {/* Lipidi */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 min-w-0 flex-1">
              <div className="w-3 h-3 bg-green-500 rounded-full flex-shrink-0"></div>
              <span className="text-xs font-medium text-sage-700 truncate">Lipidi</span>
            </div>
            <div className="flex items-center space-x-2 ml-2">
              <div className="w-20 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${Math.min(fatPercentage, 100)}%` }}
                ></div>
              </div>
              <span className="text-xs font-semibold text-green-600 min-w-[3rem] text-right">
                {fatPercentage.toFixed(1)}%
              </span>
              <span className="text-xs text-sage-500 min-w-[2rem] text-right">(20%)</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Layout Mobile */}
      <div className="sm:hidden">
        <div className="space-y-3">
          {/* Proteine */}
          <div className="bg-red-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-sm font-medium text-sage-900">Proteine</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-red-600">{proteinPercentage.toFixed(1)}%</span>
                <span className="text-xs text-sage-500 ml-1">(30%)</span>
              </div>
            </div>
            <div className="w-full bg-red-200 rounded-full h-2">
              <div 
                className="bg-red-500 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${Math.min(proteinPercentage, 100)}%` }}
              ></div>
            </div>
          </div>
          
          {/* Carboidrati */}
          <div className="bg-yellow-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-sm font-medium text-sage-900">Carboidrati</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-yellow-600">{carbPercentage.toFixed(1)}%</span>
                <span className="text-xs text-sage-500 ml-1">(50%)</span>
              </div>
            </div>
            <div className="w-full bg-yellow-200 rounded-full h-2">
              <div 
                className="bg-yellow-500 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${Math.min(carbPercentage, 100)}%` }}
              ></div>
            </div>
          </div>
          
          {/* Lipidi */}
          <div className="bg-green-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-sage-900">Lipidi</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-green-600">{fatPercentage.toFixed(1)}%</span>
                <span className="text-xs text-sage-500 ml-1">(20%)</span>
              </div>
            </div>
            <div className="w-full bg-green-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${Math.min(fatPercentage, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};