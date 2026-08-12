import { GoogleGenAI } from '@google/genai';
import 'dotenv/config';
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
ai.models.generateContent({ model: 'gemini-2.5-flash', contents: 'Hello' })
  .then(res => console.log("SUCCESS 2.5:", res.text))
  .catch(err => console.error("ERROR 2.5:", err.message));
