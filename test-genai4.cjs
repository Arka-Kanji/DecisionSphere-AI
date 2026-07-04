const { GoogleGenAI } = require('@google/genai');
delete process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
ai.models.generateContent({ model: 'gemini-2.5-flash', contents: 'test' }).then(() => console.log("Success")).catch(e => console.log("Error on call:", e.message));
