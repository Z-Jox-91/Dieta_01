import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
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

  useEffect(() => {
    // Firebase authentication check
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        // L'utente è autenticato, ottieni i dati dal Firestore
        const userDocRef = doc(db, 'users', authUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          // Usa i dati dal Firestore
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
            await setDoc(userDocRef, newUser);
          }
        }
      } else {
        // L'utente non è autenticato
        setUser(null);
      }
      setLoading(false);
    });
    
    // Cleanup della sottoscrizione quando il componente viene smontato
    return () => unsubscribe();
  }, []);

  const handleLogin = async (userData: User) => {
    try {
      if (!userData.password) {
        throw new Error('Password richiesta');
      }
      
      // Crea o accedi all'account con email e password
      let userCredential;
      try {
        // Prova prima ad accedere
        userCredential = await signInWithEmailAndPassword(auth, userData.email, userData.password);
      } catch (error: any) {
        // Se l'accesso fallisce per motivi diversi da "utente non trovato", rilancia l'errore
        if (error.code !== 'auth/user-not-found') {
          throw error;
        }
        // Altrimenti, crea un nuovo account
        userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
      }
      
      // Salva i dati utente in Firestore
      const userDocRef = doc(db, 'users', userCredential.user.uid);
      await setDoc(userDocRef, {
        name: userData.name,
        email: userData.email
      });
      
      // L'utente verrà impostato dall'effetto onAuthStateChanged
    } catch (error) {
      console.error('Errore durante l\'autenticazione:', error);
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
  );
}

export default App;