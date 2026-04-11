"use client";
import { useState } from "react";

interface Question {
  question: string;
  options: string[];
  answer: string;
}

export default function QuizSection({ questions }: { questions: Question[] }) {
  const [selected, setSelected] = useState<{ [key: number]: string }>({});
  const [submitted, setSubmitted] = useState(false);

  if (!questions || questions.length === 0) return null;

  const score = questions.filter((q, i) => selected[i] === q.answer).length;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-8 shadow-sm">
      <h3 className="font-bold text-gray-800 text-lg mb-5 flex items-center gap-2">
        🧠 Test Your Knowledge
      </h3>

      <div className="space-y-6">
        {questions.map((q, i) => (
          <div key={i}>
            <p className="font-medium text-gray-700 mb-3 text-sm">
              Q{i + 1}. {q.question}
            </p>
            <div className="grid gap-2">
              {q.options.map((opt) => {
                const letter = opt.charAt(0);
                const isSelected = selected[i] === letter;
                const isCorrect = letter === q.answer;

                let style = "border border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50";
                if (submitted) {
                  if (isCorrect) style = "border-2 border-green-500 bg-green-50 text-green-700 font-medium";
                  else if (isSelected && !isCorrect) style = "border-2 border-red-400 bg-red-50 text-red-600";
                  else style = "border border-gray-100 text-gray-400";
                } else if (isSelected) {
                  style = "border-2 border-blue-500 bg-blue-50 text-blue-700";
                }

                return (
                  <button
                    key={opt}
                    onClick={() => !submitted && setSelected({ ...selected, [i]: letter })}
                    className={`text-left px-4 py-2.5 rounded-xl text-sm transition-all ${style}`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {!submitted ? (
        <button
          onClick={() => setSubmitted(true)}
          disabled={Object.keys(selected).length < questions.length}
          className="mt-6 w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Submit Answers
        </button>
      ) : (
        <div className={`mt-6 p-4 rounded-xl text-center ${score === questions.length ? "bg-green-50" : score >= questions.length / 2 ? "bg-yellow-50" : "bg-red-50"}`}>
          <p className="text-2xl font-bold mb-1">
            {score}/{questions.length}
          </p>
          <p className="text-sm text-gray-600">
            {score === questions.length ? "🎉 Perfect score!" : score >= questions.length / 2 ? "👍 Good job! Review the ones you missed." : "📖 Review the article and try again!"}
          </p>
          <button
            onClick={() => { setSelected({}); setSubmitted(false); }}
            className="mt-3 text-blue-600 text-sm hover:underline"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
