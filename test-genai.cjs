try {
  const { GoogleGenAI } = require('@google/genai');
  const ai = new GoogleGenAI({ apiKey: undefined });
  console.log("No error on init");
} catch(e) {
  console.error("Error on init:", e.message);
}
