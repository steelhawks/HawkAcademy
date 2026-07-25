import React, { useState } from "react";

const DEFAULT_QUESTIONS = [
  {
    prompt: "What is the purpose of the `this` keyword in Java?",
    options: [
      "Refers to the current class's static methods",
      "Refers to the current object instance",
      "Creates a new object",
      "Imports a package",
    ],
    correct: 1,
    explanation:
      "`this` refers to the current instance of the object, letting you disambiguate instance fields from constructor/method parameters.",
  },
  {
    prompt: "Which access modifier makes a member visible only within its own class?",
    options: ["public", "protected", "package-private", "private"],
    correct: 3,
    explanation:
      "`private` restricts access to only the declaring class itself — no subclasses or other classes can see it.",
  },
  {
    prompt: "What does `extends` indicate in a class declaration?",
    options: [
      "The class implements an interface",
      "The class inherits from a superclass",
      "The class is abstract",
      "The class is final",
    ],
    correct: 1,
    explanation:
      "`extends` establishes an inheritance relationship — the subclass inherits fields and methods from the superclass.",
  },
];

const LABELS = ["A", "B", "C", "D"];

// Fisher-Yates shuffle — returns a new array, never mutates the input.
function shuffleArray(arr) {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Shuffles a single question's options and remaps `correct` to point at
// the same option's new position, so the answer stays correct after shuffling.
function shuffleQuestion(question) {
  const order = shuffleArray(question.options.map((_, i) => i));
  return {
    ...question,
    options: order.map((originalIndex) => question.options[originalIndex]),
    correct: order.indexOf(question.correct),
  };
}

function shuffleQuestions(questions) {
  return questions.map(shuffleQuestion);
}

const quizStyles = `
  @keyframes quiz-fade-up {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .quiz-option {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    text-align: left;
    padding: 11px 14px;
    border-radius: 8px;
    border: 1px solid var(--ifm-color-emphasis-200, #e5e7eb);
    background: transparent;
    color: var(--ifm-font-color-base);
    font-size: 14.5px;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s, transform 0.1s;
    font-family: inherit;
    line-height: 1.5;
  }
  .quiz-option:not(:disabled):hover {
    border-color: var(--ifm-color-primary);
    background: var(--ifm-color-primary-lightest, #eff6ff);
    transform: translateX(3px);
  }
  .quiz-option:disabled { cursor: default; }
  .quiz-option.correct {
    border-color: #22c55e;
    background: #f0fdf4;
    color: #15803d;
  }
  .quiz-option.wrong {
    border-color: #ef4444;
    background: #fef2f2;
    color: #b91c1c;
  }
  .quiz-option.dimmed {
    border-color: var(--ifm-color-emphasis-200, #e5e7eb);
    color: var(--ifm-color-emphasis-400, #9ca3af);
    opacity: 0.5;
  }
  .quiz-badge {
    flex-shrink: 0;
    width: 26px;
    height: 26px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 500;
    background: var(--ifm-color-emphasis-100, #f3f4f6);
    color: var(--ifm-color-emphasis-600, #6b7280);
    transition: background 0.15s, color 0.15s;
  }
  .quiz-option.correct .quiz-badge { background: #dcfce7; color: #16a34a; }
  .quiz-option.wrong   .quiz-badge { background: #fee2e2; color: #dc2626; }
  .quiz-option.dimmed  .quiz-badge { opacity: 0.5; }
  .quiz-explanation {
    animation: quiz-fade-up 0.25s ease forwards;
  }
  .quiz-next {
    padding: 9px 22px;
    border-radius: 8px;
    border: none;
    background: var(--ifm-color-primary);
    color: #fff;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    font-family: inherit;
    transition: opacity 0.15s, transform 0.1s;
  }
  .quiz-next:hover  { opacity: 0.85; transform: translateY(-1px); }
  .quiz-next:active { transform: scale(0.97); }
  .quiz-retry {
    padding: 9px 24px;
    border-radius: 8px;
    border: 1.5px solid var(--ifm-color-primary);
    background: transparent;
    color: var(--ifm-color-primary);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    font-family: inherit;
    transition: background 0.15s;
  }
  .quiz-retry:hover { background: var(--ifm-color-primary-lightest, #eff6ff); }

  [data-theme='dark'] .quiz-option.correct { border-color: #22c55e; background: #052e16; color: #86efac; }
  [data-theme='dark'] .quiz-option.wrong   { border-color: #ef4444; background: #450a0a; color: #fca5a5; }
  [data-theme='dark'] .quiz-option.correct .quiz-badge { background: #14532d; color: #4ade80; }
  [data-theme='dark'] .quiz-option.wrong   .quiz-badge { background: #7f1d1d; color: #f87171; }
`;

function ScoreRing({ pct }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const color = pct >= 80 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <svg width="110" height="110" viewBox="0 0 110 110" style={{ display: "block", margin: "0 auto" }}>
      <circle cx="55" cy="55" r={r} fill="none" stroke="var(--ifm-color-emphasis-200,#e5e7eb)" strokeWidth="8" />
      <circle
        cx="55" cy="55" r={r}
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 55 55)"
        style={{ transition: "stroke-dasharray 0.7s cubic-bezier(.4,0,.2,1)" }}
      />
      <text x="55" y="61" textAnchor="middle" fontSize="22" fontWeight="600" fill={color}>
        {pct}%
      </text>
    </svg>
  );
}

function QuizQuestion({ question, index, total, onAnswer }) {
  const [selected, setSelected] = useState(null);

  const choose = (i) => {
    if (selected !== null) return;
    setSelected(i);
    onAnswer(i === question.correct);
  };

  const isCorrect = selected !== null && selected === question.correct;

  const optionClass = (i) => {
    if (selected === null) return "quiz-option";
    if (i === question.correct) return "quiz-option correct";
    if (i === selected) return "quiz-option wrong";
    return "quiz-option dimmed";
  };

  return (
    <div>
      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <span style={{
          fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em",
          textTransform: "uppercase", color: "var(--ifm-color-emphasis-500,#9ca3af)"
        }}>
          Question {index + 1} / {total}
        </span>
        <span style={{ display: "flex", gap: "5px", alignItems: "center" }}>
          {Array.from({ length: total }, (_, i) => (
            <span key={i} style={{
              width: i === index ? "18px" : "7px",
              height: "7px",
              borderRadius: "4px",
              background: i <= index ? "var(--ifm-color-primary)" : "var(--ifm-color-emphasis-200,#e5e7eb)",
              transition: "width 0.3s ease, background 0.3s ease",
            }} />
          ))}
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ height: "2px", borderRadius: "2px", background: "var(--ifm-color-emphasis-100,#f3f4f6)", marginBottom: "1.4rem" }}>
        <div style={{
          height: "100%",
          width: `${((index + 1) / total) * 100}%`,
          background: "var(--ifm-color-primary)",
          borderRadius: "2px",
          transition: "width 0.4s ease",
        }} />
      </div>

      {/* Question */}
      <p style={{ fontSize: "16px", fontWeight: 500, margin: "0 0 1.1rem", lineHeight: 1.65, color: "var(--ifm-font-color-base)" }}>
        {question.prompt}
      </p>

      {/* Options */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "1rem" }}>
        {question.options.map((opt, i) => (
          <button key={i} className={optionClass(i)} onClick={() => choose(i)} disabled={selected !== null}>
            <span className="quiz-badge">{LABELS[i]}</span>
            <span style={{ flex: 1 }}>{opt}</span>
            {selected !== null && i === question.correct && (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                <path d="M3 8.5l3.5 3.5 6.5-7" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
            {selected !== null && i === selected && i !== question.correct && (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                <path d="M4 4l8 8M12 4l-8 8" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            )}
          </button>
        ))}
      </div>

      {/* Explanation */}
      {selected !== null && (
        <div className="quiz-explanation" style={{
          padding: "12px 16px",
          borderRadius: "8px",
          borderLeft: `3px solid ${isCorrect ? "#22c55e" : "#ef4444"}`,
          background: isCorrect
            ? "var(--ifm-color-success-contrast-background, #f0fdf4)"
            : "var(--ifm-color-danger-contrast-background,  #fef2f2)",
          fontSize: "14px",
          lineHeight: 1.7,
          color: "var(--ifm-font-color-base)",
        }}>
          <span style={{ fontWeight: 600, color: isCorrect ? "#15803d" : "#b91c1c" }}>
            {isCorrect ? "Correct! " : "Not quite. "}
          </span>
          {question.explanation}
        </div>
      )}
    </div>
  );
}

export default function Quiz({ questions: baseQuestions = DEFAULT_QUESTIONS }) {
  // Re-shuffling both the question order and each question's options every
  // time the quiz is (re)started means a user retrying the quiz — or just
  // reloading the page — never sees the same answer layout twice.
  const [qs, setQs] = useState(() => shuffleQuestions(shuffleArray(baseQuestions)));
  const [current, setCurrent]             = useState(0);
  const [score, setScore]                 = useState(0);
  const [done, setDone]                   = useState(false);
  const [answeredCurrent, setAnsweredCurrent] = useState(false);

  const handleAnswer = (correct) => {
    if (correct) setScore((s) => s + 1);
    setAnsweredCurrent(true);
  };

  const next = () => {
    if (current + 1 >= qs.length) {
      setDone(true);
    } else {
      setCurrent((c) => c + 1);
      setAnsweredCurrent(false);
    }
  };

  const reset = () => {
    setQs(shuffleQuestions(shuffleArray(baseQuestions)));
    setCurrent(0);
    setScore(0);
    setDone(false);
    setAnsweredCurrent(false);
  };

  const pct     = Math.round((score / qs.length) * 100);
  const verdict = pct >= 80 ? "Great work!" : pct >= 50 ? "Good effort." : "Keep studying.";

  return (
    <>
      <style>{quizStyles}</style>
      <div style={{
        border: "1px solid var(--ifm-color-emphasis-200,#e5e7eb)",
        borderRadius: "12px",
        padding: "1.75rem",
        margin: "1.5rem 0",
        background: "var(--ifm-card-background-color, var(--ifm-background-surface-color))",
      }}>
        {!done ? (
          <>
            <QuizQuestion
              key={current}
              question={qs[current]}
              index={current}
              total={qs.length}
              onAnswer={handleAnswer}
            />
            {answeredCurrent && (
              <div style={{ marginTop: "1.25rem", display: "flex", justifyContent: "flex-end" }}>
                <button className="quiz-next" onClick={next}>
                  {current + 1 < qs.length ? "Next question →" : "See results →"}
                </button>
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "0.75rem 0 0.25rem", animation: "quiz-fade-up 0.3s ease forwards" }}>
            <ScoreRing pct={pct} />
            <p style={{ fontSize: "20px", fontWeight: 500, margin: "1rem 0 4px", color: "var(--ifm-font-color-base)" }}>
              {verdict}
            </p>
            <p style={{ fontSize: "14px", color: "var(--ifm-color-emphasis-600,#6b7280)", margin: "0 0 1.5rem" }}>
              {score} of {qs.length} correct
            </p>
            <button className="quiz-retry" onClick={reset}>Try again</button>
          </div>
        )}
      </div>
    </>
  );
}