import { GoogleGenAI, Modality } from "@google/genai";
import { GEMINI_MODELS } from '../config/constants';

// Primary key: Voice Live + TTS
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';

// Secondary key: Orchestrator agent only
const orchestratorApiKey = import.meta.env.VITE_GEMINI_API_KEY_ORCHESTRATOR || process.env.GEMINI_API_KEY_ORCHESTRATOR || '';

let ai: GoogleGenAI;
let orchestratorAI: GoogleGenAI;

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

export function getOrchestratorAI(): GoogleGenAI {
  if (!orchestratorAI) {
    const key = orchestratorApiKey || apiKey; // fallback to primary if not set
    if (!key) {
      throw new Error('No Gemini API key configured.');
    }
    orchestratorAI = new GoogleGenAI({ apiKey: key });
  }
  return orchestratorAI;
}

export { getAI as getAIInstance };

// Always use getAIInstance() to access the primary AI client
// This ensures it is initialized before use
if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
}
if (orchestratorApiKey) {
  orchestratorAI = new GoogleGenAI({ apiKey: orchestratorApiKey });
}

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
  const client = getAI();
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
