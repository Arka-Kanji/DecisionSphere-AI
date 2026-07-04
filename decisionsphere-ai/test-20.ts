import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({});
async function test() {
  try {
    const res = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: 'Hello!'
    });
    console.log('Success 2.0:', res.text);
  } catch (e) {
    console.error('Error 2.0:', e.message);
  }
}
test();
