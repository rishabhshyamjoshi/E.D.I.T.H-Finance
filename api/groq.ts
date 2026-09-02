import Groq from 'groq-sdk';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405 });
  }

  try {
    const body = await req.json();
    const { prompt, model, max_tokens } = body;

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'GROQ_API_KEY is not configured on the server.' }), { status: 500 });
    }

    const groq = new Groq({ apiKey });
    
    const response = await groq.chat.completions.create({
      model: model || 'openai/gpt-oss-120b',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: max_tokens || 4096,
    });

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Groq API Proxy Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
