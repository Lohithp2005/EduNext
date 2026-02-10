"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { RefreshCw, CheckCircle2, XCircle, ArrowRight } from "lucide-react";

/* ---------------- TYPES ---------------- */
type QuizQuestion = {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
  character: string;
  images?: string[];
};

type Cartoon = {
  name: string;
  image: string;
};

/* ---------------- CARTOONS ---------------- */
const CARTOONS: Cartoon[] = [
  { name: "Doraemon", image: "/doraemon.jpg" },
  { name: "Shin Chan", image: "/shinchan_2.jpg" },
  { name: "Oggy and the cockroaches", image: "/oggy.jpg" },
  { name: "Mr.Bean", image: "/mrbean.jpg" },
  { name: "Tom and Jerry", image: "/tom_and_jerry.jpg" },
];

/* ---------------- LOCAL STORAGE KEYS ---------------- */
const LOCAL_KEYS = {
  topic: "lastTheoryTopic",
  theory: "lastTheory",
};

export default function CartoonQuiz() {
  const searchParams = useSearchParams();
  const topicFromUrl = searchParams.get("topic");
  const fromCourse = searchParams.get("from") === "course";

  const [selectedCartoon, setSelectedCartoon] = useState<Cartoon | null>(null);
  const [topic, setTopic] = useState("");
  const [theoryContent, setTheoryContent] = useState("");
  const [isTheoryMode, setIsTheoryMode] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [score, setScore] = useState(0);

  /* ---------------- RESTORE LOCAL STORAGE ---------------- */
  useEffect(() => {
    const savedTopic = localStorage.getItem(LOCAL_KEYS.topic) || "";
    const savedTheory = localStorage.getItem(LOCAL_KEYS.theory) || "";

    if (fromCourse && savedTopic && savedTheory) {
      setIsTheoryMode(true);
      setTopic(savedTopic);
      setTheoryContent(savedTheory);
      return;
    }

    if (topicFromUrl) {
      setIsTheoryMode(false);
      setTopic(topicFromUrl);
      setTheoryContent("");
      return;
    }

    setIsTheoryMode(false);
    setTopic("");
    setTheoryContent(savedTheory);
  }, [topicFromUrl, fromCourse]);

  /* ---------------- AUTO SAVE LOCAL STORAGE ---------------- */
  useEffect(() => {
    if (topic.trim()) localStorage.setItem(LOCAL_KEYS.topic, topic);
    else localStorage.removeItem(LOCAL_KEYS.topic);
  }, [topic]);

  useEffect(() => {
    if (theoryContent.trim()) localStorage.setItem(LOCAL_KEYS.theory, theoryContent);
    else localStorage.removeItem(LOCAL_KEYS.theory);
  }, [theoryContent]);

  /* ---------------- IMAGE URL FIX ---------------- */
  const resolveImageUrl = (raw?: string) => {
    if (!raw) return "";
    if (raw.startsWith("http")) return raw;

    const base =
      ["localhost", "127.0.0.1"].includes(window.location.hostname)
        ? process.env.NEXT_PUBLIC_API_LOCAL || "http://localhost:8000"
        : process.env.NEXT_PUBLIC_API_TUNNEL || "http://localhost:8000";

    return `${base.replace(/\/$/, "")}/${raw.replace(/^\//, "")}`;
  };

  /* ---------------- FETCH QUESTION ---------------- */
  const generateQuestion = async () => {
    if (!selectedCartoon) {
      setError("Please select a cartoon first!");
      return;
    }

    if (!topic.trim()) {
      setError("Topic missing!");
      return;
    }

    setLoading(true);
    setSelectedOption(null);
    setError("");

    try {
      const API_BASE_URL =
        ["localhost", "127.0.0.1"].includes(window.location.hostname)
          ? process.env.NEXT_PUBLIC_API_LOCAL || "http://localhost:8000"
          : process.env.NEXT_PUBLIC_API_TUNNEL || "http://localhost:8000";

      const res = await fetch(`${API_BASE_URL}/api/generate-quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          character: selectedCartoon.name,
          theoryContent: isTheoryMode ? theoryContent : undefined,
        }),
      });

      if (!res.ok) throw new Error("Backend failed");

      const data = (await res.json()) as any;

      if (data.error) {
        setError(data.error);
        return;
      }

      setCurrentQuestion(data);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to generate question. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- ANSWER HANDLER ---------------- */
  const handleAnswer = (opt: string) => {
    if (!currentQuestion || selectedOption) return;
    setSelectedOption(opt);
    if (opt === currentQuestion.answer) setScore((s) => s + 1);
  };

  /* ---------------- RESET ---------------- */
  const handleRestart = () => {
    setSelectedCartoon(null);
    if (!isTheoryMode) setTopic("");
    setTheoryContent("");
    setCurrentQuestion(null);
    setSelectedOption(null);
    setError("");
    setScore(0);

    localStorage.removeItem(LOCAL_KEYS.topic);
    localStorage.removeItem(LOCAL_KEYS.theory);
  };

  /* ---------------- UI ---------------- */
  return (
    <div className="min-h-screen p-8 overflow-x-hidden">
      {/* Header */}
      <div className="relative mb-8">
        <h1 className="text-4xl text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
          Cartoon Quiz
        </h1>
        {currentQuestion && (
          <div className="w-full flex md:block">
            <div className="md:absolute md:top-0 md:right-0 w-full md:w-auto text-xl font-bold text-purple-600 px-4 py-2 rounded-lg shadow-md md:bg-purple-200/50 md:rounded-2xl md:shadow-none text-center md:text-right mt-2 md:mt-0">
              Score: {score}
            </div>
          </div>
        )}
      </div>

      {/* ---------- CHARACTER SELECTION ---------- */}
      {!currentQuestion && !loading && (
        <div className="space-y-6">
          <h2 className="text-2xl text-center text-purple-700 mb-6">
            Choose your cartoon character
          </h2>

          <div className="flex flex-wrap justify-center gap-6 mb-8">
            {CARTOONS.map((cartoon) => (
              <button
                key={cartoon.name}
                onClick={() => setSelectedCartoon(cartoon)}
                className="p-0"
              >
                <Image
                  src={cartoon.image}
                  alt={cartoon.name}
                  width={200}
                  height={200}
                  className="object-cover rounded-lg hover:scale-105 transition-transform duration-300"
                  priority
                />
              </button>
            ))}
          </div>

          {/* -------- TOPIC / THEORY TEXT -------- */}
          {isTheoryMode ? (
            <div className="text-center mb-4">
              <p className="text-purple-700 font-semibold text-lg">
                From your learning topic
              </p>
              <p className="text-purple-900 font-bold text-xl mt-1">{topic}</p>
            </div>
          ) : topicFromUrl ? (
            <div className="text-center mb-4">
              <p className="text-purple-700 font-semibold text-lg">
                From your learning topic
              </p>
              <p className="text-purple-900">
                Topic: <span className="font-bold">{topic}</span>
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-6 w-full">
              <div className="w-full flex flex-col items-center">
                <label className="block text-lg font-semibold text-purple-700 text-center mb-2">
                  Enter topic
                </label>
                <input
                  type="text"
                  placeholder="e.g. Water cycle, Fractions, Photosynthesis..."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-1/2 p-4 border-2 border-purple-300 rounded-2xl bg-white focus:outline-none text-lg"
                />
              </div>
            </div>
          )}

          {/* Start Button */}
          <div className="flex justify-center w-full">
            <button
              onClick={generateQuestion}
              disabled={!selectedCartoon}
              className="w-1/2 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-4 px-6 rounded-2xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <ArrowRight className="w-6 h-6" />
              Start Quiz
            </button>
          </div>

          {error && (
            <div className="bg-red-100 border-2 border-red-300 text-red-700 p-4 rounded-2xl font-semibold text-center">
              {error}
            </div>
          )}
        </div>
      )}

      {/* ---------- LOADING ---------- */}
      {loading && (
        <div className="text-center py-16">
          <RefreshCw className="w-16 h-16 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-2xl font-bold text-purple-700">
            Generating your question...
          </p>
        </div>
      )}

      {/* ---------- QUIZ QUESTION ---------- */}
      {currentQuestion && !loading && (
        <div className="space-y-6">
          {currentQuestion.images?.[0] && (
            <div className="w-full flex justify-center rounded-2xl p-4">
              <Image
                src={resolveImageUrl(currentQuestion.images[0])}
                alt="Quiz Image"
                width={420}
                height={420}
                className="object-contain rounded-xl shadow-md"
                unoptimized
              />
            </div>
          )}

          <div className="bg-gradient-to-r from-purple-100 to-pink-100 p-6 rounded-2xl border-2 border-purple-300">
            <p className="text-xl font-bold text-purple-800">
              {currentQuestion.question}
            </p>
          </div>

          <div
            className={`grid gap-3 ${
              currentQuestion.options.every((o) => o.length <= 5)
                ? "grid-cols-2"
                : "grid-cols-1"
            }`}
          >
            {currentQuestion.options.map((opt) => {
              const isCorrect = opt === currentQuestion.answer;
              const isSelected = opt === selectedOption;
              return (
                <button
                  key={opt}
                  onClick={() => handleAnswer(opt)}
                  disabled={!!selectedOption}
                  className={`p-4 border-2 rounded-2xl text-lg font-semibold shadow-sm transition-all flex items-center justify-center gap-2 ${
                    !selectedOption
                      ? "bg-white border-purple-200 hover:border-purple-500 hover:bg-purple-50 hover:shadow-md"
                      : isCorrect
                      ? "bg-green-500 text-white border-green-600 shadow-lg"
                      : isSelected
                      ? "bg-red-500 text-white border-red-600 shadow-lg"
                      : "bg-gray-100 border-gray-300 text-gray-400"
                  }`}
                >
                  {selectedOption && isCorrect && <CheckCircle2 className="w-5 h-5" />}
                  {selectedOption && isSelected && !isCorrect && <XCircle className="w-5 h-5" />}
                  {opt}
                </button>
              );
            })}
          </div>

          {selectedOption && (
            <div className="space-y-4">
              <div className="bg-blue-50 border-2 border-blue-300 p-5 rounded-2xl">
                <p className="font-bold text-blue-800 mb-2 text-lg">💡 Why?</p>
                <p className="text-blue-700 leading-relaxed">
                  {currentQuestion.explanation}
                </p>
              </div>

              <button
                onClick={generateQuestion}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-4 px-6 rounded-2xl shadow-lg hover:shadow-xl transform transition-all text-lg flex items-center justify-center gap-2"
              >
                Next Question
                <ArrowRight className="w-6 h-6" />
              </button>
            </div>
          )}

          <button
            onClick={handleRestart}
            className="w-full border-2 border-purple-400 text-purple-700 font-bold py-3 px-6 rounded-2xl hover:bg-purple-50 transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-5 h-5" />
            Start Over
          </button>
        </div>
      )}
    </div>
  );
}
