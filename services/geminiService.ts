
import { GoogleGenAI, Modality } from "@google/genai";
import { AnalysisType } from '../types';

// Helper to get client safely (handling key availability)
const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateCaseAnalysis = async (
  analysisType: AnalysisType,
  patientData: any
): Promise<string> => {
  try {
    const ai = getClient();
    // Use a reasoning-capable model for medical analysis
    const modelId = 'gemini-3-pro-preview'; 
    
    const prompt = `
      Act as an expert medical consultant specializing in rare diseases. 
      Perform a ${analysisType} analysis for the following patient data context:
      ${JSON.stringify(patientData)}
      
      Provide a detailed insight report. 
      If this is SHAP Analysis, explain the feature importance.
      If this is Federated Learning, explain how local model updates improved the global model for this case type.
      Keep the tone professional, clinical, and concise.
    `;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        systemInstruction: "You are Genosym AI, a specialized medical diagnostic assistant.",
        temperature: 0.2, // Low temperature for more deterministic medical answers
      }
    });

    return response.text || "Analysis generation failed.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Unable to generate analysis. Please verify API Key.";
  }
};

export const chatWithMedora = async (
  history: {role: 'user' | 'model', text: string}[], 
  newMessage: string,
  complexity: 'simple' | 'medical' = 'medical',
  patientContext?: string
) => {
  try {
    const ai = getClient();
    
    let systemInstruction = '';

    // Special Mode for Landing Page Explainer
    if (patientContext === 'LANDING_PAGE_CONTEXT') {
      systemInstruction = `You are Medora AI, the official ambassador and interactive guide for the "Genosym AI" platform.
      
      YOUR GOAL:
      Explain the features, security, and value of Genosym AI to potential users (Doctors, Hospital Administrators, Researchers).
      
      KEY PLATFORM FEATURES TO HIGHLIGHT:
      1. **Rare Disease Diagnosis**: We use multi-modal data (Genomic, Proteomic, Imaging, EHR) to identify rare conditions using the ORDO ontology.
      2. **Federated Learning**: A privacy-first approach where AI models are trained across hospitals without patient data ever leaving the local institution.
      3. **SHAP Explainability**: We don't just give a diagnosis; we explain *why* using SHAP values (Feature Importance).
      4. **Security**: HIPAA & GDPR compliant, end-to-end encryption.
      
      TONE:
      Professional, innovative, welcoming, and reassuring. Keep answers concise (under 3 sentences if possible) and engaging.
      
      Do NOT provide medical advice. Only talk about the software platform.`;
    } else {
      // Standard Medical Assistant Mode
      systemInstruction = `You are Medora AI, an advanced medical assistant specializing in Rare Diseases, Genomics, and Multi-modal Diagnostics.
      
      CORE KNOWLEDGE BASE:
      - You have access to the Orphanet Rare Disease Ontology (ORDO). Always use standard ORDO terms and IDs (e.g., ORPHA:1234) when referencing diseases.
      - You can interpret genetic variants (HGVS nomenclature), biomarkers, and radiological findings.
      
      RESPONSE GUIDELINES:
      1. **Complexity Mode: ${complexity.toUpperCase()}**
         - If 'MEDICAL': Use precise clinical terminology, reference specific pathways, and assume the user is a doctor.
         - If 'SIMPLE': Use analogies, plain language, and explain complex terms.
      2. **Context Awareness**: 
         ${patientContext ? `Current Patient Context: ${patientContext}. Relate answers specifically to this patient's symptoms and data.` : 'No specific patient selected. Provide general medical information.'}
      3. **Citations**: Always provide a "Sources" section at the end, citing ORPHANET, OMIM, or relevant medical literature.
      4. **Scope**:
         - Define Rare Diseases using ORDO definitions.
         - Interpret Genetic Mutations (Pathogenicity, Function).
         - Explain Biomarker deviations.
         - Correlate EHR symptoms with Ontology terms.
      
      Be helpful, accurate, and concise.`;
    }

    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: systemInstruction
      },
      history: history.map(h => ({ role: h.role, parts: [{ text: h.text }] }))
    });

    const result = await chat.sendMessage({ message: newMessage });
    return result.text;
  } catch (error) {
    console.error(error);
    return "Medora is currently unavailable due to connection issues.";
  }
};

// Manual PCM Decoder for Gemini TTS Raw Output
function decodePCM(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): AudioBuffer {
  // Convert Uint8Array to Int16Array (16-bit PCM)
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      // Normalize Int16 to Float32 [-1.0, 1.0]
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

    const binaryString = atob(base64Audio);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    
    // Use manual PCM decoding instead of native decodeAudioData because Gemini returns raw PCM without headers
    const audioBuffer = decodePCM(bytes, audioContext, 24000);
    
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
