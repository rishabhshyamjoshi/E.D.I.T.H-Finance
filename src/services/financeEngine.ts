import { getAIInstance, getOrchestratorAI, withRetry } from './gemini';
import { chatWithGroq } from './groq';
import { GEMINI_MODELS } from '../config/constants';

export interface FinanceProfile {
  name: string;
  age: number;
  netWorth: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  riskAppetite: 'Beginner' | 'Moderate' | 'Aggressive';
  goals: string[];
  pastTrends: string;
}

export const generateRawClientData = (): string => {
  const jobs = ["Software Engineer", "Doctor", "Small Business Owner", "Teacher", "Investment Banker"];
  const job = jobs[Math.floor(Math.random() * jobs.length)];
  const age = Math.floor(Math.random() * 40) + 25;
  const baseSalary = Math.floor(Math.random() * 150000) + 50000;
  const savings = Math.floor(Math.random() * 500000) + 10000;
  const investments = Math.floor(Math.random() * 1000000);
  
  return `Client is a ${age}-year-old ${job}. They make roughly $${baseSalary} per year. They have $${savings} in savings and $${investments} in various investments like index funds and some stocks. They spend about 60% of their monthly income on living expenses. They want to buy a house in 5 years and retire at 60. They have panicked in past market crashes and sold off stocks, indicating they might be risk-averse, though they claim to want high growth.`;
};

// ── Helper: Parse Number Safely ──────────────────────────────────────────────
const parseSafeNumber = (val: any, fallback: number): number => {
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  if (typeof val === 'string') {
    // Strip non-numeric characters (except decimals)
    const cleaned = val.replace(/[^0-9.-]+/g, "");
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
};

// ── Profile Engine → GROQ (fast, structured JSON) ─────────────────────────
export const computeProfileFromData = async (rawData: string, onRetry?: (msg: string) => void): Promise<FinanceProfile> => {
  const prompt = `You are the Profile Engine. Extract and compute a structured financial profile from the following raw client data.
  
  RAW DATA:
  ${rawData}
  
  Compute the Net Worth (savings + investments + other assets), Monthly Income (annual / 12), and Monthly Expenses. Determine their true Risk Appetite (Beginner, Moderate, Aggressive) based on their behavior, not just what they claim.
  
  CRITICAL FORMATTING RULES:
  - You MUST return ONLY valid JSON. No markdown, no explanations, no text outside the JSON block.
  - All numeric fields MUST be raw integers. DO NOT include commas, currency symbols, or quotes (e.g., use 150000, NOT "$150,000" or "150,000").
  
  Return ONLY valid JSON matching this exact schema:
  {
    "name": "String",
    "age": Number,
    "netWorth": Number,
    "monthlyIncome": Number,
    "monthlyExpenses": Number,
    "riskAppetite": "Beginner" | "Moderate" | "Aggressive",
    "goals": ["Goal1", "Goal2"],
    "pastTrends": "Brief summary of past financial behavior"
  }`;

  const text = await chatWithGroq(prompt, onRetry);
  let cleanJson = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  
  // Sometimes models leave trailing commas or add extra text. We'll do a basic JSON parse and rely on the fallback logic below if it fails entirely.
  let parsed: any;
  try {
    parsed = JSON.parse(cleanJson);
  } catch (err: any) {
    // If the JSON is completely broken, we throw an error so the caller knows it failed.
    throw new Error("AI returned invalid data format. Could not extract profile.");
  }

  // Force cast and sanitize all fields
  return {
    name: typeof parsed.name === 'string' && parsed.name ? parsed.name : "Unknown Client",
    age: parseSafeNumber(parsed.age, 30),
    netWorth: parseSafeNumber(parsed.netWorth, 0),
    monthlyIncome: parseSafeNumber(parsed.monthlyIncome, 5000),
    monthlyExpenses: parseSafeNumber(parsed.monthlyExpenses, 3000),
    riskAppetite: ['Beginner', 'Moderate', 'Aggressive'].includes(parsed.riskAppetite) ? parsed.riskAppetite : "Moderate",
    goals: Array.isArray(parsed.goals) ? parsed.goals.map(String) : ["Build Wealth"],
    pastTrends: typeof parsed.pastTrends === 'string' && parsed.pastTrends ? parsed.pastTrends : "No significant past data available."
  };
};

// ── Orchestrator → GOOGLE KEY #2 (best reasoning for full financial plan) ─────────
export const orchestrateFinancePlan = async (profile: FinanceProfile, selectedShocks: string[] = [], onRetry?: (msg: string) => void): Promise<string> => {
  const shockText = selectedShocks.length > 0 ? `They are also facing these unexpected shock events: ${selectedShocks.join(', ')}.` : '';
  const prompt = `You are the Orchestrator (Lead Financial Strategist).
  
  Client Profile:
  Name: ${profile.name} (Age ${profile.age})
  Net Worth: $${profile.netWorth}
  Monthly Income: $${profile.monthlyIncome}
  Monthly Expenses: $${profile.monthlyExpenses}
  Risk Appetite: ${profile.riskAppetite}
  Goals: ${profile.goals.join(', ')}
  Past Trends: ${profile.pastTrends}
  ${shockText}
  
  Generate a comprehensive, expert-level financial plan (Markdown format). Include exact numeric allocations for savings, emergency funds, and investments based on their risk appetite. If there are shocks, explicitly address how the plan mitigates them.
  
  CRITICAL: You MUST verify your own math. Ensure all percentage allocations add up to exactly 100%. The total monthly dollar allocations (savings + investments + emergency) MUST NOT exceed the client's available monthly surplus (Monthly Income - Monthly Expenses). Flawless mathematical consistency is required.`;

  const response = await chatWithGroq(prompt, onRetry);
  return response || 'Failed to generate plan.';
};

// ── Explainer → GROQ (summarisation, very fast) ───────────────────────────
export const generateExplanation = async (rawPlan: string, onRetry?: (msg: string) => void): Promise<string> => {
  const prompt = `You are the Explainer (Client-facing AI).
  
  Here is a complex financial plan generated by the Orchestrator:
  ${rawPlan}
  
  Translate this plan into a simple, easy-to-understand summary for the client. Use bullet points and clear, encouraging language. Remove complex jargon. (Markdown format)`;

  // Switch to GPT-OSS 20B to bypass 120b TPM limits and reduce requested tokens
  const response = await chatWithGroq(prompt, onRetry, 3, 'openai/gpt-oss-20b', 1024);
  return response || 'Explanation failed to generate.';
};

// ── Verifier → GROQ (JSON structured output) ──────────────────────────────
export const verifyNumbers = async (rawPlan: string, explanation: string, onRetry?: (msg: string) => void): Promise<{ verified: boolean; message: string; data: any }> => {
  const prompt = `You are the Verifier (Auditor AI).
  
  Raw Plan:
  ${rawPlan}
  
  Explanation provided to client:
  ${explanation}
  
  Task:
  1. Audit the numbers to ensure they match mathematically. Allow for minor percentage rounding errors (e.g., 99.9% to 100.1% is perfectly acceptable) as long as the raw dollar amounts do not exceed the available income/surplus.
  2. Ensure the explanation does not hallucinate facts not present in the Raw Plan.
  
  CRITICAL FORMATTING RULES:
  - Return ONLY a valid JSON object.
  - Do NOT include markdown formatting (no \`\`\`json blocks).
  - Do NOT include any conversational text before or after the JSON.
  
  Return ONLY valid JSON matching this exact schema:
  {
    "verified": boolean,
    "message": "String explaining the audit result",
    "data": { "issuesFound": number }
  }`;

  // Use Compound Mini for simple JSON verification to save tokens
  const text = await chatWithGroq(prompt, onRetry, 3, 'groq/compound-mini', 512);
  const cleanJson = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  
  try {
    return JSON.parse(cleanJson);
  } catch (err) {
    console.error("Verifier returned invalid JSON:", cleanJson);
    return {
      verified: false,
      message: "Audit inconclusive: Verifier failed to return a valid JSON response.",
      data: { issuesFound: -1 }
    };
  }
};

// ── Challenger → GROQ (critical reasoning, no quota pressure) ─────────────
export const generateChallenge = async (profile: FinanceProfile, rawPlan: string, onRetry?: (msg: string) => void): Promise<string> => {
  const prompt = `You are the Challenger (Devil's Advocate AI).
  
  Client Profile:
  Age: ${profile.age}, Net Worth: $${profile.netWorth}, Income: $${profile.monthlyIncome}, Risk: ${profile.riskAppetite}
  
  Proposed Plan:
  ${rawPlan}
  
  Critique this plan. What are the hidden risks? What happens if the market crashes? Is the risk appetite too high/low for their goals? Provide 3 sharp, critical bullet points. (Markdown format)`;

  // Switch to Qwen 3.8 27B model
  const response = await chatWithGroq(prompt, onRetry, 3, 'qwen/qwen3.8-27b', 1024);
  return response || 'Challenge failed to generate.';
};
