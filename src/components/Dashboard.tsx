import React, { useState, useEffect } from 'react';
import { Calculations } from './Calculations';
import { Diet } from './Diet';
import { Recipes } from './Recipes';
import { Foods } from './Foods';
import { WelcomeCard } from './WelcomeCard';
import { DashboardTabId } from '../config/navigation';

interface DashboardProps {
  user: { name: string; email: string };
  activeTab: DashboardTabId;
  onTabChange: (tab: DashboardTabId) => void;
}

const TAB_COMPONENTS: Record<DashboardTabId, React.FC> = {
  calculations: Calculations,
  diet: Diet,
  recipes: Recipes,
  foods: Foods,
};

const ONBOARDING_KEY = 'cunzari_onboarding_dismissed';

export const Dashboard: React.FC<DashboardProps> = ({ user, activeTab, onTabChange }) => {
  const [error, setError] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(() => !localStorage.getItem(ONBOARDING_KEY));

  useEffect(() => {
    setError(null);
  }, [activeTab]);

  const dismissWelcome = () => {
    localStorage.setItem(ONBOARDING_KEY, '1');
    setShowWelcome(false);
  };

  const startFromWelcome = () => {
    onTabChange('calculations');
    dismissWelcome();
  };

  const ActiveComponent = TAB_COMPONENTS[activeTab] || Calculations;

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

      {showWelcome && <WelcomeCard onStart={startFromWelcome} onDismiss={dismissWelcome} />}

      {/* Tab Content */}
      <div className="animate-slide-up pb-10">
        {renderActiveComponent()}
      </div>
    </div>
  );
};
