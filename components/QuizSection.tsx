"use client";
import { useState } from "react";

interface Question {
  question: string;
  options: string[];
  answer: string;
}

interface QuizSectionProps {
  questions: Question[];
}

export default function QuizSection({ questions }: QuizSectionProps) {
  const [selected, setSelected] = useState<{ [key: number]: string }>({});
  const [submitted, setSubmitted] = useState(false);

  // Only show first 2 questions
  const quizQuestions = (questions || []).slice(0, 2);
  if (quizQuestions.length === 0) return null;

  const allAnswered = quizQuestions.every((_, i) => selected[i] !== undefined);
  const score = quizQuestions.filter((q, i) => selected[i] === q.answer).length;

  function getOptionStyle(qIndex: number, optionLetter: string) {
    const isSelected = selected[qIndex] === optionLetter;
    const isCorrect = optionLetter === quizQuestions[qIndex].answer;

    if (!submitted) {
      // Before submit: highlight selected only
      return isSelected
        ? "border-2 border-blue-500 bg-blue-50 text-blue-700 font-medium"
        : "border border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50 cursor-pointer";
    }

    // After submit: locked — show correct/wrong
    if (isCorrect) return "border-2 border-green-500 bg-green-50 text-green-700 font-semibold";
    if (isSelected && !isCorrect) return "border-2 border-red-400 bg-red-50 text-red-600";
    return "border border-gray-100 text-gray-400 cursor-not-allowed";
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-8 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
          🧠 Quick Knowledge Check
        </h3>
        {submitted && (
          <span
            className={`text-sm font-semibold px-3 py-1 rounded-full ${
              score === quizQuestions.length
                ? "bg-green-100 text-green-700"
                : score === 0
                ? "bg-red-100 text-red-700"
                : "bg-yellow-100 text-yellow-700"
            }`}
          >
            {score}/{quizQuestions.length} correct
          </span>
        )}
      </div>

      {/* Questions */}
      <div className="space-y-7">
        {quizQuestions.map((q, i) => (
          <div key={i}>
            <p className="font-semibold text-gray-800 mb-3 text-sm leading-snug">
              Q{i + 1}. {q.question}
            </p>
            <div className="grid gap-2">
              {q.options.map((opt, optIndex) => {
                const letter = ["A", "B", "C", "D"][optIndex]; // derive letter from index
                return (
                  <button
                    key={optIndex}
                    disabled={submitted}
                    onClick={() => {
                      if (!submitted) {
                        setSelected((prev) => ({ ...prev, [i]: letter }));
                      }
                    }}
                    className={`text-left px-4 py-3 rounded-xl text-sm transition-all ${getOptionStyle(i, letter)}`}
                  >
                    <span className="font-semibold mr-2">{letter}.</span>{opt}
                  </button>
                );
              })}
            </div>

            {/* Explanation after submit */}
            {submitted && (
              <div className="mt-3 text-xs text-gray-500 bg-gray-50 rounded-lg px-4 py-2">
                {selected[i] === q.answer ? (
                  <span className="text-green-600 font-medium">✓ Correct!</span>
                ) : (
                  <span className="text-red-500 font-medium">
                    ✗ Incorrect — correct answer is{" "}
                    <strong>{q.answer}</strong>
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Submit Button — only shown before submit */}
      {!submitted && (
        <button
          onClick={() => setSubmitted(true)}
          disabled={!allAnswered}
          className="mt-7 w-full bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {allAnswered ? "Submit Answers" : `Answer all ${quizQuestions.length} questions to submit`}
        </button>
      )}

      {/* Result — shown after submit, no retry */}
      {submitted && (
        <div
          className={`mt-6 p-4 rounded-xl text-center ${
            score === quizQuestions.length
              ? "bg-green-50 border border-green-200"
              : score === 0
              ? "bg-red-50 border border-red-200"
              : "bg-yellow-50 border border-yellow-200"
          }`}
        >
          <p className="text-lg font-bold mb-1">
            {score === quizQuestions.length
              ? "🎉 Perfect! You nailed it."
              : score === 1
              ? "👍 Good effort! Review the article again."
              : "📖 Read the article again and check back tomorrow!"}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Your answers are locked — come back tomorrow for a new article and quiz!
          </p>
        </div>
      )}
    </div>
  );
}
