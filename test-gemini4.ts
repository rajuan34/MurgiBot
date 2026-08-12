import { GoogleGenAI } from '@google/genai';
import 'dotenv/config';
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
ai.interactions.create({ model: 'gemini-3.5-flash-8b', input: 'Hello' })
  .then(res => console.log("SUCCESS 8b:", res.output_text))
  .catch(err => console.error("ERROR 8b:", err.message));
