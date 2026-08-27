import { getAIInstance } from './gemini';

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

export const SHOCK_EVENTS = [
  "Job Loss (zero income for 6 months)",
  "Sudden Medical Emergency (high hospital bills)",
  "Missed Annual Appraisal / Salary Freeze",
  "Major Market Crash (-20% portfolio value)",
  "Unexpected Car/Home Repair",
  "Legal/Compliance Fees",
  "Family Emergency (supporting a relative)",
  "High Inflation Spike (+5% cost of living)",
  "Tax Policy Change (higher tax bracket)",
  "Identity Theft / Fraud Recovery"
];

// 1. Synthetic Data Generator (Raw)
export const generateRawClientData = (): string => {
  const jobs = ["Software Engineer", "Doctor", "Small Business Owner", "Teacher", "Investment Banker"];
  const job = jobs[Math.floor(Math.random() * jobs.length)];
  const age = Math.floor(Math.random() * 40) + 25;
  const baseSalary = Math.floor(Math.random() * 150000) + 50000;
  const savings = Math.floor(Math.random() * 500000) + 10000;
  const investments = Math.floor(Math.random() * 1000000);
  
  return `Client is a ${age}-year-old ${job}. They make roughly $${baseSalary} per year. They have $${savings} in savings and $${investments} in various investments like index funds and some stocks. They spend about 60% of their monthly income on living expenses. They want to buy a house in 5 years and retire at 60. They have panicked in past market crashes and sold off stocks, indicating they might be risk-averse, though they claim to want high growth.`;
};

// 1.5. Profile Engine (Computes Net Worth, Income, Risk from Raw Data)
export const computeProfileFromData = async (rawData: string): Promise<FinanceProfile> => {
  const ai = getAIInstance();
  const model = "gemini-3-flash-preview";
  
  const prompt = `You are the Profile Engine. Extract and compute a structured financial profile from the following raw client data.
  
  RAW DATA:
  ${rawData}
  
  Compute the Net Worth (savings + investments + other assets), Monthly Income (annual / 12), and Monthly Expenses. Determine their true Risk Appetite (Beginner, Moderate, Aggressive) based on their behavior, not just what they claim.
  
  Output ONLY a JSON object matching this TypeScript interface exactly:
  {
    "name": string,
    "age": number,
    "netWorth": number,
    "monthlyIncome": number,
    "monthlyExpenses": number,
    "riskAppetite": "Beginner" | "Moderate" | "Aggressive",
    "goals": string[],
    "pastTrends": string
  }`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }],
      config: { responseMimeType: "application/json" }
    });
    const result = JSON.parse(response.text || "{}");
    return {
      name: result.name || "Synthetic Client",
      age: result.age || 30,
      netWorth: result.netWorth || 0,
      monthlyIncome: result.monthlyIncome || 0,
      monthlyExpenses: result.monthlyExpenses || 0,
      riskAppetite: result.riskAppetite || "Moderate",
      goals: result.goals || [],
      pastTrends: result.pastTrends || "No historical data."
    } as FinanceProfile;
  } catch (err) {
    console.error("Profile Engine Error:", err);
    return {
      name: "Fallback Client", age: 30, netWorth: 100000, monthlyIncome: 5000, monthlyExpenses: 3000, riskAppetite: 'Moderate', goals: [], pastTrends: ''
    };
  }
};

// 2. Orchestrator Agent
export const orchestrateFinancePlan = async (profile: FinanceProfile, shocks: string[] = []): Promise<string> => {
  const ai = getAIInstance();
  const model = "gemini-3-flash-preview";

  let prompt = `You are the Orchestrator Agent. Your job is to create a robust financial plan for the following client:\n`;
  prompt += JSON.stringify(profile, null, 2);
  
  if (shocks.length > 0) {
    prompt += `\n\nSTRESS TEST - Apply these shocks to the plan:\n- ${shocks.join('\n- ')}\n`;
  }
  
  prompt += `\nGenerate 2-3 structured financial plan options based on the data. Include specific numbers and projected values based on the profile data. Format clearly with numbers that can be verified later.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }],
      config: { systemInstruction: "You are an expert banking Relationship Manager backend engine." }
    });
    return response.text || "Failed to generate plan.";
  } catch (err) {
    console.error("Orchestrator Error:", err);
    return "Error in Orchestrator Engine.";
  }
};

// 3. Explanation Agent
export const generateExplanation = async (rawEnginePlan: string): Promise<string> => {
  const ai = getAIInstance();
  const model = "gemini-3-flash-preview";

  const prompt = `You are the Explanation Agent. Take this raw engine output and turn it into highly readable, empathetic, and clear plain text for a customer. Make it sound professional yet accessible.\n\nRAW DATA:\n${rawEnginePlan}`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }]
    });
    return response.text || "Failed to generate explanation.";
  } catch (err) {
    console.error("Explanation Agent Error:", err);
    return "Error in Explanation Agent.";
  }
};

// 4. Verifier Agent
export const verifyNumbers = async (enginePlan: string, explanation: string): Promise<{ verified: boolean, message: string }> => {
  const ai = getAIInstance();
  const model = "gemini-3-flash-preview";

  const prompt = `You are the Verifier Agent. Extract every number from the Customer Explanation and check if it aligns with the Raw Engine Plan. Do not allow hallucinations.
  
  RAW ENGINE PLAN:
  ${enginePlan}
  
  CUSTOMER EXPLANATION:
  ${explanation}
  
  Output a JSON object with two fields:
  "verified": boolean (true if all numbers match and are accurate, false if there is a hallucination or mismatch)
  "message": string (a brief report of the verification process, highlighting any errors found).
  Output only valid JSON.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }],
      config: { responseMimeType: "application/json" }
    });
    const result = JSON.parse(response.text || "{}");
    return {
      verified: result.verified ?? false,
      message: result.message ?? "Verification failed to parse."
    };
  } catch (err) {
    console.error("Verifier Agent Error:", err);
    return { verified: false, message: "Verifier Agent encountered an error." };
  }
};

// 5. Challenger Agent
export const generateChallenge = async (profile: FinanceProfile, chosenPlan: string): Promise<string> => {
  const ai = getAIInstance();
  const model = "gemini-3-flash-preview";

  const prompt = `You are the Challenger Agent. The customer is leaning towards the following financial plan:\n\n${chosenPlan}\n\nTheir profile is: ${JSON.stringify(profile)}\n\nYour job is to argue AGAINST this plan using evidence. Point out the biggest risks, flaws, or alternative scenarios where this plan completely fails. Be critical, analytical, and professional, acting as a "devil's advocate" stress test for their decision.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }]
    });
    return response.text || "Failed to generate challenge.";
  } catch (err) {
    console.error("Challenger Agent Error:", err);
    return "Error in Challenger Agent.";
  }
};
