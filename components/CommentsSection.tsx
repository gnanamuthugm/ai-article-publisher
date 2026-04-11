"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function getSupabase() {
  return createClient(supabaseUrl, supabaseKey);
}

interface Comment {
  id: string;
  article_id: string;
  name: string;
  comment: string;
  created_at: string;
  updated_at: string | null;
}

interface CommentsSectionProps {
  articleSlug: string;
  className?: string;
}

function formatDate(ts: string) {
  return new Date(ts).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function getInitial(name: string) {
  return name.charAt(0).toUpperCase();
}

// ── Single comment card with translate button ──
function CommentCard({ c, onEdit }: { c: Comment; onEdit: (c: Comment) => void }) {
  const [translating, setTranslating] = useState(false);
  const [translated, setTranslated] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);

  async function handleTranslate() {
    if (translated) {
      setShowOriginal(prev => !prev);
      return;
    }
    setTranslating(true);
    try {
      const res = await fetch("/api/translate-comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: c.comment }),
      });
      const data = await res.json();
      setTranslated(data.translated ?? c.comment);
      setShowOriginal(false);
    } catch (e) {
      console.error("Translate error:", e);
    }
    setTranslating(false);
  }

  const displayText = translated && !showOriginal ? translated : c.comment;
  const isTranslated = !!(translated && !showOriginal);

  return (
    <div className="border-t border-gray-100 pt-5">
      <div className="flex gap-3">
        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-sm font-bold flex-shrink-0">
          {getInitial(c.name)}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between flex-wrap gap-1 mb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-800 text-sm">{c.name}</span>
              <span className="text-gray-400 text-xs">{formatDate(c.created_at)}</span>
              {c.updated_at && (
                <span className="text-gray-300 text-xs italic">(edited)</span>
              )}
            </div>
            <button
              onClick={() => onEdit(c)}
              className="text-xs text-blue-400 hover:text-blue-600 hover:underline transition-colors"
            >
              ✏️ Edit
            </button>
          </div>
          <p className="text-gray-700 text-sm leading-relaxed mb-2">{displayText}</p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleTranslate}
              disabled={translating}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-blue-600 transition-colors disabled:opacity-50"
            >
              {translating ? (
                <>
                  <span className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin" />
                  Translating...
                </>
              ) : (
                <>
                  🌐{" "}
                  {translated
                    ? showOriginal ? "Show translation" : "Show original"
                    : "Translate to English"}
                </>
              )}
            </button>
            {isTranslated && (
              <span className="text-xs text-blue-400 italic">— Translated</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Comments Section ──
export default function CommentsSection({ articleSlug, className = "" }: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [editText, setEditText] = useState("");
  const [editName, setEditName] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const supabaseReady = !!(
    supabaseUrl &&
    supabaseKey &&
    supabaseUrl !== "undefined" &&
    supabaseUrl.startsWith("https://")
  );

  useEffect(() => {
    if (supabaseReady) fetchComments();
    else setLoading(false);
  }, [articleSlug]);

  async function fetchComments() {
    setLoading(true);
    try {
      const { data, error } = await getSupabase()
        .from("comments")
        .select("id, article_id, name, comment, created_at, updated_at")
        .eq("article_id", articleSlug)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Supabase fetch error:", error.message);
      } else if (data) {
        setComments(data);
      }
    } catch (e: any) {
      console.error("fetchComments exception:", e.message);
    }
    setLoading(false);
  }

  async function handleSubmit() {
    if (!name.trim() || !text.trim()) return;
    setSubmitting(true);
    setSubmitError("");

    try {
      // Insert WITHOUT updated_at — let Supabase default handle it
      const { data, error } = await getSupabase()
        .from("comments")
        .insert({
          article_id: articleSlug,
          name: name.trim(),
          comment: text.trim(),
        })
        .select("id, article_id, name, comment, created_at, updated_at")
        .single();

      if (error) {
        console.error("Supabase insert error:", error.message, error.details);
        setSubmitError(`Failed to post: ${error.message}`);
      } else if (data) {
        setComments(prev => [data, ...prev]);
        setName("");
        setText("");
        setSuccessMsg("✅ Comment posted!");
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch (e: any) {
      console.error("submit exception:", e.message);
      setSubmitError("Something went wrong. Please try again.");
    }
    setSubmitting(false);
  }

  function startEdit(c: Comment) {
    setEditingComment(c);
    setEditText(c.comment);
    setEditName(c.name);
  }

  function cancelEdit() {
    setEditingComment(null);
    setEditText("");
    setEditName("");
  }

  async function saveEdit() {
    if (!editingComment || !editText.trim() || !editName.trim()) return;
    setEditSaving(true);
    try {
      const { data, error } = await getSupabase()
        .from("comments")
        .update({
          comment: editText.trim(),
          name: editName.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingComment.id)
        .select("id, article_id, name, comment, created_at, updated_at")
        .single();

      if (error) {
        console.error("Supabase update error:", error.message);
      } else if (data) {
        setComments(prev => prev.map(c => c.id === editingComment.id ? data : c));
        cancelEdit();
      }
    } catch (e: any) {
      console.error("edit exception:", e.message);
    }
    setEditSaving(false);
  }

  return (
    <div className={className}>
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <h3 className="font-bold text-gray-800 text-lg mb-6 flex items-center gap-2">
          💬 Comments
          {!loading && (
            <span className="text-sm font-normal text-gray-400">({comments.length})</span>
          )}
        </h3>

        {!supabaseReady ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-700">
            ⚠️ Comments require Supabase configuration.
          </div>
        ) : (
          <>
            {/* Comment Form */}
            <div className="mb-8 bg-gray-50 rounded-xl p-4 border border-gray-100">
              <p className="text-sm font-semibold text-gray-700 mb-3">
                💬 Leave a comment — in any language!
              </p>
              <div className="grid gap-3">
                <input
                  type="text"
                  placeholder="Your name *"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400 w-full bg-white"
                />
                <textarea
                  placeholder="Share your thoughts in any language..."
                  value={text}
                  onChange={e => setText(e.target.value)}
                  rows={3}
                  className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400 w-full resize-none bg-white"
                />
              </div>
              {successMsg && <p className="text-green-600 text-sm mt-2">{successMsg}</p>}
              {submitError && <p className="text-red-500 text-sm mt-2">❌ {submitError}</p>}
              <button
                onClick={handleSubmit}
                disabled={submitting || !name.trim() || !text.trim()}
                className="mt-3 bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? "Posting..." : "Post Comment"}
              </button>
            </div>

            {/* Edit Panel */}
            {editingComment && (
              <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-blue-700 mb-3">✏️ Editing your comment</p>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full mb-2 focus:outline-none focus:border-blue-400 bg-white"
                  placeholder="Your name"
                />
                <textarea
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  rows={3}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full resize-none focus:outline-none focus:border-blue-400 bg-white"
                />
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={saveEdit}
                    disabled={editSaving || !editText.trim() || !editName.trim()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors"
                  >
                    {editSaving ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Comments List */}
            {loading ? (
              <div className="space-y-4">
                {[1, 2].map(i => (
                  <div key={i} className="animate-pulse flex gap-3">
                    <div className="w-9 h-9 rounded-full bg-gray-200 flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-gray-200 rounded w-1/4" />
                      <div className="h-3 bg-gray-200 rounded w-full" />
                      <div className="h-3 bg-gray-200 rounded w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : comments.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-6">
                No comments yet — be the first! (Any language welcome 🌐)
              </p>
            ) : (
              <div className="space-y-0">
                {comments.map(c => (
                  <CommentCard key={c.id} c={c} onEdit={startEdit} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
