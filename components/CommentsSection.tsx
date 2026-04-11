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

// ── LocalStorage helpers — track which comments THIS browser posted ──
const STORAGE_KEY = "my_comment_ids";

function getMyCommentIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function addMyCommentId(id: string) {
  try {
    const ids = getMyCommentIds();
    ids.add(id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {}
}

function removeMyCommentId(id: string) {
  try {
    const ids = getMyCommentIds();
    ids.delete(id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {}
}

// ── Single Comment Card ──
function CommentCard({
  c,
  isOwner,
  onEdit,
  onDelete,
}: {
  c: Comment;
  isOwner: boolean;
  onEdit: (c: Comment) => void;
  onDelete: (c: Comment) => void;
}) {
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
        {/* Avatar */}
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
              {/* "You" badge for own comments */}
              {isOwner && (
                <span className="text-xs bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded-full font-medium">You</span>
              )}
            </div>

            {/* Edit / Delete — only for own comments */}
            {isOwner && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onEdit(c)}
                  className="text-xs text-blue-400 hover:text-blue-600 transition-colors flex items-center gap-1"
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => onDelete(c)}
                  className="text-xs text-red-400 hover:text-red-600 transition-colors flex items-center gap-1"
                >
                  🗑️ Delete
                </button>
              </div>
            )}
          </div>

          <p className="text-gray-700 text-sm leading-relaxed mb-2">{displayText}</p>

          {/* Translate button */}
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
                <>🌐 {translated ? (showOriginal ? "Show translation" : "Show original") : "Translate to English"}</>
              )}
            </button>
            {isTranslated && <span className="text-xs text-blue-400 italic">— Translated</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Comments Section ──
export default function CommentsSection({ articleSlug, className = "" }: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [myCommentIds, setMyCommentIds] = useState<Set<string>>(new Set());
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Edit state
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [editText, setEditText] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Delete confirm state
  const [deletingComment, setDeletingComment] = useState<Comment | null>(null);
  const [deleting, setDeleting] = useState(false);

  const supabaseReady = !!(
    supabaseUrl && supabaseKey &&
    supabaseUrl !== "undefined" && supabaseUrl.startsWith("https://")
  );

  // Load localStorage on mount (client only)
  useEffect(() => {
    setMyCommentIds(getMyCommentIds());
  }, []);

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

      if (error) console.error("Supabase fetch error:", error.message);
      else if (data) setComments(data);
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
      const { data, error } = await getSupabase()
        .from("comments")
        .insert({ article_id: articleSlug, name: name.trim(), comment: text.trim() })
        .select("id, article_id, name, comment, created_at, updated_at")
        .single();

      if (error) {
        setSubmitError(`Failed to post: ${error.message}`);
      } else if (data) {
        // Save this comment's ID to localStorage — marks it as "mine"
        addMyCommentId(data.id);
        setMyCommentIds(getMyCommentIds());

        setComments(prev => [data, ...prev]);
        setText("");
        setSuccessMsg("✅ Comment posted!");
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch (e: any) {
      setSubmitError("Something went wrong. Please try again.");
    }
    setSubmitting(false);
  }

  // ── Edit ──
  function startEdit(c: Comment) {
    setEditingComment(c);
    setEditText(c.comment);
    setDeletingComment(null);
  }

  function cancelEdit() {
    setEditingComment(null);
    setEditText("");
  }

  async function saveEdit() {
    if (!editingComment || !editText.trim()) return;
    setEditSaving(true);
    const now = new Date().toISOString();
    try {
      const { data, error } = await getSupabase()
        .from("comments")
        .update({ comment: editText.trim(), updated_at: now })
        .eq("id", editingComment.id)
        .select("id, article_id, name, comment, created_at, updated_at")
        .single();

      if (error) {
        console.error("Supabase update error:", error.message);
      } else if (data) {
        // Log the edit to commentlog
        await getSupabase().from("commentlog").insert({
          comment_id: editingComment.id,
          article_id: articleSlug,
          user_name: editingComment.name,
          action: "edit",
          old_content: editingComment.comment,
          new_content: editText.trim(),
          edited_at: now,
        });

        setComments(prev => prev.map(c => c.id === editingComment.id ? data : c));
        cancelEdit();
      }
    } catch (e: any) {
      console.error("edit exception:", e.message);
    }
    setEditSaving(false);
  }

  // ── Delete ──
  function startDelete(c: Comment) {
    setDeletingComment(c);
    setEditingComment(null);
  }

  function cancelDelete() {
    setDeletingComment(null);
  }

  async function confirmDelete() {
    if (!deletingComment) return;
    setDeleting(true);
    const now = new Date().toISOString();
    try {
      // Log deletion first
      await getSupabase().from("commentlog").insert({
        comment_id: deletingComment.id,
        article_id: articleSlug,
        user_name: deletingComment.name,
        action: "delete",
        old_content: deletingComment.comment,
        new_content: null,
        edited_at: now,
      });

      const { error } = await getSupabase()
        .from("comments")
        .delete()
        .eq("id", deletingComment.id);

      if (!error) {
        // Remove from localStorage
        removeMyCommentId(deletingComment.id);
        setMyCommentIds(getMyCommentIds());

        setComments(prev => prev.filter(c => c.id !== deletingComment.id));
        cancelDelete();
      }
    } catch (e: any) {
      console.error("delete exception:", e.message);
    }
    setDeleting(false);
  }

  return (
    <div className={className}>
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <h3 className="font-bold text-gray-800 text-lg mb-6 flex items-center gap-2">
          💬 Comments
          {!loading && <span className="text-sm font-normal text-gray-400">({comments.length})</span>}
        </h3>

        {!supabaseReady ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-700">
            ⚠️ Comments require Supabase configuration.
          </div>
        ) : (
          <>
            {/* ── Comment Form ── */}
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

            {/* ── Edit Panel ── */}
            {editingComment && (
              <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-blue-700 mb-1">✏️ Edit your comment</p>
                <p className="text-xs text-gray-400 mb-3">Original: &quot;{editingComment.comment}&quot;</p>
                <textarea
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  rows={3}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full resize-none focus:outline-none focus:border-blue-400 bg-white"
                />
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={saveEdit}
                    disabled={editSaving || !editText.trim()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors"
                  >
                    {editSaving ? "Saving..." : "Save Changes"}
                  </button>
                  <button onClick={cancelEdit} className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* ── Delete Confirm Panel ── */}
            {deletingComment && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-red-700 mb-1">🗑️ Delete this comment?</p>
                <p className="text-xs text-gray-500 mb-4 bg-white rounded-lg p-3 border border-red-100">
                  &quot;{deletingComment.comment}&quot;
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={confirmDelete}
                    disabled={deleting}
                    className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-40 transition-colors"
                  >
                    {deleting ? "Deleting..." : "Yes, Delete"}
                  </button>
                  <button onClick={cancelDelete} className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* ── Comments List ── */}
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
                  <CommentCard
                    key={c.id}
                    c={c}
                    isOwner={myCommentIds.has(c.id)}
                    onEdit={startEdit}
                    onDelete={startDelete}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
