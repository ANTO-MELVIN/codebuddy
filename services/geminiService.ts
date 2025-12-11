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

    const result = await chat.sendMessage(promptContext);
    const response = await result.response;
    return response.text();

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    if (error.message.includes("429") || error.message.includes("Quota exceeded")) {
      return "⚠️ **Speed Limit Reached**: You are chatting too fast for the free tier. Please wait about 60 seconds and try again.";
    }

    return `Error communicating with CodeBuddy. Details: ${error.message || error}`;
  }
};