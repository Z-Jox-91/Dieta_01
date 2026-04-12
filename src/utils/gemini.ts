import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { FoodItem } from '../components/Foods';

const MODEL_NAME = "gemini-1.5-pro"; // Usiamo 1.5 pro per migliori capacità di ragionamento

export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
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
  if (!apiKey) {
    console.error("API Key Gemini mancante!");
    throw new Error("VITE_GEMINI_API_KEY non trovata. Assicurati di averla impostata nel file .env");
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
    temperature: 0.7, // Ridotta per risposte più stabili
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

  // Filtriamo la cronologia per assicurarci che sia valida per Gemini
  // Deve alternare tra user e model
  const chatHistory = history.map(msg => ({
    role: msg.role,
    parts: msg.parts
  }));

  const chat = model.startChat({
    generationConfig,
    safetySettings,
    history: chatHistory,
  });

  try {
    const result = await chat.sendMessage(message);
    const response = await result.response;
    const text = response.text();
    
    if (!text) {
      throw new Error("Risposta vuota dall'AI");
    }
    
    return text;
  } catch (error: any) {
    console.error('Errore dettagliato API Gemini:', error);
    
    if (error.message?.includes('403') || error.message?.includes('API_KEY_INVALID')) {
      throw new Error("La chiave API di Gemini non è valida o non ha i permessi necessari.");
    }
    
    if (error.message?.includes('429')) {
      throw new Error("Limite di richieste raggiunto per l'assistente AI. Riprova tra un minuto.");
    }

    throw new Error(`Errore AI: ${error.message || "Si è verificato un errore nella comunicazione con l'assistente."}`);
  }
};
