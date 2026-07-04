import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({});
async function test() {
  const models = await ai.models.list();
  for await (const m of models) {
    if (m.name.includes('flash')) {
      console.log(m.name);
    }
  }
}
test();
