import React, { useState, useEffect } from 'react';
import { User, LogOut, Activity, Sun, Moon } from 'lucide-react';
import { DASHBOARD_TABS, DashboardTabId } from '../config/navigation';

interface HeaderProps {
  user: { name: string; email: string } | null;
  onLogout: () => void;
  activeTab?: DashboardTabId;
  onTabChange?: (tab: DashboardTabId) => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onLogout, activeTab, onTabChange }) => {
  const [isDark, setIsDark] = useState(() => {
    // Check localStorage or system preference on initial load
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) return savedTheme === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    // Apply theme on mount and when isDark changes
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const toggleDarkMode = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    localStorage.setItem('theme', newIsDark ? 'dark' : 'light');
  };

  const showNav = !!(user && activeTab && onTabChange);

  return (
    <>
    <header className="bg-white/95 dark:bg-surface-dark/95 backdrop-blur-sm border-b border-sage-200 dark:border-sage-800 sticky top-0 z-50 shadow-sm transition-colors duration-300">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary-600 dark:bg-primary-500 rounded-xl flex items-center justify-center shadow-lg">
              <Activity className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-sage-900 dark:text-sage-50 truncate">Cunzari</h1>
              <p className={`text-xs text-sage-600 dark:text-sage-400 hidden sm:block ${showNav ? 'lg:hidden' : ''}`}>
                Ogni pasto, cunzato a puntino
              </p>
            </div>
          </div>

          {/* Navigazione (desktop): sempre visibile nell'intestazione mentre scorri la pagina */}
          {showNav && (
            <nav className="hidden lg:flex flex-1 justify-center min-w-0">
              <div className="flex space-x-1 p-1.5 bg-surface-container-light dark:bg-surface-container-dark rounded-full">
                {DASHBOARD_TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => onTabChange!(tab.id)}
                      className={`flex items-center space-x-2 px-4 xl:px-5 py-2 rounded-full font-bold text-sm whitespace-nowrap transition-all duration-300 ${
                        isActive
                          ? 'bg-primary-600 dark:bg-primary-500 text-white shadow-md3-2'
                          : 'text-sage-600 dark:text-sage-400 hover:bg-primary-100 dark:hover:bg-primary-900/20 hover:text-primary-700 dark:hover:text-primary-300'
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </nav>
          )}

          <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
            <button
              onClick={toggleDarkMode}
              className="p-2 text-sage-600 dark:text-sage-300 hover:bg-sage-100 dark:hover:bg-surface-container-dark rounded-full transition-all"
              title={isDark ? "Attiva Tema Chiaro" : "Attiva Tema Scuro"}
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {user && (
              <>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center border border-primary-200 dark:border-primary-800">
                    <User className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div className="hidden md:block min-w-0">
                    <p className="text-sm font-medium text-sage-900 dark:text-sage-50 truncate max-w-32">{user.name}</p>
                    <p className="text-xs text-sage-600 dark:text-sage-400 truncate max-w-32">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={onLogout}
                  className="p-2 text-sage-600 dark:text-sage-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>

    {/* Navigazione (mobile/tablet): barra fissa in basso, sempre raggiungibile.
        Renderizzata FUORI da <header> perché il backdrop-blur dell'header crea
        un containing block per gli elementi "fixed" al suo interno, rompendo
        il posizionamento rispetto alla finestra invece che all'header stesso. */}
    {showNav && (
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-surface-dark/95 backdrop-blur-lg border-t border-sage-200 dark:border-sage-800 px-4 py-3 z-40 flex justify-around items-center shadow-2xl">
        {DASHBOARD_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange!(tab.id)}
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
    )}
    </>
  );
};
