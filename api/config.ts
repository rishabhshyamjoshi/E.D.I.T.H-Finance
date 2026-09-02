export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405 });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const orchestratorKey = process.env.GEMINI_API_KEY_ORCHESTRATOR;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY is not configured on the server.' }), { status: 500 });
    }

    // Return the keys dynamically to the frontend
    return new Response(JSON.stringify({ 
      geminiApiKey: apiKey,
      geminiOrchestratorKey: orchestratorKey || apiKey
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Config API Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
