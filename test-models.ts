import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function test() {
  try {
    const res = await ai.models.list();
    for await (const m of res) {
      console.log(m.name);
    }
  } catch(e) { console.log('error:', e.message); }
}
test();
