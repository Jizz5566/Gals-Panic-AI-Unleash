import { GoogleGenAI } from "@google/genai";
import { SearchResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const searchGameInfo = async (query: string): Promise<SearchResult> => {
  try {
    const modelId = "gemini-2.5-flash";
    
    // We use the googleSearch tool for grounding.
    // Note: responseMimeType and responseSchema are NOT allowed when using tools like googleSearch.
    const response = await ai.models.generateContent({
      model: modelId,
      contents: query,
      config: {
        systemInstruction: `You are an expert historian of retro arcade games, specifically knowledgeable about obscure Asian arcade titles from the 80s and 90s. 
        
        When asked about "Tian Can Bian" (天蠶變), explain:
        1. The gameplay mechanics (Qix-style area capturing).
        2. Its English equivalent (often Gals Panic or similar clones).
        3. The historical context (developed by Kaneko, etc.).
        4. The "revealing background" mechanic that made it famous/infamous, but keep descriptions encyclopedic and safe-for-work.
        
        Format the output with clear Markdown headings.`,
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "No detailed information found.";
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    return {
      text,
      groundingChunks,
    };
  } catch (error) {
    console.error("Gemini Search Error:", error);
    throw error;
  }
};