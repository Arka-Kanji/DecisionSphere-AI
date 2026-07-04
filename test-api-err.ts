import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function test() {
  const models = ['gemini-flash-latest', 'gemini-pro-latest', 'gemini-3.5-flash', 'gemma-4-26b-a4b-it'];
  for (const m of models) {
    try {
      const res = await ai.models.generateContent({ model: m, contents: 'Test' });
      console.log(m, 'success:', res.text);
    } catch(e) { console.log(m, 'error:', e.message); }
  }
}
test();
