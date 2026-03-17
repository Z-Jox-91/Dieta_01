# Guida all'Implementazione e Popolamento del Database Firestore

Questa guida fornisce tutte le informazioni necessarie per configurare, gestire e popolare il database di **MacroMind**.

## 1. Analisi dello Stato del Database

Il sistema è progettato per utilizzare **Cloud Firestore** come database centralizzato. 
- **Stato Attuale**: Il codice è già predisposto per connettersi a Firestore. Se l'applicazione è avviata e configurata correttamente, cercherà di leggere i dati dalle collezioni `alimenti` e `users`.
- **Verifica**: Se all'apertura della sezione "Alimenti" la lista è vuota, significa che il database non è ancora stato popolato o le regole di sicurezza non sono configurate correttamente.

---

## 2. Configurazione dei Parametri di Connessione

L'applicazione utilizza le seguenti variabili d'ambiente per connettersi a Firebase. Queste devono essere configurate nel file `.env` (locale) o nelle impostazioni di Vercel (produzione).

| Variabile | Descrizione |
| :--- | :--- |
| `VITE_FIREBASE_API_KEY` | Chiave API del progetto Firebase |
| `VITE_FIREBASE_AUTH_DOMAIN` | Dominio di autenticazione (es. `progetto.firebaseapp.com`) |
| `VITE_FIREBASE_PROJECT_ID` | ID univoco del progetto Firebase |
| `VITE_FIREBASE_STORAGE_BUCKET` | Bucket per l'archiviazione file |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | ID per l'invio di messaggi |
| `VITE_FIREBASE_APP_ID` | ID univoco dell'applicazione |

---

## 3. Schema dei Dati (Data Model)

### Collezione: `alimenti` (Globale)
Questa collezione contiene il database dei cibi condiviso.

| Campo | Tipo | Descrizione | Esempio |
| :--- | :--- | :--- | :--- |
| `name` | string | Nome dell'alimento | "Pasta integrale" |
| `category` | string | Categoria (CRB, PRT, LPD) | "CRB" |
| `calories` | number | Calorie per 100g/unit | 350 |
| `carbs` | number | Carboidrati (g) | 70 |
| `proteins` | number | Proteine (g) | 12 |
| `fats` | number | Grassi (g) | 2 |
| `unit` | string | Unità di misura | "g" |
| `creatorId` | string | ID dell'utente che l'ha creato | "abc123xyz" |
| `createdAt` | string/iso | Data di creazione | "2024-03-20T..." |

### Collezione: `users` (Privata)
Struttura gerarchica per i dati degli utenti:
- `users/{userId}`: Profilo base (nome, email).
- `users/{userId}/data/meals`: Piano alimentare salvato.
- `users/{userId}/data/calculations`: Dati antropometrici e risultati calcoli.
- `users/{userId}/data/daily_limits`: Obiettivi calorici giornalieri.
- `users/{userId}/recipes`: Ricette personalizzate dell'utente.

---

## 4. Regole di Sicurezza (Firestore Rules)

Per garantire che gli utenti possano leggere i dati globali e gestire i propri dati privati, incolla queste regole nella sezione **Firestore Database > Regole**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Regole per i dati privati dell'utente
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      match /{allSubcollections=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
    
    // Regole per il database globale degli alimenti
    match /alimenti/{foodId} {
      // Tutti gli utenti autenticati possono leggere
      allow read: if request.auth != null;
      // Permettiamo la creazione/modifica solo se autenticati
      allow create: if request.auth != null;
      // Solo il creatore può modificare o eliminare l'alimento
      allow update, delete: if request.auth != null && resource.data.creatorId == request.auth.uid;
    }
  }
}
```

---

## 5. Procedura di Caricamento Dati (Popolamento)

### Metodo A: Caricamento via Excel (Consigliato per il setup iniziale)
1. Accedi all'applicazione e vai alla sezione **"Alimenti"**.
2. Clicca sul pulsante **"Carica Excel"** (icona Upload).
3. Seleziona un file `.xlsx` o `.csv` con le seguenti colonne (nomi in minuscolo):
   - `name`, `calories`, `carbs`, `proteins`, `fats`, `unit`
4. Il sistema calcolerà automaticamente la categoria (CRB/PRT/LPD) e caricherà i dati su Firestore.

### Metodo B: Inserimento Manuale
1. Nella sezione **"Alimenti"**, clicca su **"Aggiungi Alimento"** (+).
2. Compila i campi richiesti (Nome, Macronutrienti).
3. Clicca su **"Salva"**. L'alimento sarà immediatamente disponibile per te e per gli altri utenti.

---

## 6. Credenziali e Permessi

- **Accesso Utente**: Gli utenti devono registrarsi/accedere tramite Email e Password. Solo gli utenti autenticati possono visualizzare il database degli alimenti.
- **Permessi Scrittura**: Un utente può modificare o eliminare solo gli alimenti che ha creato personalmente (verificato tramite `creatorId`).
- **Accesso Admin (Opzionale)**: Per una gestione centralizzata, è possibile utilizzare la console di Firebase per modificare direttamente i documenti nella collezione `alimenti`.
