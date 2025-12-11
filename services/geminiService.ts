import { GoogleGenAI } from "@google/genai";
import { Mode } from "../types";
import { SYSTEM_PROMPTS } from "../constants";

// Initialize Gemini Client
// In a production app, we wouldn't re-init on every call, but we need to ensure the key is fresh
const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("Missing API Key");
  }
  return new GoogleGenAI({ apiKey });
};

export const sendMessageToGemini = async (
  message: string,
  code: string,
  language: string,
  mode: Mode,
  history: { role: string; content: string }[]
): Promise<string> => {
  try {
    const ai = getAIClient();
    
    // Construct the context
    const modePrompt = SYSTEM_PROMPTS[mode];
    const systemInstruction = `${SYSTEM_PROMPTS.base}\n\n${modePrompt}`;

    const promptContext = `
    LANGUAGE: ${language}
    
    CODE CONTEXT:
    \`\`\`${language}
    ${code}
    \`\`\`
    
    USER QUESTION:
    ${message}
    `;

    // Map history to Gemini format if we were using multi-turn chat directly with history object,
    // but for simplicity and specific context injection per turn (like changing code),
    // we will treat this as a single generation with context or a fresh chat.
    // To maintain state, we can pass previous messages.
    
    // For this specific app structure where code changes frequently, 
    // it is often better to send the full context each time or use a transient chat.
    // Let's use generateContent for direct control over the prompt structure.

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        ...history.map(h => ({
          role: h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.content }]
        })),
        {
          role: 'user',
          parts: [{ text: promptContext }]
        }
      ],
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.2, // Lower temperature for more precise coding answers
      }
    });

    return response.text || "I couldn't generate a response.";

  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error communicating with CodeBuddy. Please checks your API key or try again.";
  }
};