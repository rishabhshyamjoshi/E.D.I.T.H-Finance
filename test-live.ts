import { config } from 'dotenv';
config();

import { GoogleGenAI } from '@google/genai';

async function testLive() {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log("Starting Live API test with key:", apiKey ? apiKey.substring(0, 5) + "..." : "MISSING");
  
  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const session = await ai.live.connect({
      model: 'models/gemini-2.0-flash-exp',
      config: {
        systemInstruction: { parts: [{ text: "You are a helpful assistant." }] }
      },
      callbacks: {
        onopen: () => console.log("[EVENT] opened!"),
        onclose: () => {
          console.log("[EVENT] closed!");
          try {
             session.close();
             console.log("session.close() succeeded.");
          } catch (e: any) {
             console.log("session.close() THREW ERROR!", e.message);
          }
        },
        onerror: (err) => console.log("[EVENT] error!", err),
        onmessage: (msg) => console.log("[EVENT] message received", msg)
      }
    });

    console.log("Connected successfully! Sending dummy audio...");
    
    // Send dummy audio every 100ms
    const interval = setInterval(() => {
      const dummyBuffer = new Uint8Array(3200); // 100ms of 16kHz 16-bit PCM
      let binary = '';
      for (let i = 0; i < dummyBuffer.byteLength; i++) {
        binary += String.fromCharCode(dummyBuffer[i]);
      }
      const base64Data = btoa(binary);
      try {
        session.send({
          realtimeInput: {
            mediaChunks: [{
              mimeType: 'audio/pcm;rate=16000',
              data: base64Data
            }]
          }
        });
      } catch (e: any) {
        console.error("Failed to send audio:", e.message);
      }
    }, 1000);

    await new Promise(r => setTimeout(r, 5000));
    clearInterval(interval);
    console.log("Closing session manually.");
    session.close();
  } catch (err: any) {
    console.error("Connection failed:", err.message);
  }
}

testLive();
