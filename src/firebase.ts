import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// La tua configurazione Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXx",
  authDomain: "piano-alimentare-app.firebaseapp.com",
  projectId: "piano-alimentare-app",
  storageBucket: "piano-alimentare-app.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890abcdef"
};

// Inizializza Firebase
const app = initializeApp(firebaseConfig);

// Esporta i servizi Firebase
export const auth = getAuth(app);
export const db = getFirestore(app);