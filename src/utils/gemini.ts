import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { FoodItem } from '../components/Foods';

const MODEL_NAME = "gemini-1.5-pro"; // Usiamo 1.5 pro per migliori capacità di ragionamento

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

export const sendMessageToGemini = async (
  history: ChatMessage[],
  message: string,
  context: {
    foods: FoodItem[];
    userPreferences?: any;
    dietGoals?: any;
  }
) => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  
  // Logging Inizio Richiesta
  console.log('[AI Assistant] Inizio richiesta Gemini:', {
    timestamp: new Date().toISOString(),
    messageLength: message.length,
    historyLength: history.length,
    contextFoodsCount: context.foods.length
  });

  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    const errorMsg = "Chiave API Gemini non configurata o non valida. Verifica il file .env";
    console.error(`[AI Assistant] ❌ ERRORE CONFIGURAZIONE: ${errorMsg}`);
    throw new Error(errorMsg);
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  
  const systemInstruction = `
    Sei un assistente esperto in nutrizione e pianificazione dei pasti per l'app MacroMind.
    Il tuo obiettivo è aiutare l'utente a creare piani alimentari bilanciati, suggerire ricette e rispondere a domande nutrizionali.
    
    Contesto fornito:
    - Database alimenti: ${JSON.stringify(context.foods.map(f => ({ name: f.name, cal: f.calories, p: f.proteins, c: f.carbs, f: f.fats })))}
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

  const model = genAI.getGenerativeModel({ 
    model: MODEL_NAME,
    systemInstruction: {
      role: "system",
      parts: [{ text: systemInstruction }]
    }
  });

  const generationConfig = {
    temperature: 0.7,
    topK: 1,
    topP: 1,
    maxOutputTokens: 2048,
  };

  const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
  ];

  const chatHistory = history.map(msg => ({
    role: msg.role,
    parts: msg.parts
  }));

  const chat = model.startChat({
    generationConfig,
    safetySettings,
    history: chatHistory,
  });

  const startTime = Date.now();

  try {
    const result = await chat.sendMessage(message);
    const response = await result.response;
    const text = response.text();
    const endTime = Date.now();
    
    if (!text) {
      throw new Error("Risposta vuota dall'AI");
    }
    
    console.log('[AI Assistant] ✅ Risposta ricevuta:', {
      durationMs: endTime - startTime,
      textLength: text.length,
      timestamp: new Date().toISOString()
    });

    return text;
  } catch (error: any) {
    const endTime = Date.now();
    console.error('[AI Assistant] ❌ Errore API Gemini:', {
      error: error.message,
      durationMs: endTime - startTime,
      timestamp: new Date().toISOString()
    });
    
    if (error.message?.includes('403') || error.message?.includes('API_KEY_INVALID')) {
      throw new Error("La chiave API di Gemini non è valida o non ha i permessi necessari.");
    }
    
    if (error.message?.includes('429')) {
      throw new Error("Limite di richieste raggiunto per l'assistente AI. Riprova tra un minuto.");
    }

    if (error.message?.includes('ECONNREFUSED') || error.message?.includes('Network Error')) {
      throw new Error("Errore di rete. Verifica la tua connessione o i permessi del browser.");
    }

    throw new Error(`Errore AI: ${error.message || "Si è verificato un errore nella comunicazione con l'assistente."}`);
  }
};

export const generateRecipesWithGemini = async (
  ingredients: string[],
  target: MacroTarget
): Promise<RecipeSuggestion[]> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error("Chiave API Gemini non configurata.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const prompt = `
    Agisci come uno chef nutrizionista. Crea 3 ricette diverse usando esclusivamente o principalmente questi ingredienti: ${ingredients.join(', ')}.
    Ogni ricetta deve avvicinarsi a questi target nutrizionali:
    - Calorie: ${target.totalCalories} kcal
    - Carboidrati: ${target.carbsPercent}%
    - Proteine: ${target.proteinsPercent}%
    - Grassi: ${target.fatsPercent}%

    Per ogni ricetta, fornisci:
    1. Un titolo accattivante.
    2. Una breve descrizione.
    3. Lista ingredienti con quantità precise in grammi.
    4. Istruzioni di preparazione passo-passo.
    5. Calcolo dei macronutrienti finali.
    6. Una spiegazione dettagliata del perché questa ricetta è bilanciata per i target forniti.

    Rispondi esclusivamente in formato JSON come un array di oggetti con questa struttura:
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
    const response = await result.response;
    const text = response.text();
    
    // Pulizia del testo per estrarre solo il JSON (a volte Gemini aggiunge ```json ... ```)
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("Risposta AI non valida");
    
    return JSON.parse(jsonMatch[0]);
  } catch (error: any) {
    console.error('Errore generazione ricette Gemini:', error);
    throw new Error(`Impossibile generare ricette: ${error.message}`);
  }
};
