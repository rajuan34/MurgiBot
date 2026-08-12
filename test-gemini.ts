import { GoogleGenAI } from '@google/genai';
import 'dotenv/config';
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
ai.models.generateContent({ model: 'gemini-2.5-flash', contents: 'Hello' })
  .then(res => console.log("SUCCESS 2.5 flash:", res.text))
  .catch(err => console.error("ERROR 2.5 flash:", err.message));
ai.models.generateContent({ model: 'gemini-2.0-flash', contents: 'Hello' })
  .then(res => console.log("SUCCESS 2.0 flash:", res.text))
  .catch(err => console.error("ERROR 2.0 flash:", err.message));
