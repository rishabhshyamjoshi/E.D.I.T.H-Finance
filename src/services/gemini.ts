import { GoogleGenAI, Modality } from "@google/genai";
import { GEMINI_MODELS } from '../config/constants';

// Primary key: Voice Live + TTS
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';

// Secondary key: Orchestrator agent only
const orchestratorApiKey = import.meta.env.VITE_GEMINI_API_KEY_ORCHESTRATOR || process.env.GEMINI_API_KEY_ORCHESTRATOR || '';

let ai: GoogleGenAI | null = null;
let orchestratorAI: GoogleGenAI | null = null;

function getAI(dynamicKey?: string): GoogleGenAI {
  if (!ai && dynamicKey) {
    ai = new GoogleGenAI({ apiKey: dynamicKey });
  }
  if (!ai) {
    throw new Error('GEMINI_API_KEY is not configured. Please pass a dynamic key or add it to your .env file.');
  }
  return ai;
}

export function getOrchestratorAI(dynamicKey?: string): GoogleGenAI {
  if (!orchestratorAI && dynamicKey) {
    orchestratorAI = new GoogleGenAI({ apiKey: dynamicKey });
  }
  if (!orchestratorAI) {
    throw new Error('No Gemini API key configured.');
  }
  return orchestratorAI;
}

export { getAI as getAIInstance };

export const SYSTEM_INSTRUCTION = `
You are Aura, a high-end banking Relationship Manager AI.
You are a sophisticated, analytical, and professional financial expert.
Your goal is to assist in creating tailored, stress-tested financial plans for clients.
You calculate risks accurately, provide actionable financial advice, and discuss portfolios, net worth, and market trends with authority.
Maintain a polished, confident, and empathetic tone when discussing financial matters.

IMPORTANT: You have tools available to perform actions in the application interface.
- If the user asks to parse notes, use the 'parse_notes' tool.
- If the user asks to execute or run the agents/analysis, use the 'execute_agents' tool.
- If the user asks to change the mode, use the 'change_mode' tool.

CRITICAL COMMUNICATION RULE: 
1. The first message you receive is an automated system ping. Do NOT assume the user speaks English based on it. Keep your first greeting very brief (e.g. "I'm listening.").
2. Once the user speaks, you MUST instantly detect and switch to their exact spoken language (Spanish, Hindi, Hinglish, etc.). NEVER default to English unless the user speaks English to you first.
`;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function withRetry<T>(
  operation: () => Promise<T>,
  onRetry?: (msg: string) => void,
  maxRetries = 3
): Promise<T> {
  let retries = 0;
  while (true) {
    try {
      return await operation();
    } catch (error: any) {
      if (retries >= maxRetries) {
        throw error;
      }
      
      const isRetryable = error.message?.includes('503') || error.message?.includes('429') || error.status === 503 || error.status === 429;
      if (!isRetryable) {
        throw error;
      }

      retries++;
      const waitTime = Math.pow(2, retries) * 2000; // 4s, 8s, 16s
      if (onRetry) {
        onRetry(`High API demand. Retrying in ${waitTime / 1000}s... (Attempt ${retries}/${maxRetries})`);
      }
      await delay(waitTime);
    }
  }
}

export async function chatWithAura(message: string, history: { role: 'user' | 'model', parts: { text: string }[] }[] = [], onRetry?: (msg: string) => void) {
  const client = getAI();
  const model = GEMINI_MODELS.DEFAULT;

  const chat = client.chats.create({
    model,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
    },
    history: history,
  });

  return withRetry(async () => {
    const result = await chat.sendMessage({ message });
    return result.text;
  }, onRetry);
}

export async function speakWithAura(text: string) {
  let client;
  try {
    client = getAI();
  } catch (e) {
    const resp = await fetch('/api/config');
    const data = await resp.json();
    client = getAI(data.geminiApiKey);
  }
  const model = GEMINI_MODELS.TTS;

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
