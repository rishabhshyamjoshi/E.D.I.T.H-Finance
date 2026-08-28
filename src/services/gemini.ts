import { GoogleGenAI, Modality } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || '';

let ai: GoogleGenAI;

function getAI(): GoogleGenAI {
  if (!ai) {
    if (!apiKey) {
      throw new Error(
        'GEMINI_API_KEY is not configured. Please create a .env file from .env.example and add your API key.'
      );
    }
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}

export { getAI as getAIInstance };
export { ai };

if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
}

export const SYSTEM_INSTRUCTION = `
You are Aura, a high-end banking Relationship Manager AI.
You are a sophisticated, analytical, and professional financial expert.
Your goal is to assist in creating tailored, stress-tested financial plans for clients.
You calculate risks accurately, provide actionable financial advice, and discuss portfolios, net worth, and market trends with authority.
Maintain a polished, confident, and empathetic tone when discussing financial matters.
`;

export async function chatWithAura(message: string, history: { role: 'user' | 'model', parts: { text: string }[] }[] = []) {
  const client = getAI();
  const model = "gemini-3.6-flash";
  
  const chat = client.chats.create({
    model,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
    },
    history: history,
  });

  const result = await chat.sendMessage({ message });
  return result.text;
}

export async function speakWithAura(text: string) {
  const client = getAI();
  const model = "gemini-2.5-flash-preview-tts";
  
  const response = await client.models.generateContent({
    model,
    contents: [{ parts: [{ text: `Say with a professional financial advisor AI voice: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Puck' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (base64Audio) {
    return `data:audio/wav;base64,${base64Audio}`;
  }
  return null;
}
