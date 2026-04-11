import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export async function POST(req: NextRequest) {
  try {
    const { comment } = await req.json();

    if (!comment) {
      return NextResponse.json({ error: "Missing comment" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
    }

    const client = new GoogleGenAI({ apiKey });

    const prompt = `Translate the following comment to English. 
If it is already in English, return it as-is.
Keep the meaning natural. Return ONLY the translated text, nothing else.

Comment: "${comment}"`;

    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const translated = response.text.trim();
    return NextResponse.json({ translated });
  } catch (error: any) {
    console.error("Comment translate error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
