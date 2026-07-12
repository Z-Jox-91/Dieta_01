import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const handleChoice = (value: boolean) => {
    setOptions(null);
    resolveRef.current?.(value);
    resolveRef.current = null;
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {options && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-sage-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-surface-dark rounded-md3-large shadow-md3-3 w-full max-w-sm p-6 border border-sage-200 dark:border-sage-800 animate-in fade-in slide-in-from-bottom-4">
            <div className={`w-11 h-11 rounded-full flex items-center justify-center mb-4 ${
              options.danger
                ? 'bg-red-50 dark:bg-red-900/20'
                : 'bg-primary-50 dark:bg-primary-900/20'
            }`}>
              <AlertTriangle className={`w-5 h-5 ${options.danger ? 'text-red-600 dark:text-red-400' : 'text-primary-600 dark:text-primary-400'}`} />
            </div>
            <h3 className="text-lg font-bold text-sage-900 dark:text-sage-50 mb-2">{options.title}</h3>
            <p className="text-sm text-sage-600 dark:text-sage-400 mb-6 leading-relaxed">{options.message}</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => handleChoice(false)}
                className="px-4 py-2 rounded-full font-bold text-sm text-sage-600 dark:text-sage-400 hover:bg-sage-100 dark:hover:bg-surface-container-dark transition-colors"
              >
                {options.cancelLabel || 'Annulla'}
              </button>
              <button
                onClick={() => handleChoice(true)}
                className={`px-4 py-2 rounded-full font-bold text-sm text-white transition-colors ${
                  options.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-primary-600 hover:bg-primary-700'
                }`}
              >
                {options.confirmLabel || 'Conferma'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};

export const useConfirm = (): ConfirmContextValue['confirm'] => {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm deve essere usato dentro <ConfirmProvider>');
  return ctx.confirm;
};
