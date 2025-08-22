import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

// La tua configurazione Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDQmm5kJL_-JE9LSdCKrZXo-NQeTHEiL7c",
  authDomain: "piano-alimentare-app-c0a5e.firebaseapp.com",
  projectId: "piano-alimentare-app-c0a5e",
  storageBucket: "piano-alimentare-app-c0a5e.appspot.com",
  messagingSenderId: "1045389721230",
  appId: "1:1045389721230:web:f5c5e0b7d1f1c3a5f5c5e0"
};

// Inizializza Firebase
const app = initializeApp(firebaseConfig);

// Esporta i servizi Firebase
export const auth = getAuth(app);
export const db = getFirestore(app);

// Abilita la modalità di debug per Firebase Auth
if (import.meta.env.DEV) {
  console.log('Firebase in modalità sviluppo - Debug abilitato');
}