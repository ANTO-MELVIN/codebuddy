import { GoogleGenerativeAI } from "@google/generative-ai";
import { Mode } from "../types";
import { SYSTEM_PROMPTS } from "../constants";

// --- OpenRouter Implementation ---
const sendMessageToOpenRouter = async (
  promptContext: string,
  systemInstruction: string,
  history: { role: string; content: string }[]
): Promise<string> => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("Missing OpenRouter API Key");

  const messages = [
    { role: "system", content: systemInstruction },
    ...history.map(h => ({ role: h.role, content: h.content })),
    { role: "user", content: promptContext }
  ];

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "http://localhost:3000", // Site URL
        "X-Title": "CodeBuddy", // Site Title
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": "google/gemini-2.0-flash-exp:free", // Use free tier model via OpenRouter
        "messages": messages,
        "temperature": 0.2,
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `OpenRouter Error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error: any) {
    console.error("OpenRouter API Error:", error);
    throw error;
  }
};

// --- Google Gemini Implementation ---
const getAIClient = () => {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing API Key");
  }
  return new GoogleGenerativeAI(apiKey);
};

const attemptGeneration = async (
  modelName: string,
  promptContext: string,
  chatHistory: any[],
  systemInstruction: string,
  maxRetries: number = 3
): Promise<string> => {
  const genAI = getAIClient();
  const model = genAI.getGenerativeModel({ 
    model: modelName,
    systemInstruction
  });

  const chat = model.startChat({
    history: chatHistory,
    generationConfig: { temperature: 0.2 }
  });

  let retries = maxRetries;
  let delay = 2000;

  while (retries > 0) {
    try {
      const result = await chat.sendMessage(promptContext);
      const response = await result.response;
      return response.text();
    } catch (err: any) {
      // Handle 429 (Too Many Requests) and 503 (Service Unavailable)
      if (err.message.includes("429") || err.message.includes("Quota exceeded") || err.status === 503) {
        retries--;
        if (retries === 0) throw err;
        console.log(`[${modelName}] Rate limit/Busy. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 1.5; 
      } else {
        throw err;
      }
    }
  }
  throw new Error("Max retries exceeded");
};

export const sendMessageToGemini = async (
  message: string,
  code: string,
  language: string,
  mode: Mode,
  history: { role: string; content: string }[]
): Promise<string> => {
  const systemInstruction = `${SYSTEM_PROMPTS.base}\n\n${SYSTEM_PROMPTS[mode]}`;
  
  const promptContext = `
    LANGUAGE: ${language}
    
    CODE CONTEXT:
    \`\`\`${language}
    ${code}
    \`\`\`
    
    USER QUESTION:
    ${message}
    `;

  // Check if OpenRouter Key is available
  if (process.env.OPENROUTER_API_KEY) {
    try {
      return await sendMessageToOpenRouter(promptContext, systemInstruction, history);
    } catch (error: any) {
      return `Error communicating with OpenRouter. Details: ${error.message || error}`;
    }
  }

  // Fallback to Direct Google Gemini SDK
  const chatHistory = history.map(h => ({
    role: h.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: h.content }]
  }));

  try {
    return await attemptGeneration("gemini-2.0-flash-exp", promptContext, chatHistory, systemInstruction, 5);
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    if (error.message.includes("429") || error.message.includes("Quota exceeded")) {
      return "⚠️ **High Traffic**: The AI is currently very busy (Free Tier Limit). Please wait 1 minute and try again.";
    }

    return `Error communicating with CodeBuddy. Details: ${error.message || error}`;
  }
};