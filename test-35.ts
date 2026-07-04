import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({});
async function test() {
  try {
    const res = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: 'Hello!'
    });
    console.log('Success 3.5:', res.text);
  } catch (e) {
    console.error('Error 3.5:', e.message);
  }
}
test();
