import { NextRequest, NextResponse } from "next/server";

// Free translation using Google Translate (no API key needed)
// Uses the unofficial Google Translate endpoint
async function translateWithGoogle(text: string, targetLang: string): Promise<string> {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
  
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });
  
  if (!res.ok) throw new Error(`Translation failed: ${res.status}`);
  
  const data = await res.json();
  
  // Google Translate returns nested arrays — flatten and join
  let translated = '';
  if (Array.isArray(data) && Array.isArray(data[0])) {
    translated = data[0]
      .filter((item: any) => item && item[0])
      .map((item: any) => item[0])
      .join('');
  }
  
  return translated || text;
}

// Translate HTML while preserving tags
async function translateHTML(html: string, targetLang: string): Promise<string> {
  // Keep technical terms as-is
  const KEEP_TERMS = [
    'Dialogflow CX', 'Dialogflow ES', 'CCAIP', 'IVR', 'NLP', 'NLU', 'API',
    'CES', 'NPS', 'CSAT', 'FCR', 'AHT', 'SSML', 'TTS', 'STT', 'CRM',
    'Google Cloud', 'Gemini', 'BigQuery', 'Twilio', 'Genesys',
  ];

  // Split HTML into text segments and HTML tags
  const parts = html.split(/(<[^>]+>)/g);
  const translatedParts: string[] = [];

  for (const part of parts) {
    if (part.startsWith('<')) {
      // HTML tag — keep as-is
      translatedParts.push(part);
    } else if (part.trim()) {
      // Text content — translate
      try {
        let text = part;
        // Temporarily replace technical terms with placeholders
        const placeholders: Record<string, string> = {};
        KEEP_TERMS.forEach((term, i) => {
          if (text.includes(term)) {
            const key = `TERM${i}`;
            placeholders[key] = term;
            text = text.split(term).join(key);
          }
        });

        const translated = await translateWithGoogle(text, targetLang);

        // Restore technical terms
        let result = translated;
        Object.entries(placeholders).forEach(([key, val]) => {
          result = result.split(key).join(val);
        });

        translatedParts.push(result);
      } catch {
        translatedParts.push(part); // fallback to original
      }
    } else {
      translatedParts.push(part);
    }
  }

  return translatedParts.join('');
}

export async function POST(req: NextRequest) {
  try {
    const { content, targetLang } = await req.json();

    if (!content || !targetLang) {
      return NextResponse.json({ error: "Missing content or targetLang" }, { status: 400 });
    }

    // English — no translation needed
    if (targetLang === 'en') {
      return NextResponse.json({ translated: content });
    }

    const translated = await translateHTML(content, targetLang);
    return NextResponse.json({ translated });

  } catch (error: any) {
    console.error("Translation error:", error);
    return NextResponse.json(
      { error: error.message || "Translation failed" },
      { status: 500 }
    );
  }
}
