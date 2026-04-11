"use client";
import { useState, useRef, useEffect } from "react";

const LANGUAGES = [
  { code: "en", label: "English",    flag: "🇬🇧" },
  { code: "ta", label: "தமிழ்",      flag: "🇮🇳" },
  { code: "hi", label: "हिंदी",      flag: "🇮🇳" },
  { code: "te", label: "తెలుగు",     flag: "🇮🇳" },
  { code: "fr", label: "Français",   flag: "🇫🇷" },
  { code: "de", label: "Deutsch",    flag: "🇩🇪" },
  { code: "es", label: "Español",    flag: "🇪🇸" },
  { code: "ja", label: "日本語",     flag: "🇯🇵" },
  { code: "zh", label: "中文",       flag: "🇨🇳" },
  { code: "ar", label: "العربية",    flag: "🇸🇦" },
];

interface LanguageSwitcherProps {
  articleContent: string;         // full HTML content of the article
  onTranslated: (lang: string, translatedContent: string) => void;
  currentLang: string;
}

export default function LanguageSwitcher({
  articleContent,
  onTranslated,
  currentLang,
}: LanguageSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeLang, setActiveLang] = useState(currentLang || "en");
  const [cache, setCache] = useState<Record<string, string>>({ en: articleContent });
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function switchLanguage(langCode: string) {
    setOpen(false);
    if (langCode === activeLang) return;

    // If English or already cached — instant switch
    if (langCode === "en") {
      setActiveLang("en");
      onTranslated("en", cache["en"] || articleContent);
      return;
    }
    if (cache[langCode]) {
      setActiveLang(langCode);
      onTranslated(langCode, cache[langCode]);
      return;
    }

    // Translate via Gemini API
    setLoading(true);
    try {
      const langLabel = LANGUAGES.find(l => l.code === langCode)?.label || langCode;
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: articleContent,
          targetLang: langCode,
          targetLangLabel: langLabel,
        }),
      });

      if (!res.ok) throw new Error("Translation failed");
      const { translated } = await res.json();

      // Cache it
      setCache(prev => ({ ...prev, [langCode]: translated }));
      setActiveLang(langCode);
      onTranslated(langCode, translated);
    } catch (e) {
      console.error("Translation error:", e);
      alert("Translation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const active = LANGUAGES.find(l => l.code === activeLang);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        disabled={loading}
        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:border-blue-400 hover:text-blue-600 transition-all shadow-sm disabled:opacity-60"
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-blue-600">Translating...</span>
          </>
        ) : (
          <>
            <span>{active?.flag}</span>
            <span>{active?.label}</span>
            <svg
              className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 bg-white border border-gray-200 rounded-2xl shadow-xl py-2 min-w-[180px]">
          <p className="px-4 py-1 text-xs text-gray-400 font-medium uppercase tracking-wide">
            Choose Language
          </p>
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => switchLanguage(lang.code)}
              className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition-colors ${
                activeLang === lang.code
                  ? "bg-blue-50 text-blue-700 font-semibold"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <span className="text-base">{lang.flag}</span>
              <span>{lang.label}</span>
              {activeLang === lang.code && (
                <span className="ml-auto text-blue-500">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
