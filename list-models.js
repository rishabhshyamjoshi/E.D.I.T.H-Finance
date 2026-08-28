import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: 'AIzaSyCav8atp6FNCCbR_F3vz5cS-kWCUzFwSO4' });

async function list() {
  const models = await ai.models.list();
  const liveModels = [];
  
  for await (const model of models) {
    if (model.supportedMethods && model.supportedMethods.includes('bidiGenerateContent')) {
      liveModels.push(model.name);
    }
  }
  
  console.log('Live Models:', liveModels);
}

list().catch(console.error);
