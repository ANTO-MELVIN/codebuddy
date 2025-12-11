import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env
const envPath = path.resolve(__dirname, '.env');
let apiKey;
try {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    apiKey = envConfig.GEMINI_API_KEY;
} catch (e) {
    console.error("Could not read .env file");
    process.exit(1);
}

if (!apiKey) {
    console.error("API Key not found in .env");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
  try {
    // There isn't a direct listModels on the client in the node SDK easily accessible in all versions, 
    // but we can try to just test a few known ones or use the model manager if available.
    // Actually, for the JS SDK, we often just have to know the model names.
    // But let's try to hit the API directly to list models if the SDK doesn't expose it easily,
    // OR just test a wider range of models.
    
    const modelsToTest = [
        "gemini-2.0-flash-exp",
        "gemini-1.5-flash",
        "gemini-1.5-flash-latest",
        "gemini-1.5-pro",
        "gemini-1.5-pro-latest",
        "gemini-1.0-pro",
        "gemini-pro"
    ];

    console.log("Testing models...");
    
    for (const modelName of modelsToTest) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            await model.generateContent("Test");
            console.log(`✅ ${modelName} is AVAILABLE`);
        } catch (e) {
            console.log(`❌ ${modelName} failed: ${e.message}`); // Log full error
        }
    }

  } catch (e) {
    console.error("Error:", e);
  }
}

listModels();
