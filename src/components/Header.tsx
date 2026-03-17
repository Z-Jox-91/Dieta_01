import React, { useState, useEffect } from 'react';
import { User, LogOut, Activity, Sun, Moon } from 'lucide-react';

interface HeaderProps {
  user: { name: string; email: string } | null;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <header className="bg-white/95 dark:bg-surface-dark/95 backdrop-blur-sm border-b border-sage-200 dark:border-sage-800 sticky top-0 z-50 shadow-sm transition-colors duration-300">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary-600 dark:bg-primary-500 rounded-xl flex items-center justify-center shadow-lg">
              <Activity className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-sage-900 dark:text-sage-50 truncate">MacroMind</h1>
              <p className="text-xs text-sage-600 dark:text-sage-400 hidden sm:block">Nutrizione Avanzata</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4">
            <button
              onClick={toggleDarkMode}
              className="p-2 text-sage-600 dark:text-sage-300 hover:bg-sage-100 dark:hover:bg-surface-container-dark rounded-full transition-all"
              title="Toggle Dark Mode"
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
  );
};