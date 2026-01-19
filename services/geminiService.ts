import { GoogleGenAI } from "@google/genai";
import { DailyRecord } from "../types";

const getSystemPrompt = () => `
You are a smart assistant for a Gujarati household milk tracker app.
Your role is to analyze the milk collection data (Yes/No records) and provide a summary in GUJARATI language only.
You should calculate the total estimated bill based on the "Price Per Day" provided.
If there are reasons mentioned for not taking milk, summarize them as well.
Be polite, helpful and concise.
`;

export const analyzeMilkData = async (
  records: DailyRecord[],
  cowDailyPrice: number,
  buffaloDailyPrice: number,
  monthName: string
): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Create a readable summary for the AI
    const recordsSummary = records.map(r => {
      const parts = [];
      
      if (r.cow) {
        parts.push(`ગાય: હા`);
      } else {
        parts.push(`ગાય: ના${r.cowReason ? ` (કારણ: ${r.cowReason})` : ''}`);
      }

      if (r.buffalo) {
        parts.push(`ભેંસ: હા`);
      } else {
        parts.push(`ભેંસ: ના${r.buffaloReason ? ` (કારણ: ${r.buffaloReason})` : ''}`);
      }

      return `${r.date}: ${parts.join(', ')}`;
    }).join('\n');

    const prompt = `
      અહીં ${monthName} મહિના માટે દૂધનો હિસાબ (હા/ના) છે:
      
      ${recordsSummary}

      ભાવ (રોજનો ફિક્સ ભાવ):
      - ગાયનું દૂધ: ₹${cowDailyPrice}/દિવસ
      - ભેંસનું દૂધ: ₹${buffaloDailyPrice}/દિવસ

      મહેરબાની કરીને મને નીચેની વિગતો ગુજરાતીમાં જણાવો:
      1. ગાયનું દૂધ કેટલા દિવસ લીધું?
      2. ભેંસનું દૂધ કેટલા દિવસ લીધું?
      3. ગાય અને ભેંસ બંનેનું મળીને કુલ અનુમાનિત બિલ.
      4. દૂધ ન લેવાના મુખ્ય કારણો (જો કોઈ હોય તો).
      5. અન્ય કોઈ મહત્વની નોંધ.

      જવાબ માત્ર ગુજરાતી ભાષામાં જ આપો.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: getSystemPrompt(),
        thinkingConfig: { thinkingBudget: 0 }
      }
    });

    return response.text || "માફ કરશો, હું માહિતી લાવી શક્યો નથી.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "એઆઈ સાથે કનેક્ટ કરવામાં ભૂલ આવી છે. કૃપા કરીને થોડી વાર પછી પ્રયત્ન કરો.";
  }
};