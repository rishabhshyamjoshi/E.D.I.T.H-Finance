import { GoogleGenAI, Modality } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: 'AIzaSyCav8atp6FNCCbR_F3vz5cS-kWCUzFwSO4' });

async function test() {
  try {
    const session = await ai.live.connect({
      model: 'gemini-2.0-flash-live-001',
      config: {
        responseModalities: [Modality.AUDIO],
        systemInstruction: "You are a helpful assistant.",
      },
      callbacks: {
        onopen: () => console.log('OPENED'),
        onclose: (e) => console.log('CLOSED:', e),
        onerror: (e) => console.log('ERROR:', e),
      }
    });
    
    // Wait for 5 seconds to see if it closes
    setTimeout(() => {
       console.log('5 seconds passed. Closing manually.');
       session.close();
    }, 5000);
  } catch (err) {
    console.error('Catch Connection failed:', err.message || err);
  }
}

test();
