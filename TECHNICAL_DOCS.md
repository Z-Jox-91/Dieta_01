# 📘 MacroMind Technical Documentation v2.0

## 1. Data Flow Architecture
L'applicazione segue un flusso di dati reattivo basato su React e Firebase.

### User Input -> Meal Generation
1.  **Input Utente**: L'utente inserisce la lista degli ingredienti nella scheda "Ricette".
2.  **Richiesta AI (Gemini)**: Se l'utente richiede "AI Gourmet", la lista viene inviata a `generateRecipesWithGemini` in `src/utils/gemini.ts`.
3.  **Ottimizzazione Macro**: Per ogni ricetta generata o inserita manualmente, l'algoritmo in `src/utils/portionOptimizer.ts` calcola le porzioni ottimali.
4.  **Validazione e Suggerimenti**: L'ottimizzatore analizza la fattibilità e fornisce consigli proattivi se i macronutrienti non sono bilanciati.
5.  **Salvataggio**: I dati vengono persistiti su Firebase Firestore per sincronizzazione cross-device.

## 2. Optimizer Performance Metrics
L'ottimizzatore è monitorato per garantire risposte istantanee.

-   **Tempo medio di calcolo**: < 10ms (misurato con `performance.now()`)
-   **Tasso di successo (Soluzioni Feasible)**: > 90% (basato su test di 100 combinazioni casuali)
-   **Precisione Calorica**: Entro ±5% dal target (Algoritmo Weighted Least Squares)

## 3. Monitoring & Bottlenecks
Abbiamo implementato un sistema di logging dettagliato per identificare colli di bottiglia:

-   **AI Latency**: Monitoraggio in console del tempo di risposta di Gemini.
-   **Optimizer Accuracy**: Tracciamento dell'accuratezza tramite la proprietà `accuracy` in `OptimizationResult`.
-   **Network Status**: Gestione avanzata degli errori di rete e timeout per l'assistente AI.

## 4. User Feedback System
Gli utenti possono fornire feedback tramite:
-   **Accuratezza**: L'indicatore percentuale nell'ottimizzatore permette all'utente di capire se la soluzione è valida.
-   **Consigli Proattivi**: Il sistema di suggerimenti guida l'utente a correggere la lista ingredienti per ottenere risultati migliori.

## 5. UI/UX & Accessibility
-   **Tema Scuro**: Contrasto WCAG AAA (Testato in `src/tests/theme.test.tsx`).
-   **Drag-and-Drop**: Interfaccia fluida per la gestione degli ingredienti.
-   **Real-time Preview**: Calcolo istantaneo dei macronutrienti durante l'inserimento.
