import React, { useState, useEffect } from 'react';
import { Calculator, Calendar, CookingPot, Apple } from 'lucide-react';
import { Calculations } from './Calculations';
import { Diet } from './Diet';
import { Recipes } from './Recipes';
import { Foods } from './Foods';
import { runOptimizerTests } from '../utils/portionOptimizer.test';

interface DashboardProps {
  user: { name: string; email: string };
}

export const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'calculations' | 'diet' | 'recipes' | 'foods'>('calculations');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    // Esegui i test dell'ottimizzatore in modalità sviluppo
    if (import.meta.env.DEV) {
      runOptimizerTests();
    }
  }, [activeTab]);

  const tabs = [
    {
      id: 'calculations' as const,
      label: 'Calcoli',
      icon: Calculator,
      component: Calculations
    },
    {
      id: 'diet' as const,
      label: 'Dieta',
      icon: Calendar,
      component: Diet
    },
    {
      id: 'recipes' as const,
      label: 'Ricette',
      icon: CookingPot,
      component: Recipes
    },
    {
      id: 'foods' as const,
      label: 'Alimenti',
      icon: Apple,
      component: Foods
    }
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || Calculations;

  const renderActiveComponent = () => {
    try {
      return <ActiveComponent />;
    } catch (err) {
      console.error('Errore nel rendering del componente:', err);
      setError(`Si è verificato un errore nel caricamento della pagina.`);
      return (
        <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md3-medium text-red-700 dark:text-red-300">
          <p className="font-medium">Errore</p>
          <p>{error || 'Si è verificato un errore imprevisto.'}</p>
        </div>
      );
    }
  };

  return (
    <div className="max-w-7xl mx-auto animate-fade-in px-4 sm:px-6 lg:px-8 pb-24 lg:pb-8">
      <div className="mb-6 sm:mb-10 pt-4">
        <h1 className="text-3xl sm:text-4xl font-black text-sage-900 dark:text-sage-50 tracking-tight">
          Ciao, {user.name.split(' ')[0]}!
        </h1>
        <p className="text-sage-600 dark:text-sage-400 text-lg">Il tuo benessere inizia da qui.</p>
      </div>

      {/* Desktop Tab Navigation (MD3 Tonal Buttons) */}
      <div className="hidden lg:flex space-x-2 mb-10 p-1.5 bg-surface-container-light dark:bg-surface-container-dark rounded-full w-max shadow-md3-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-8 py-3 rounded-full font-bold transition-all duration-300 ${
                isActive
                  ? 'bg-primary-600 dark:bg-primary-500 text-white shadow-md3-2 scale-105'
                  : 'text-sage-600 dark:text-sage-400 hover:bg-primary-100 dark:hover:bg-primary-900/20 hover:text-primary-700 dark:hover:text-primary-300'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Mobile Bottom Navigation (MD3 style) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-surface-dark/95 backdrop-blur-lg border-t border-sage-200 dark:border-sage-800 px-4 py-3 z-40 flex justify-around items-center shadow-2xl">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex flex-col items-center space-y-1 flex-1 relative"
            >
              <div className={`px-5 py-1.5 rounded-full transition-all duration-300 ${
                isActive ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300' : 'text-sage-500'
              }`}>
                <Icon className={`w-6 h-6 ${isActive ? 'fill-current' : ''}`} />
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-widest ${isActive ? 'text-primary-700 dark:text-primary-300' : 'text-sage-500'}`}>
                {tab.label}
              </span>
              {isActive && (
                <div className="absolute -top-3 w-1.5 h-1.5 bg-primary-500 rounded-full animate-pulse"></div>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="animate-slide-up pb-10">
        {renderActiveComponent()}
      </div>
    </div>
  );
};