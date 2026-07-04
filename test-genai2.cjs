try {
  const { GoogleGenAI } = require('@google/genai');
  delete process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI();
  console.log("No error on init");
  ai.models.generateContent({ model: 'gemini-2.5-flash', contents: 'test' }).then(() => console.log("Success")).catch(e => console.log("Error on call:", e.message));
} catch(e) {
  console.error("Error on init:", e.message);
}
