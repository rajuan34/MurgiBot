import { GoogleGenAI } from '@google/genai';
import 'dotenv/config';
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
ai.interactions.create({ model: 'gemini-3.5-flash', input: 'Hello' })
  .then(res => console.log("SUCCESS:", res.output_text))
  .catch(err => console.error("ERROR:", err.message));
