# Configurazione Regole di Sicurezza Firestore

**ATTENZIONE**: Questo progetto usa **Cloud Firestore**, NON "Realtime Database". Se provi a incollare queste regole nella sezione Realtime Database, otterrai un `Parse error`.

## Soluzione Passo-Passo

### 1. Assicurati di essere nella sezione corretta
1. Vai su [console.firebase.google.com](https://console.firebase.google.com)
2. Seleziona il tuo progetto
3. Nel menu laterale a sinistra, cerca la sezione **"Build"** (o "Compila")
4. Clicca su **"Firestore Database"** (e NON su "Realtime Database")
5. Una volta dentro Firestore, vai alla tab **"Regole"** (Rules) in alto

### 2. Copia e Incolla queste Regole
Cancella tutto il contenuto presente nella tab Regole e incolla esattamente questo:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Regole per il profilo utente e i dati privati (pasti, cronologia chat, cibi personali)
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Sotto-collezioni private dell'utente (come /foods o /chat_history)
      match /{allSubcollections=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
    
    // Regole per il database globale degli alimenti (Sola Lettura per tutti gli utenti autenticati)
    match /alimenti/{foodId} {
      allow read: if request.auth != null;
      // Per ora permettiamo la scrittura per popolare il DB, in futuro solo admin
      allow write: if request.auth != null; 
    }
  }
}
```

### 3. Pubblica
1. Clicca sul pulsante azzurro **"Pubblica"** (Publish)
2. Attendi qualche secondo per la propagazione (solitamente istantanea)

#### Opzione C - Regole Temporanee per Test (SOLO per sviluppo):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 3. Pubblica le Regole
1. Clicca su **"Pubblica"** (Publish)
2. Conferma la pubblicazione

### 4. Verifica la Configurazione

Dopo aver pubblicato le regole:
1. Ricarica la tua applicazione
2. Prova ad effettuare il login
3. Controlla la console del browser per verificare che non ci siano più errori

## Regole Alternative per Sviluppo

Se stai ancora sviluppando e vuoi regole più permissive (SOLO per sviluppo):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Regole per Produzione

Per un ambiente di produzione, usa regole più restrittive:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Aggiungi altre regole specifiche per le tue collezioni
  }
}
```

## Note Importanti

- Le regole di sicurezza sono fondamentali per proteggere i tuoi dati
- Non usare mai `allow read, write: if true;` in produzione
- Testa sempre le regole prima di pubblicarle
- Le modifiche alle regole possono richiedere alcuni minuti per essere attive

## Risoluzione Errori di Parsing

### Errore "Parse error" alla Line 1
Questo errore può verificarsi per diversi motivi:

1. **Copia e incolla problemi**: 
   - Assicurati di copiare SOLO il codice delle regole
   - Non includere i backticks (```) o la parola "javascript"
   - Non includere spazi extra all'inizio

2. **Caratteri nascosti**:
   - Scrivi le regole manualmente invece di copiarle
   - Usa un editor di testo semplice prima di incollare

3. **Versione console Firebase**:
   - Alcune versioni della console non supportano `rules_version = '2';`
   - Prova l'Opzione B senza questa riga

### Procedura Step-by-Step per Evitare Errori

1. **Cancella tutto** il contenuto esistente nell'editor regole
2. **Scrivi manualmente** (non copiare) questa regola base:
   ```
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```
3. **Clicca "Pubblica"**
4. Se funziona, puoi aggiungere `rules_version = '2';` all'inizio

## Debugging Generale

Se continui ad avere problemi:
1. Controlla la console Firebase per errori nelle regole
2. Usa il simulatore di regole nella console Firebase
3. Verifica che l'utente sia effettivamente autenticato prima di scrivere su Firestore
4. Prova le regole in modalità test prima di pubblicarle