import { GoogleGenAI } from "@google/genai";
import { AnalysisResult, FullAnalysisResponse, GroundingSource } from "../types";

const getSystemInstruction = (currency: string) => `
You are Context Lens, a concise, reliable, multimodal assistant. 
Your job is to analyze a photo of a physical object/scene and return clear, actionable context.
Provide: what the object/issue is, why it matters, likely causes, step-by-step fixes or next actions, estimated price or time to fix, and confidence level.

IMPORTANT:
1. The user's preferred currency is "${currency}". specificy price estimates in this currency (e.g. ${currency} 50-100).
2. If the issue requires a replacement part, tool, or specific product, generate a short, optimized "product_search_query" string that can be used on Google Shopping (e.g., "replacement hinge for IKEA PAX" or "multimeter 600v"). If no product is relevant, this can be null.

Be pragmatic: assume audience is a non-expert but curious user. 
Prioritize safety and do not provide instructions that require professional certification (e.g., electrical rewiring, surgery). When uncertain, say so and give safe alternatives.

Format your response strictly as a valid JSON object. 
Do not include markdown formatting like \`\`\`json ... \`\`\`.
Do not include comments (// or /* */) in the JSON.
Follow this schema exactly:
{
  "object_name": "Brief Name of Object",
  "issue_detected": "Concise description of the issue",
  "importance": "Why this matters",
  "likely_causes": ["Cause 1", "Cause 2"],
  "steps": ["Step 1", "Step 2", "Step 3"],
  "estimation": {
    "price_range": "50-100 ${currency}",
    "time_estimate": "1-2 hours",
    "currency": "${currency}"
  },
  "confidence_score": 90,
  "safety_warning": "Warning text if dangerous, or null",
  "product_search_query": "search term or null"
}
`;

export const analyzeImage = async (
  imageBase64: string,
  mimeType: string,
  note?: string,
  currency: string = "USD"
): Promise<FullAnalysisResponse> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY is not defined");
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const promptText = note
      ? `Analyze this image. Context note: "${note}". Return JSON only.`
      : `Analyze this image. Return JSON only.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: imageBase64,
            },
          },
          {
            text: promptText,
          },
        ],
      },
      config: {
        systemInstruction: getSystemInstruction(currency),
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "";
    let parsedData: AnalysisResult | null = null;

    try {
      // Pre-process: remove Markdown code blocks if present
      const cleanedText = text.replace(/```json\n?|```/g, '').trim();
      
      // Robust JSON extraction: find the first '{' and last '}'
      const startIndex = cleanedText.indexOf('{');
      const endIndex = cleanedText.lastIndexOf('}');
      
      if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
        const jsonString = cleanedText.substring(startIndex, endIndex + 1);
        parsedData = JSON.parse(jsonString);
      }
    } catch (e) {
      console.error("Failed to parse JSON response:", e);
      console.log("Raw response:", text);
    }

    // Extract grounding metadata
    const groundingSources: GroundingSource[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.web) {
          groundingSources.push({
            uri: chunk.web.uri,
            title: chunk.web.title,
          });
        }
      });
    }

    return {
      data: parsedData,
      groundingSources,
      rawText: text,
    };
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};