import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { FoodItem } from '../components/Foods';
import { MacroTarget } from './portionOptimizer';

// Nota: gemini-1.5-pro è stato ritirato da Google e restituisce errore 404.
// Usiamo gemini-2.5-flash: veloce, economico e disponibile per tutte le chiavi API.
const MODEL_NAME = "gemini-2.5-flash";

export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface RecipeSuggestion {
  title: string;
  description: string;
  ingredients: { name: string; amount: string }[];
  instructions: string[];
  macros: { calories: number; proteins: number; carbs: number; fats: number };
  nutritionalReasoning: string;
}

const getApiKey = (): string => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error(
      "Chiave API Gemini non configurata. Apri il file .env nella cartella del progetto e imposta " +
      "VITE_GEMINI_API_KEY con la chiave gratuita ottenibile su https://aistudio.google.com/app/apikey, " +
      "poi riavvia il sito (npm run dev). Se il sito è pubblicato su Vercel, aggiungi la stessa variabile " +
      "in Settings → Environment Variables e riesegui il deploy."
    );
  }
  return apiKey;
};

const translateGeminiError = (error: any): Error => {
  const msg: string = error?.message || '';

  if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid') || msg.includes('403')) {
    return new Error("La chiave API di Gemini non è valida. Genera una nuova chiave su https://aistudio.google.com/app/apikey e aggiornala nel file .env.");
  }
  if (msg.includes('404') || msg.includes('not found')) {
    return new Error(`Il modello AI "${MODEL_NAME}" non è disponibile per la tua chiave API. Verifica su https://aistudio.google.com che la chiave sia attiva.`);
  }
  if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota')) {
    return new Error("Limite di richieste AI raggiunto. Attendi un minuto e riprova.");
  }
  if (msg.includes('SAFETY')) {
    return new Error("La risposta è stata bloccata dai filtri di sicurezza. Riformula la richiesta.");
  }
  if (msg.includes('fetch') || msg.includes('Network') || msg.includes('ECONNREFUSED')) {
    return new Error("Errore di rete durante la connessione all'AI. Verifica la connessione internet.");
  }
  return new Error(`Errore AI: ${msg || "Si è verificato un errore nella comunicazione con l'assistente."}`);
};

export const sendMessageToGemini = async (
  history: ChatMessage[],
  message: string,
  context: {
    foods: FoodItem[];
    userPreferences?: any;
    dietGoals?: any;
  }
) => {
  const apiKey = getApiKey();
  const genAI = new GoogleGenerativeAI(apiKey);

  const systemInstruction = `
    Sei un assistente esperto in nutrizione e pianificazione dei pasti per l'app MacroMind.
    Il tuo obiettivo è aiutare l'utente a creare piani alimentari bilanciati secondo le Linee guida
    per una sana alimentazione del CREA, suggerire ricette e rispondere a domande nutrizionali.

    Contesto fornito:
    - Database alimenti dell'utente (valori per 100g): ${JSON.stringify(context.foods.map(f => ({ name: f.name, kcal: f.calories, prot: f.proteins, carb: f.carbs, grassi: f.fats })))}
    - Preferenze utente: ${JSON.stringify(context.userPreferences || 'Nessuna specifica')}
    - Obiettivi dieta: ${JSON.stringify(context.dietGoals || 'Nessuno specifico')}

    Regole di interazione:
    1. Basati primariamente sugli alimenti forniti nel database dell'utente.
    2. Mantieni un tono professionale, incoraggiante e scientifico.
    3. Fornisci sempre le quantità in grammi quando suggerisci porzioni.
    4. Rispondi in modo conciso ma completo, sempre in italiano.
    5. Non fornire mai consigli medici o diagnosi. Invita sempre l'utente a consultare un medico per questioni di salute.
    6. Se l'utente chiede qualcosa al di fuori della nutrizione, riporta gentilmente la conversazione sui temi di salute e benessere.
  `;

  const generationConfig = {
    temperature: 0.7,
    maxOutputTokens: 2048,
  };

  const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
  ];

  // L'API richiede che la history inizi con un messaggio 'user':
  // scartiamo eventuali messaggi 'model' iniziali (es. messaggi di errore salvati).
  const firstUserIdx = history.findIndex(m => m.role === 'user');
  const chatHistory = firstUserIdx === -1 ? [] : history.slice(firstUserIdx);

  const model = genAI.getGenerativeModel({ model: MODEL_NAME, systemInstruction });
  const chat = model.startChat({
    generationConfig,
    safetySettings,
    history: chatHistory,
  });

  try {
    const result = await chat.sendMessage(message);
    const text = result.response.text();
    if (!text) {
      throw new Error("Risposta vuota dall'AI");
    }
    return text;
  } catch (error: any) {
    console.error('[AI Assistant] Errore API Gemini:', error);
    throw translateGeminiError(error);
  }
};

export const generateRecipesWithGemini = async (
  ingredients: string[],
  target: MacroTarget
): Promise<RecipeSuggestion[]> => {
  const apiKey = getApiKey();
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: {
      temperature: 0.8,
      responseMimeType: "application/json",
    },
  });

  const prompt = `
    Agisci come uno chef nutrizionista che segue le Linee guida per una sana alimentazione del CREA.
    Crea 3 ricette diverse usando esclusivamente o principalmente questi ingredienti: ${ingredients.join(', ')}.
    Ogni ricetta deve avvicinarsi a questi target nutrizionali:
    - Calorie: ${target.totalCalories} kcal
    - Carboidrati: ${target.carbsPercent}% dell'energia
    - Proteine: ${target.proteinsPercent}% dell'energia
    - Grassi: ${target.fatsPercent}% dell'energia

    Per ogni ricetta fornisci:
    1. Un titolo accattivante in italiano.
    2. Una breve descrizione.
    3. Lista ingredienti con quantità precise in grammi (campo "amount" solo numero + "g", es. "120 g").
    4. Istruzioni di preparazione passo-passo.
    5. Calcolo dei macronutrienti finali.
    6. Una spiegazione del perché la ricetta è bilanciata per i target forniti.

    Rispondi esclusivamente con un array JSON di oggetti con questa struttura esatta:
    [{
      "title": string,
      "description": string,
      "ingredients": [{"name": string, "amount": string}],
      "instructions": [string],
      "macros": {"calories": number, "proteins": number, "carbs": number, "fats": number},
      "nutritionalReasoning": string
    }]
  `;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Estrai il JSON anche se il modello aggiunge testo o recinzioni ```json
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("La risposta dell'AI non contiene ricette valide. Riprova.");

    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error("La risposta dell'AI non contiene ricette valide. Riprova.");
    }
    return parsed;
  } catch (error: any) {
    console.error('Errore generazione ricette Gemini:', error);
    if (error instanceof SyntaxError) {
      throw new Error("L'AI ha restituito un formato non valido. Riprova.");
    }
    throw translateGeminiError(error);
  }
};
