import { GoogleGenerativeAI } from "@google/generative-ai";
import { Mode } from "../types";
import { SYSTEM_PROMPTS } from "../constants";

// Initialize Gemini Client
const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("Missing API Key");
  }
  return new GoogleGenerativeAI(apiKey);
};

export const sendMessageToGemini = async (
  message: string,
  code: string,
  language: string,
  mode: Mode,
  history: { role: string; content: string }[]
): Promise<string> => {
  try {
    const genAI = getAIClient();
    // Using gemini-2.0-flash-exp as it appears to be the only one available for this key
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-exp",
      systemInstruction: `${SYSTEM_PROMPTS.base}\n\n${SYSTEM_PROMPTS[mode]}`
    });

    const promptContext = `
    LANGUAGE: ${language}
    
    CODE CONTEXT:
    \`\`\`${language}
    ${code}
    \`\`\`
    
    USER QUESTION:
    ${message}
    `;

    // Convert history to Gemini format
    const chatHistory = history.map(h => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }]
    }));

    const chat = model.startChat({
      history: chatHistory,
      generationConfig: {
        temperature: 0.2,
      }
    });

    // Retry logic for 429 errors
    let retries = 3;
    let delay = 2000; // Start with 2 seconds

    while (retries > 0) {
      try {
        const result = await chat.sendMessage(promptContext);
        const response = await result.response;
        return response.text();
      } catch (err: any) {
        if (err.message.includes("429") || err.message.includes("Quota exceeded")) {
          retries--;
          if (retries === 0) throw err;
          console.log(`Rate limit hit. Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff
        } else {
          throw err;
        }
      }
    }
    
    throw new Error("Max retries exceeded");

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    if (error.message.includes("429") || error.message.includes("Quota exceeded")) {
      return "⚠️ **Speed Limit Reached**: You are chatting too fast for the free tier. Please wait a moment and try again.";
    }

    return `Error communicating with CodeBuddy. Details: ${error.message || error}`;
  }
};