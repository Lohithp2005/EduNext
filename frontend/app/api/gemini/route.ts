import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GENAI_API_KEY!,
});

export async function POST(req: NextRequest) {
  try {
    const { prompt, image } = await req.json();

    if (!prompt) {
      return NextResponse.json({ ai_text: "No prompt provided" }, { status: 400 });
    }

    if (!process.env.GENAI_API_KEY) {
      console.error("GENAI_API_KEY is not set in environment variables");
      return NextResponse.json({ ai_text: "API key not configured" }, { status: 500 });
    }

    let result;

    // If image is provided, use vision model
    if (image) {
      result = await ai.models.generateContent({
        model: "gemini-2.5-flash", // Vision-capable model
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: image // base64 string without prefix
                }
              },
              { text: prompt }
            ]
          }
        ]
      });
    } else {
      // Text-only request
      result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });
    }

    return NextResponse.json({ ai_text: result.text });
  } catch (err: any) {
    console.error("Gemini API Error:", err);
    console.error("Error details:", err.message, err.stack);
    return NextResponse.json({ 
      ai_text: "Error contacting AI",
      error: err.message 
    }, { status: 500 });
  }
}