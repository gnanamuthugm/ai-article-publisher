"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface Comment {
  id: string;
  name: string;
  comment: string;
  created_at: string;
}

export default function CommentSection({ articleId }: { articleId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [supabaseReady, setSupabaseReady] = useState(false);

  useEffect(() => {
    if (supabaseUrl && supabaseKey && supabaseUrl !== "undefined") {
      setSupabaseReady(true);
      fetchComments();
    }
  }, []);

  const fetchComments = async () => {
    if (!supabaseUrl || supabaseUrl === "undefined") return;
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data } = await supabase
        .from("comments")
        .select("*")
        .eq("article_id", articleId)
        .order("created_at", { ascending: false });
      if (data) setComments(data);
    } catch (e) {}
  };

  const handleSubmit = async () => {
    if (!name.trim() || !text.trim()) return;
    setLoading(true);
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data } = await supabase
        .from("comments")
        .insert([{ article_id: articleId, name: name.trim(), comment: text.trim() }])
        .select();
      if (data) {
        setComments([data[0], ...comments]);
        setName("");
        setText("");
        setSubmitted(true);
        setTimeout(() => setSubmitted(false), 3000);
      }
    } catch (e) {}
    setLoading(false);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
      <h3 className="font-bold text-gray-800 text-lg mb-5 flex items-center gap-2">
        💬 Comments ({comments.length})
      </h3>

      {!supabaseReady ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 text-sm text-yellow-700">
          ⚠️ Comments will be enabled once Supabase is configured. Add your NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local
        </div>
      ) : (
        <div className="mb-6">
          <div className="grid gap-3 mb-3">
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400 w-full"
            />
            <textarea
              placeholder="Share your thoughts or questions..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400 w-full resize-none"
            />
          </div>
          {submitted && (
            <p className="text-green-600 text-sm mb-2">✅ Comment posted!</p>
          )}
          <button
            onClick={handleSubmit}
            disabled={loading || !name.trim() || !text.trim()}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            {loading ? "Posting..." : "Post Comment"}
          </button>
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">
            No comments yet. Be the first to comment!
          </p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="border-t border-gray-100 pt-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold">
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <span className="font-medium text-gray-700 text-sm">{c.name}</span>
                <span className="text-gray-400 text-xs">
                  {new Date(c.created_at).toLocaleDateString("en-IN", {
                    day: "numeric", month: "short", year: "numeric"
                  })}
                </span>
              </div>
              <p className="text-gray-600 text-sm pl-9">{c.comment}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
