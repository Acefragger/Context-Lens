import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { AnalysisResult, FullAnalysisResponse, GroundingSource } from "../types";

export const analyzeImage = async (
  imageBase64: string,
  mimeType: string,
  note?: string,
  currency: string = "USD"
): Promise<FullAnalysisResponse> => {
  // Fix: Use process.env.API_KEY exclusively as per guidelines. Do not use hardcoded fallback.
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    throw new Error("API Key is missing. Ensure process.env.API_KEY is set.");
  }

  const ai = new GoogleGenAI({ apiKey });

  // Construct the prompt
  const userPrompt = note
    ? `Analyze this image. Context note: "${note}".`
    : `Analyze this image.`;

  // Define strict schema for the response
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      object_name: { type: Type.STRING, description: "Brief Name of Object" },
      issue_detected: { type: Type.STRING, description: "Concise description of the issue" },
      importance: { type: Type.STRING, description: "Why this matters" },
      likely_causes: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "List of likely causes"
      },
      steps: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Step-by-step fixes or next actions"
      },
      estimation: {
        type: Type.OBJECT,
        properties: {
          price_range: { type: Type.STRING, description: `Price estimate in ${currency}` },
          time_estimate: { type: Type.STRING, description: "Time estimate to fix" },
          currency: { type: Type.STRING, description: "Currency code" }
        },
        required: ["price_range", "time_estimate", "currency"]
      },
      confidence_score: { type: Type.INTEGER, description: "Confidence score between 0 and 100" },
      safety_warning: { type: Type.STRING, description: "Warning text if dangerous, otherwise empty", nullable: true },
      product_search_query: { type: Type.STRING, description: "Search term for parts/tools, or empty if none", nullable: true }
    },
    required: ["object_name", "issue_detected", "importance", "likely_causes", "steps", "estimation", "confidence_score"]
  };

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: imageBase64
            }
          },
          {
            text: userPrompt
          }
        ]
      },
      config: {
        systemInstruction: `You are Context Lens. Analyze the photo/scene. Provide: what it is, likely causes, steps to fix, estimates in ${currency}, and product search queries. Be pragmatic and safety-conscious. Ensure estimates and product search terms are relevant to the local market associated with the currency (${currency}).`,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response text received from Gemini.");

    let parsedData: AnalysisResult;
    try {
        parsedData = JSON.parse(text);
    } catch(e) {
        console.error("JSON parse error", text);
        throw new Error("Invalid JSON received from Gemini.");
    }

    // Ensure nullable fields are handled gracefully
    if (!parsedData.safety_warning) parsedData.safety_warning = null;
    if (!parsedData.product_search_query) parsedData.product_search_query = null;

    return {
      data: parsedData,
      groundingSources: [], // Grounding not enabled for basic analysis to keep it fast and free
      rawText: text
    };

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(error.message || "Failed to analyze image with Gemini.");
  }
};