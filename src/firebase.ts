import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

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

// Abilita la modalità di debug per Firebase Auth
if (import.meta.env.DEV) {
  console.log('Firebase in modalità sviluppo - Debug abilitato');
  console.log('Firebase Config:', firebaseConfig);
  console.log('Firebase App inizializzata:', app);
  console.log('Firebase Auth:', auth);
  console.log('Firebase Firestore:', db);
}