import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { Login } from './components/Login';
import { AIAssistant } from './components/AIAssistant';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './components/ui/ToastProvider';
import { ConfirmProvider } from './components/ui/ConfirmProvider';
import { auth, db } from './firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { DashboardTabId } from './config/navigation';

interface User {
  name: string;
  email: string;
  password?: string;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [firebaseError, setFirebaseError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DashboardTabId>('calculations');

  useEffect(() => {
    try {
      // Sottoscrizione allo stato di autenticazione
      const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        // L'utente è autenticato
        const userDocRef = doc(db, 'users', authUser.uid);
        try {
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            // Se il documento esiste, carica i dati dell'utente
            setUser({
              name: userDoc.data().name,
              email: authUser.email || ''
            });
          } else {
            // Se il documento non esiste, crea un nuovo documento utente
            if (authUser.email) {
              const newUser = {
                name: authUser.displayName || authUser.email.split('@')[0],
                email: authUser.email
              };
              setUser(newUser);
              try {
                await setDoc(userDocRef, newUser);
              } catch (firestoreError: any) {
                console.error('Errore durante la scrittura su Firestore:', firestoreError);
                if (firestoreError.code === 'permission-denied') {
                  setFirebaseError('Errore di permessi Firestore. Verifica che le regole di sicurezza del database siano configurate correttamente.');
                } else {
                  setFirebaseError(`Errore Firestore: ${firestoreError.message}`);
                }
                setLoading(false);
                return;
              }
            }
          }
        } catch (error) {
          console.error('Errore durante l\'accesso al documento utente:', error);
        }
      } else {
        // L'utente non è autenticato
        setUser(null);
      }
      setLoading(false);
    });
    
    // Cleanup della sottoscrizione quando il componente viene smontato
    return () => unsubscribe();
    } catch (error: any) {
      console.error('Errore Firebase durante l\'inizializzazione:', error);
      if (error.code === 'auth/api-key-not-valid' || error.message?.includes('api-key-not-valid')) {
        setFirebaseError('Configurazione Firebase non valida. Verifica che le variabili d\'ambiente siano configurate correttamente su Vercel.');
      } else {
        setFirebaseError(`Errore Firebase: ${error.message}`);
      }
      setLoading(false);
    }
  }, []);

  const handleAuth = async (userData: User, mode: 'login' | 'register') => {
    try {
      if (!userData.password) {
        throw new Error('Password richiesta');
      }

      let userCredential;
      if (mode === 'register') {
        // Registrazione: crea un nuovo account
        userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
      } else {
        // Accesso: entra con un account esistente
        userCredential = await signInWithEmailAndPassword(auth, userData.email, userData.password);
      }

      // Salva/aggiorna i dati utente in Firestore. In fase di accesso non
      // sovrascriviamo il nome già salvato (merge), in registrazione lo impostiamo.
      const userDocRef = doc(db, 'users', userCredential.user.uid);
      try {
        if (mode === 'register') {
          await setDoc(userDocRef, {
            name: userData.name,
            email: userData.email
          });
        } else {
          await setDoc(userDocRef, { email: userData.email }, { merge: true });
        }
      } catch (firestoreError: any) {
        console.error('Errore durante la scrittura su Firestore:', firestoreError);
        if (firestoreError.code === 'permission-denied') {
          throw new Error('Errore di permessi Firestore. Verifica che le regole di sicurezza del database siano configurate correttamente.');
        } else {
          throw new Error(`Errore Firestore: ${firestoreError.message}`);
        }
      }
      // L'utente verrà impostato dall'effetto onAuthStateChanged
    } catch (error: any) {
      console.error('Errore durante l\'autenticazione:', error);
      
      // Gestisci errori specifici di Firebase
      if (error.code === 'auth/api-key-not-valid' || error.message?.includes('api-key-not-valid')) {
        setFirebaseError('Configurazione Firebase non valida. Verifica che le variabili d\'ambiente siano configurate correttamente su Vercel.');
        return; // Non rilanciare l'errore, mostra invece il messaggio di errore
      }
      
      throw error; // Rilancia l'errore per permettere al componente Login di gestirlo
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // L'utente verrà impostato a null dall'effetto onAuthStateChanged
    } catch (error) {
      console.error('Errore durante il logout:', error);
    }
  };

  if (firebaseError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-red-700 mb-4">Errore di Configurazione</h2>
          <p className="text-gray-700 mb-6">{firebaseError}</p>
          <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded">
            <p className="font-semibold mb-2">Variabili d'ambiente richieste su Vercel:</p>
            <ul className="text-left space-y-1">
              <li>• VITE_FIREBASE_API_KEY</li>
              <li>• VITE_FIREBASE_AUTH_DOMAIN</li>
              <li>• VITE_FIREBASE_PROJECT_ID</li>
              <li>• VITE_FIREBASE_STORAGE_BUCKET</li>
              <li>• VITE_FIREBASE_MESSAGING_SENDER_ID</li>
              <li>• VITE_FIREBASE_APP_ID</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-accent-50 dark:from-surface-dark dark:to-surface-container-dark flex items-center justify-center">
        <div className="animate-pulse-soft">
          <div className="w-16 h-16 bg-primary-500 rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <ToastProvider>
        <ConfirmProvider>
          <div className="min-h-screen bg-gradient-to-br from-primary-50 to-accent-50 dark:from-surface-dark dark:to-surface-container-dark transition-colors duration-300">
            <Header
              user={user}
              onLogout={handleLogout}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />

            <main className="container mx-auto px-4 py-8">
              {user ? (
                <Dashboard user={user} activeTab={activeTab} onTabChange={setActiveTab} />
              ) : (
                <Login onAuth={handleAuth} />
              )}
            </main>
            <AIAssistant />
          </div>
        </ConfirmProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;