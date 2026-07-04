try {
  const { GoogleGenAI } = require('@google/genai');
  delete process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  console.log("No error on init");
} catch(e) {
  console.error("Error on init:", e.message);
}
