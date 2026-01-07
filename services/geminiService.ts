
import { GoogleGenAI, Modality } from "@google/genai";
import { AnalysisType, GroundingSource } from '../types';

/**
 * Helper to get client safely.
 */
const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const generateCaseAnalysis = async (
  analysisType: AnalysisType,
  patientData: any
): Promise<{ text: string; sources: GroundingSource[] }> => {
  try {
    const ai = getClient();
    const modelId = 'gemini-3-pro-preview'; 
    
    const prompt = `
      Act as an expert medical consultant specializing in rare diseases within a Federated Learning environment. 
      Perform a comprehensive ${analysisType} and Multi-modal analysis for the following patient:
      ${JSON.stringify(patientData)}
      
      Requirements:
      1. Explain the primary disease diagnosis (the one with the highest probability).
      2. Interpret the SHAP (SHapley Additive exPlanations) values to explain which features (Genomic, EHR, Imaging) most influenced the model's decision.
      3. Mention how Federated Learning contributed to this diagnosis by leveraging global rare disease datasets while maintaining data privacy.
      4. Suggest next clinical steps and potential treatment protocols.
      
      Provide a detailed insight report with professional medical terminology. 
      Use Google Search to cross-reference the latest clinical trials and case studies for the identified markers.
    `;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        systemInstruction: "You are Genosym AI, a specialized diagnostic engine. You utilize multi-modal fusion and federated learning insights to identify rare pathologies with high explainability (SHAP). Always cite sources via Google Search grounding.",
        temperature: 0.1,
        tools: [{ googleSearch: {} }]
      }
    });

    const sources: GroundingSource[] = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
      title: chunk.web?.title || 'Clinical Source',
      uri: chunk.web?.uri || '#'
    })) || [];

    return { text: response.text || "Analysis failed.", sources };
  } catch (error) {
    console.error("Gemini API Error:", error);
    return { text: "Unable to generate analysis. Please verify connection.", sources: [] };
  }
};

export const chatWithMedora = async (
  history: {role: 'user' | 'model', text: string}[], 
  newMessage: string,
  complexity: 'simple' | 'medical' = 'medical',
  patientContext?: string
): Promise<{ text: string; sources: GroundingSource[] }> => {
  try {
    const ai = getClient();
    
    let systemInstruction = '';
    const concisenessRule = "CRITICAL: Keep your response extremely concise (max 2-3 sentences). Your output will be read aloud by text-to-speech, so avoid complex markdown or long lists. Speak clearly and professionally.";

    if (patientContext === 'LANDING_PAGE_CONTEXT') {
      systemInstruction = `You are Medora AI, the interactive guide for Genosym AI. 
      Highlight: Multi-modal Rare Disease Diagnosis, Federated Learning, and SHAP Explainability. 
      Always use Google Search to find real-world statistics about rare disease prevalence when asked.
      ${concisenessRule}`;
    } else {
      systemInstruction = `You are Medora AI, an advanced medical assistant specializing in Rare Diseases.
      Complexity Mode: ${complexity.toUpperCase()}.
      Context: ${patientContext || 'General'}.
      Use Google Search to provide up-to-date information from ORPHANET, OMIM, and PubMed.
      ${concisenessRule}`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [{ text: newMessage }]
      },
      config: {
        systemInstruction: systemInstruction,
        tools: [{ googleSearch: {} }]
      }
    });

    const sources: GroundingSource[] = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.filter((chunk: any) => chunk.web)
      ?.map((chunk: any) => ({
        title: chunk.web.title,
        uri: chunk.web.uri
      })) || [];

    return { text: response.text || "I'm processing...", sources };
  } catch (error) {
    console.error(error);
    return { text: "Medora is currently unavailable.", sources: [] };
  }
};

/**
 * Base64 Encoding/Decoding helpers.
 */
export function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const synthesizeSpeech = async (text: string): Promise<AudioBuffer | null> => {
  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) return null;

    const bytes = decode(base64Audio);
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const audioBuffer = await decodeAudioData(bytes, audioContext, 24000, 1);
    
    return audioBuffer;
  } catch (error) {
    console.error("TTS Error:", error);
    return null;
  }
};

export const playAudioBuffer = (buffer: AudioBuffer) => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.connect(audioContext.destination);
  source.start(0);
};
