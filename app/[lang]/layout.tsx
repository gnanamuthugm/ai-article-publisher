import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SUPPORTED_LANGUAGES } from "@/lib/client-utils";
import "../globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  return {
    title: "Learn Daily — One Concept a Day by Gnanamuthu G",
    description:
      "Master Dialogflow CX, Conversational AI, CES, and CCAIP — one article every morning by Gnanamuthu G. Real examples, quizzes, and expert insights.",
  };
}

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  if (!SUPPORTED_LANGUAGES.includes(lang as any)) return null;

  return (
    <div className="min-h-full flex flex-col">
      {children}
    </div>
  );
}
