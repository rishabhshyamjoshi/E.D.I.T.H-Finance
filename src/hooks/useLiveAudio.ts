import { useState, useRef } from 'react';
import { getAIInstance, SYSTEM_INSTRUCTION } from '../services/gemini';
import { GEMINI_MODELS, AUDIO_CONFIG } from '../config/constants';
import { Modality, Type } from "@google/genai";

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export const useLiveAudio = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLiveMode, setIsLiveMode] = useState(false);
  
  const liveSessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);

  const playLiveAudio = (base64Data: string) => {
    const binary = atob(base64Data);
    const buffer = new ArrayBuffer(binary.length);
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    
    const int16Data = new Int16Array(buffer);
    const float32Data = new Float32Array(int16Data.length);
    for (let i = 0; i < int16Data.length; i++) {
      float32Data[i] = int16Data[i] / 32768;
    }

    const ctx = outputAudioContextRef.current;
    if (!ctx) return;

    const audioBuffer = ctx.createBuffer(1, float32Data.length, AUDIO_CONFIG.SAMPLE_RATE);
    audioBuffer.getChannelData(0).set(float32Data);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);

    const startTime = Math.max(ctx.currentTime, nextStartTimeRef.current);
    source.start(startTime);
    nextStartTimeRef.current = startTime + audioBuffer.duration;
  };

  const stopLiveAudio = () => {
    outputAudioContextRef.current?.close();
    outputAudioContextRef.current = new window.AudioContext({ sampleRate: AUDIO_CONFIG.SAMPLE_RATE });
    nextStartTimeRef.current = 0;
  };

  const stopLiveSession = () => {
    liveSessionRef.current?.close();
    liveSessionRef.current = null;
    workletNodeRef.current?.disconnect();
    workletNodeRef.current = null;
    audioContextRef.current?.close();
    audioContextRef.current = null;
    outputAudioContextRef.current?.close();
    outputAudioContextRef.current = null;
    setIsLiveMode(false);
  };

  const startLiveSession = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new window.AudioContext({ sampleRate: AUDIO_CONFIG.INPUT_SAMPLE_RATE });
      audioContextRef.current = audioContext;
      
      outputAudioContextRef.current = new window.AudioContext({ sampleRate: AUDIO_CONFIG.SAMPLE_RATE });
      nextStartTimeRef.current = 0;

      await audioContext.audioWorklet.addModule('/audio-processor.js');
      const workletNode = new AudioWorkletNode(audioContext, 'audio-processor');
      workletNodeRef.current = workletNode;

      const source = audioContext.createMediaStreamSource(stream);

      const session = await getAIInstance().live.connect({
        model: GEMINI_MODELS.LIVE,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } },
          },
          tools: [{
            functionDeclarations: [
              { name: 'execute_agents', description: 'Executes the AI agents to generate the interactive financial plan for the user.' },
              { name: 'change_mode', description: 'Changes the profile mode to either synthetic, manual, or parse.', parameters: { type: Type.OBJECT, properties: { mode: { type: Type.STRING } }, required: ['mode'] } },
              { name: 'generate_synthetic_profile', description: 'Generates a random synthetic profile for the user.' },
              { name: 'parse_notes', description: 'Parses the user provided raw notes into a structured profile.' }
            ]
          }]
        },
        callbacks: {
          onopen: () => setIsLiveMode(true),
          onmessage: async (message: any) => {
            const parts = message.serverContent?.modelTurn?.parts || [];
            
            for (const part of parts) {
              // Handle function calls
              if (part.functionCall) {
                const funcCall = part.functionCall;
                if (funcCall.name === 'generate_synthetic_profile') {
                  window.dispatchEvent(new CustomEvent('aura_voice_command', { 
                    detail: { 
                      name: funcCall.name, 
                      args: funcCall.args,
                      callback: (profileData: any) => {
                         if (!liveSessionRef.current) return;
                         (liveSessionRef.current as any).sendToolResponse({
                           functionResponses: [{
                             id: funcCall.id,
                             name: funcCall.name,
                             response: { result: `Synthetic profile generated: ${JSON.stringify(profileData)}. You MUST read out a summary of this profile to the user, including their name, age, net worth, and a couple of their goals. Act as if you just generated this for them.` }
                           }]
                         });
                      }
                    } 
                  }));
                  continue; // Wait for callback from UI
                }
                window.dispatchEvent(new CustomEvent('aura_voice_command', { detail: { name: funcCall.name, args: funcCall.args } }));
                const resultStr = `Command ${funcCall.name} dispatched to the UI successfully. Please tell the user that the UI is updating.`;
                if (liveSessionRef.current) {
                  (liveSessionRef.current as any).sendToolResponse({
                    functionResponses: [{
                      id: funcCall.id,
                      name: funcCall.name,
                      response: { result: resultStr }
                    }]
                  });
                }
              }
              // Handle audio output
              if (part.inlineData?.data) {
                playLiveAudio(part.inlineData.data);
              }
              // Handle text output
              if (part.text) {
                setMessages(prev => [...prev, { role: 'model', text: part.text }]);
              }
            }
            
            if (message.serverContent?.interrupted) {
              stopLiveAudio();
            }
          },
          onclose: () => stopLiveSession(),
          onerror: (err: any) => {
             console.error("Live API Error:", err);
             stopLiveSession();
          }
        }
      });

      liveSessionRef.current = session;

      let audioBuffer: number[] = [];
      workletNode.port.onmessage = (event) => {
        if (!liveSessionRef.current) return;
        
        const rawBuffer = event.data;
        const bytes = new Uint8Array(rawBuffer);
        for (let i = 0; i < bytes.byteLength; i++) {
          audioBuffer.push(bytes[i]);
        }
        
        if (audioBuffer.length >= 4096) {
          const chunk = audioBuffer.slice(0, 4096);
          audioBuffer = audioBuffer.slice(4096);
          
          let binary = '';
          for (let i = 0; i < chunk.length; i++) {
            binary += String.fromCharCode(chunk[i]);
          }
          const base64Data = btoa(binary);
          
          try {
            liveSessionRef.current.sendRealtimeInput({
              audio: {
                mimeType: `audio/pcm;rate=${AUDIO_CONFIG.INPUT_SAMPLE_RATE}`,
                data: base64Data
              }
            });
          } catch (e) {
            // Ignore send errors if closing
          }
        }
      };

      source.connect(workletNode);
      workletNode.connect(audioContext.destination);
      
    } catch (err: any) {
      console.error("Failed to start live session:", err);
      let errorMsg = err?.message || err?.toString() || 'Unknown error';
      
      if (!navigator.mediaDevices) {
        errorMsg = "Microphone access blocked. If using a network IP, switch to localhost or HTTPS.";
      }
      
      window.alert(`❌ Voice connection failed:\n\n${errorMsg}`);
      
      setMessages(prev => [...prev, { role: 'model', text: `❌ Voice link failed: ${errorMsg}. Check browser console for details.` }]);
      setIsLiveMode(false);
    }
  };

  return {
    messages,
    setMessages,
    isLiveMode,
    startLiveSession,
    stopLiveSession
  };
};
