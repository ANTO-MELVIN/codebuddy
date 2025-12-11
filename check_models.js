import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Manually read .env.local
const envPath = path.resolve(__dirname, '.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));
const apiKey = envConfig.GEMINI_API_KEY;

console.log("Testing API Key:", apiKey ? "Found" : "Missing");

const genAI = new GoogleGenerativeAI(apiKey);

async function run() {
  console.log("--- Testing gemini-pro ---");
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent("Hello");
    console.log("SUCCESS: gemini-pro works.");
  } catch (e) {
    console.log("FAILED: gemini-pro", e.message);
  }

  console.log("\n--- Testing gemini-1.5-flash ---");
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Hello");
    console.log("SUCCESS: gemini-1.5-flash works.");
  } catch (e) {
    console.log("FAILED: gemini-1.5-flash", e.message);
  }
  
  console.log("\n--- Testing gemini-1.5-pro ---");
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    const result = await model.generateContent("Hello");
    console.log("SUCCESS: gemini-1.5-pro works.");
  } catch (e) {
    console.log("FAILED: gemini-1.5-pro", e.message);
  }

  console.log("\n--- Testing gemini-2.0-flash-exp ---");
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    const result = await model.generateContent("Hello");
    console.log("SUCCESS: gemini-2.0-flash-exp works.");
  } catch (e) {
    console.log("FAILED: gemini-2.0-flash-exp", e.message);
  }
}

run();
