import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({});
async function test() {
  try {
    const res = await ai.models.generateContent({
      model: 'gemini-1.5-pro',
      contents: 'Hello!'
    });
    console.log('Success 1.5 pro:', res.text);
  } catch (e) {
    console.error('Error 1.5 pro:', e.message);
  }
}
test();
