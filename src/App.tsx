import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import ErrorBoundary from './components/ErrorBoundary';
import { auth, db } from './firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

interface User {
  name: string;
  email: string;
  password?: string;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [firebaseError, setFirebaseError] = useState<string | null>(null);

  useEffect(() => {
    // Test di connettività Firebase
    console.log('=== TEST CONNETTIVITÀ FIREBASE ===');
    console.log('Auth object:', auth);
    console.log('DB object:', db);
    console.log('Firebase config:', auth.app.options);
    
    try {
      // Sottoscrizione allo stato di autenticazione
      const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      console.log('Stato autenticazione cambiato:', authUser ? 'Utente autenticato' : 'Utente non autenticato');
      if (authUser) {
        // L'utente è autenticato
        console.log('UID utente:', authUser.uid);
        const userDocRef = doc(db, 'users', authUser.uid);
        try {
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            // Se il documento esiste, carica i dati dell'utente
            console.log('Documento utente trovato:', userDoc.data());
            setUser({
              name: userDoc.data().name,
              email: authUser.email || ''
            });
          } else {
            // Se il documento non esiste, crea un nuovo documento utente
            console.log('Documento utente non trovato, creazione in corso...');
            if (authUser.email) {
              const newUser = {
                name: authUser.displayName || authUser.email.split('@')[0],
                email: authUser.email
              };
              setUser(newUser);
              await setDoc(userDocRef, newUser);
              console.log('Nuovo documento utente creato');
            }
          }
        } catch (error) {
          console.error('Errore durante l\'accesso al documento utente:', error);
        }
      } else {
        // L'utente non è autenticato
        console.log('Nessun utente autenticato');
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

  const handleLogin = async (userData: User) => {
    try {
      if (!userData.password) {
        throw new Error('Password richiesta');
      }
      
      console.log('=== INIZIO PROCESSO DI LOGIN ===');
      console.log('Firebase Auth:', auth);
      console.log('Firebase Auth currentUser:', auth.currentUser);
      console.log('Dati utente ricevuti:', { name: userData.name, email: userData.email });
      
      // Test di connettività Firebase
      console.log('Test connettività Firebase...');
      console.log('Auth domain:', auth.app.options.authDomain);
      console.log('Project ID:', auth.app.options.projectId);
      
      // Crea o accedi all'account con email e password
      let userCredential;
      try {
        // Prova prima ad accedere
        console.log('Tentativo di accesso con:', userData.email);
        userCredential = await signInWithEmailAndPassword(auth, userData.email, userData.password);
        console.log('Accesso riuscito:', userCredential);
      } catch (error: any) {
        console.error('Errore durante l\'accesso:', error.code, error.message);
        // Se l'accesso fallisce per motivi diversi da "utente non trovato", rilancia l'errore
        if (error.code !== 'auth/user-not-found') {
          throw error;
        }
        // Altrimenti, crea un nuovo account
        console.log('Creazione nuovo account per:', userData.email);
        userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
        console.log('Account creato con successo:', userCredential);
      }
      
      // Salva i dati utente in Firestore
      const userDocRef = doc(db, 'users', userCredential.user.uid);
      console.log('Salvataggio dati utente in Firestore...');
      await setDoc(userDocRef, {
        name: userData.name,
        email: userData.email
      });
      console.log('Dati utente salvati con successo');
      console.log('Firebase Auth currentUser dopo login:', auth.currentUser);
      
      // L'utente verrà impostato dall'effetto onAuthStateChanged
      console.log('=== FINE PROCESSO DI LOGIN - SUCCESSO ===');
    } catch (error: any) {
      console.error('=== FINE PROCESSO DI LOGIN - ERRORE ===');
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
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-accent-50 flex items-center justify-center">
        <div className="animate-pulse-soft">
          <div className="w-16 h-16 bg-primary-500 rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-accent-50">
        <Header user={user} onLogout={handleLogout} />
        
        <main className="container mx-auto px-4 py-8">
          {user ? (
            <Dashboard user={user} />
          ) : (
            <Login onLogin={handleLogin} />
          )}
        </main>
      </div>
    </ErrorBoundary>
  );
}

export default App;