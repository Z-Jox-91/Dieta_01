import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="text-center">
              <div className="text-red-500 text-6xl mb-4">⚠️</div>
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                Errore di Configurazione
              </h1>
              <p className="text-gray-600 mb-6">
                L'applicazione non può essere avviata a causa di un errore di configurazione.
              </p>
              
              {this.state.error?.message.includes('Firebase') && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-yellow-800 mb-2">
                    🔧 Configurazione Firebase Richiesta
                  </h3>
                  <p className="text-sm text-yellow-700 mb-3">
                    Le variabili d'ambiente Firebase non sono configurate correttamente.
                  </p>
                  <div className="text-left">
                    <p className="text-sm font-medium text-yellow-800 mb-2">
                      Configura le seguenti variabili su Vercel:
                    </p>
                    <ul className="text-xs text-yellow-700 space-y-1">
                      <li>• VITE_FIREBASE_API_KEY</li>
                      <li>• VITE_FIREBASE_AUTH_DOMAIN</li>
                      <li>• VITE_FIREBASE_PROJECT_ID</li>
                      <li>• VITE_FIREBASE_STORAGE_BUCKET</li>
                      <li>• VITE_FIREBASE_MESSAGING_SENDER_ID</li>
                      <li>• VITE_FIREBASE_APP_ID</li>
                    </ul>
                  </div>
                </div>
              )}
              
              <button
                onClick={() => window.location.reload()}
                className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Riprova
              </button>
              
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                  Dettagli tecnici
                </summary>
                <pre className="mt-2 text-xs text-gray-600 bg-gray-100 p-3 rounded overflow-auto">
                  {this.state.error?.message}
                </pre>
              </details>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;