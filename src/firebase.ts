import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence, connectFirestoreEmulator } from 'firebase/firestore';

// Verifica che tutte le variabili d'ambiente Firebase siano configurate
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
];

const missingVars = requiredEnvVars.filter(varName => !import.meta.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Variabili d\'ambiente Firebase mancanti:', missingVars);
  console.error('🔧 Configura le seguenti variabili su Vercel:');
  missingVars.forEach(varName => {
    console.error(`   ${varName}`);
  });
  throw new Error(`Configurazione Firebase incompleta. Variabili mancanti: ${missingVars.join(', ')}`);
}

// La tua configurazione Firebase
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Inizializza Firebase
const app = initializeApp(firebaseConfig);

// Esporta i servizi Firebase
export const auth = getAuth(app);
export const db = getFirestore(app);

// Emulatori locali (Auth + Firestore): permettono di sviluppare e testare login
// e dati reali senza chiavi vere e senza toccare il progetto Firebase di
// produzione. Si attivano solo con VITE_USE_FIREBASE_EMULATOR=true in .env
// (di norma solo in locale) — vedi npm run emulators / npm run dev:emulator.
const useEmulator = import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true';

if (useEmulator) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  console.log('🧪 Firebase in modalità EMULATORE (Auth :9099, Firestore :8080) — nessun dato reale coinvolto.');
} else {
  // Abilita la persistenza offline (non supportata/non necessaria con l'emulatore)
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      // Multiple tabs open, persistence can only be enabled
      // in one tab at a a time.
      console.warn('Persistenza Firestore: Multi-tab non supportato');
    } else if (err.code === 'unimplemented') {
      // The current browser does not support all of the
      // features required to enable persistence
      console.warn('Persistenza Firestore: Browser non supportato');
    }
  });
}

if (import.meta.env.DEV) {
  console.log('Firebase in modalità sviluppo - progetto:', firebaseConfig.projectId);
}