import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function test() {
  try {
    const res = await ai.models.generateContent({ model: 'gemini-2.5-flash-lite', contents: 'Hello!' });
    console.log('2.5-flash-lite success:', res.text);
  } catch(e) { console.log('2.5-flash-lite error:', e.message); }
}
test();
