import { notFound } from "next/navigation";
import { SUPPORTED_LANGUAGES } from "@/lib/client-utils";
import articlesData from "@/data/articles.json";
import ArticleClient from "@/components/ArticleClient";

interface ArticlePageProps {
  params: Promise<{ lang: string; slug: string }>;
}

export async function generateStaticParams() {
  const langs = ["en", "ta", "hi", "te"];
  const params: { lang: string; slug: string }[] = [];
  for (const lang of langs) {
    for (const article of articlesData as any[]) {
      params.push({ lang, slug: article.slug });
    }
  }
  return params;
}

export async function generateMetadata({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = (articlesData as any[]).find(a => a.slug === slug);
  if (!article) return { title: "Article Not Found" };
  return {
    title: `${article.title} | CCAIP Daily`,
    description: article.summary,
    openGraph: {
      title: article.title,
      description: article.summary,
      images: [article.image],
    },
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { lang, slug } = await params;

  if (!SUPPORTED_LANGUAGES.includes(lang as any)) notFound();

  const article = (articlesData as any[]).find(a => a.slug === slug);
  if (!article) notFound();

  return <ArticleClient article={article} lang={lang} />;
}
