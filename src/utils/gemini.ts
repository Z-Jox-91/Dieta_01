import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { FoodItem } from '../components/Foods';

const MODEL_NAME = "gemini-1.0-pro";

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
    throw new Error("VITE_GEMINI_API_KEY non trovata. Assicurati di averla impostata nel file .env");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const generationConfig = {
    temperature: 0.9,
    topK: 1,
    topP: 1,
    maxOutputTokens: 2048,
  };

  const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  ];

  const systemInstruction = `
    Sei un assistente esperto in nutrizione e pianificazione dei pasti per l'app MacroMind.
    Il tuo obiettivo è aiutare l'utente a creare piani alimentari bilanciati, suggerire ricette e rispondere a domande nutrizionali.
    
    Contesto fornito:
    - Database alimenti: ${JSON.stringify(context.foods.map(f => f.name))}
    - Preferenze utente: ${JSON.stringify(context.userPreferences || 'Nessuna specifica')}
    - Obiettivi dieta: ${JSON.stringify(context.dietGoals || 'Nessuno specifico')}
    
    Regole di interazione:
    1. Basati primariamente sugli alimenti forniti nel database.
    2. Mantieni un tono professionale, incoraggiante e scientifico.
    3. Fornisci sempre le quantità in grammi quando suggerisci porzioni.
    4. Rispondi in modo conciso ma completo, sempre in italiano.
    5. Non fornire mai consigli medici o diagnosi. Invita sempre l'utente a consultare un medico per questioni di salute.
  `;

  const chat = model.startChat({
    generationConfig,
    safetySettings,
    history: [
      { role: 'user', parts: [{ text: systemInstruction }] },
      { role: 'model', parts: [{ text: "Certamente, sono pronto ad assisterti con la tua dieta. Come posso aiutarti oggi?" }] },
      ...history
    ],
  });

  try {
    const result = await chat.sendMessage(message);
    const response = result.response;
    return response.text();
  } catch (error) {
    console.error('Errore API Gemini:', error);
    throw new Error("Si è verificato un errore nella comunicazione con l'assistente AI. Controlla la console per i dettagli.");
  }
};