import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export async function POST(req: NextRequest) {
  try {
    const { content, targetLang, targetLangLabel } = await req.json();

    if (!content || !targetLang) {
      return NextResponse.json({ error: "Missing content or targetLang" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
    }

    const client = new GoogleGenAI({ apiKey });

    const prompt = `Translate the following HTML blog article content to ${targetLangLabel} (language code: ${targetLang}).

IMPORTANT RULES:
1. Keep ALL HTML tags exactly as they are (<h2>, <p>, <ul>, <li>, <strong>, <em>, etc.)
2. Only translate the TEXT content inside the HTML tags
3. Keep technical terms like "Dialogflow CX", "CCAIP", "IVR", "NLP", "API", "CES", "NPS", "CSAT", "FCR", "AHT" in English
4. Make the translation natural and easy to understand for a beginner
5. Return ONLY the translated HTML - no explanation, no markdown fences

HTML to translate:
${content}`;

    // Use gemini-2.0-flash — stable, 1500 RPD free tier
    const response = await client.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });

    const rawText = response.text ?? content;

    const translated = rawText
      .trim()
      .replace(/^```html\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    return NextResponse.json({ translated });
  } catch (error: any) {
    console.error("Translation error:", error);
    return NextResponse.json(
      { error: error.message || "Translation failed" },
      { status: 500 }
    );
  }
}
