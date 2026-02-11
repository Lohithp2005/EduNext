"use client";

import { useState, useEffect, ChangeEvent, KeyboardEvent, useRef } from "react";
import { RefreshCw, Sparkles, TrendingUp, TrendingDown } from "lucide-react";
import { useEmotion, EmotionTracker } from "@/app/components/Emotion";

type QuizQuestion = {
  question: string;
  options: string[];
  answer: string;
  difficulty: number;
};

type AdaptiveQuizProps = {
  initialTopic?: string;
  autoStart?: boolean;
};

export default function AdaptiveQuiz({ initialTopic, autoStart }: AdaptiveQuizProps) {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
  const [topic, setTopic] = useState("");
  const [theoryContext, setTheoryContext] = useState("");
  const [cognitiveProfile, setCognitiveProfile] = useState<any>(null);
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [currentDifficulty, setCurrentDifficulty] = useState(2);
  const [difficultyChanged, setDifficultyChanged] = useState<"up" | "down" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { emotionHistory, averageEngagement, averageStress, isTracking } = useEmotion();
  const difficultyDebounce = useRef<NodeJS.Timeout | null>(null);
  const emotionCooldown = useRef(false); // prevent repeated emotion triggers

  useEffect(() => {
    // Always prioritize initialTopic from URL parameter
    if (initialTopic) {
      setTopic(initialTopic);
      
      // Load theory from localStorage ONLY if it matches current topic
      const storedTheory = localStorage.getItem("lastTheory");
      const storedTopic = localStorage.getItem("lastTheoryTopic");
      
      if (storedTheory && storedTopic === initialTopic) {
        setTheoryContext(storedTheory);
      } else {
        // Clear theory context if topic doesn't match
        setTheoryContext("");
      }

      // Load cognitive profile if available
      const coursePlan = localStorage.getItem("coursePlan");
      if (coursePlan) {
        try {
          const plan = JSON.parse(coursePlan);
          if (plan.selectedReport) {
            fetch("/api/get-report", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ reportName: plan.selectedReport }),
            })
              .then((res) => res.json())
              .then((data) => setCognitiveProfile(data.profile))
              .catch((err) => console.error("Failed to load profile:", err));
          }
        } catch (e) {
          console.error("Failed to parse course plan:", e);
        }
      }
    }
  }, [initialTopic]);

  useEffect(() => {
    if (autoStart && initialTopic) {
      setTopic(initialTopic);
      startQuiz(initialTopic);
    }
  }, [autoStart, initialTopic]);

  /* ------------------- DIFFICULTY ADAPTATION ------------------- */
  useEffect(() => {
    console.log('💭 useEffect fired:', {
      emotionHistoryLength: emotionHistory.length,
      totalQuestions,
      isTracking,
      hasQuestion: !!currentQuestion,
      selectedOption
    });

    // Allow emotion tracking as soon as quiz starts (currentQuestion exists), even if totalQuestions is 0
    if (emotionHistory.length >= 1 && isTracking && currentQuestion) {
      const latestEmotion = emotionHistory[emotionHistory.length - 1];

      console.log('🔍 FULL EMOTION CHECK:', {
        emotion: latestEmotion.emotion,
        stress: latestEmotion.stress,
        engagement: latestEmotion.engagement,
        confidence: latestEmotion.confidence,
        cooldown: emotionCooldown.current,
        hasQuestion: !!currentQuestion,
        hasSelected: !!selectedOption,
        totalQuestions: totalQuestions,
        isTracking: isTracking
      });

      // IMMEDIATE EMOTION DETECTION - Replace current question with easier one
      // Lower thresholds for more sensitive detection
      const isStressed = latestEmotion.stress > 0.5; // Lowered from 0.7
      const isDisengaged = latestEmotion.engagement < 0.4; // Increased from 0.3
      const isConfused = latestEmotion.emotion === "confused";
      const isNegativeEmotion = ["stress", "fearful", "sad", "disgusted"].includes(latestEmotion.emotion);
      
      console.log('⚡ EMOTION TRIGGERS:', {
        isStressed,
        isDisengaged,
        isConfused,
        isNegativeEmotion,
        emotionType: latestEmotion.emotion
      });
      
      // Trigger immediate question change for negative emotions
      if ((isStressed || isDisengaged || isConfused || isNegativeEmotion) && !emotionCooldown.current && currentQuestion && !selectedOption) {
        console.log('🚨 TRIGGERING IMMEDIATE DIFFICULTY DOWN - Stress:', isStressed, 'Disengaged:', isDisengaged, 'Confused:', isConfused, 'Emotion:', latestEmotion.emotion);
        emotionCooldown.current = true;

        // Clear any pending difficulty adjustments
        if (difficultyDebounce.current) {
          clearTimeout(difficultyDebounce.current);
          difficultyDebounce.current = null;
        }

        const newDifficulty = Math.max(1, currentDifficulty - 1);
        console.log('New difficulty:', newDifficulty);
        setCurrentDifficulty(newDifficulty);
        setDifficultyChanged("down");
        setTimeout(() => setDifficultyChanged(null), 2500);

        // IMMEDIATELY generate and show easier question
        console.log('Generating easier question immediately...');
        generateQuestion(newDifficulty);

        // cooldown 5s to prevent repeated triggers
        setTimeout(() => {
          emotionCooldown.current = false;
          console.log('Cooldown reset');
        }, 5000);
        return;
      }

      // Increase difficulty if highly engaged with low stress (question might be too easy)
      const isHighlyEngaged = latestEmotion.engagement > 0.7 && latestEmotion.stress < 0.4; // More lenient thresholds
      
      console.log('📈 ENGAGEMENT CHECK:', {
        isHighlyEngaged,
        engagement: latestEmotion.engagement,
        stress: latestEmotion.stress
      });
      
      if (isHighlyEngaged && !emotionCooldown.current && currentQuestion && !selectedOption) {
        console.log('🎉 TRIGGERING IMMEDIATE DIFFICULTY UP - High engagement, low stress');
        emotionCooldown.current = true;

        if (difficultyDebounce.current) {
          clearTimeout(difficultyDebounce.current);
          difficultyDebounce.current = null;
        }

        const newDifficulty = Math.min(5, currentDifficulty + 1);
        console.log('New difficulty:', newDifficulty);
        setCurrentDifficulty(newDifficulty);
        setDifficultyChanged("up");
        setTimeout(() => setDifficultyChanged(null), 2500);

        // IMMEDIATELY generate and show harder question
        console.log('Generating harder question immediately...');
        generateQuestion(newDifficulty);

        setTimeout(() => {
          emotionCooldown.current = false;
          console.log('Cooldown reset');
        }, 5000);
        return;
      }

      // normal adjustment based on engagement/stress/accuracy
      if (difficultyDebounce.current) clearTimeout(difficultyDebounce.current);
      difficultyDebounce.current = setTimeout(adjustDifficulty, 1500);
    }
  }, [emotionHistory, totalQuestions, isTracking, currentDifficulty, currentQuestion, selectedOption]);

  const adjustDifficulty = () => {
    const accuracy = totalQuestions > 0 ? score / totalQuestions : 0.5;
    let newDifficulty = currentDifficulty;

    if (averageEngagement < 0.4 || averageStress > 0.7 || accuracy < 0.4) {
      newDifficulty = Math.max(1, currentDifficulty - 1);
      if (newDifficulty !== currentDifficulty) setDifficultyChanged("down");
    } else if (averageEngagement > 0.7 && averageStress < 0.4 && accuracy > 0.75) {
      newDifficulty = Math.min(5, currentDifficulty + 1);
      if (newDifficulty !== currentDifficulty) setDifficultyChanged("up");
    }

    if (newDifficulty !== currentDifficulty) {
      setCurrentDifficulty(newDifficulty);
      generateQuestion(newDifficulty); // update question with new difficulty
      setTimeout(() => setDifficultyChanged(null), 2500);
    }
  };

  /* ------------------- PROMPT UTILS ------------------- */
  const getDifficultyPrompt = (level: number) => {
    const prompts: Record<number, string> = {
      1: "very easy with 2 simple options",
      2: "easy with 3 clear options",
      3: "medium difficulty with 3 options",
      4: "challenging with 4 options",
      5: "advanced and concept-heavy with 4 options"
    };
    return prompts[level] || prompts[3];
  };

  const getProfileContext = () => {
    if (!cognitiveProfile?.cognitiveScores) return "";
    
    const scores = cognitiveProfile.cognitiveScores;
    let context = "\n\nStudent's Learning Profile:\n";
    
    if (scores.attention < 30) {
      context += "- Has attention challenges: Keep questions focused and concise, break content into smaller chunks\n";
    }
    if (scores.workingMemory < 40) {
      context += "- Has working memory constraints: Avoid multiple-step questions, keep options distinct\n";
    }
    if (scores.visualSpatial < 40) {
      context += "- Prefers verbal/text-based learning: Use words instead of diagrams\n";
    }
    if (scores.auditoryProcessing > 70) {
      context += "- Strong auditory learner: Use word-based descriptions and examples\n";
    }
    if (scores.reasoning > 70) {
      context += "- Strong reasoning skills: Can handle complex reasoning chains\n";
    }
    
    return context;
  };

  /* ------------------- QUESTION GENERATION ------------------- */
  const generateQuestion = async (difficultyOverride?: number, topicOverride?: string) => {
    const topicToUse = (topicOverride ?? topic).trim();
    if (!topicToUse) return;
    setLoading(true);
    setSelectedOption(null);
    setError(null);

    const difficultyToUse = difficultyOverride || currentDifficulty;

    // Build context-aware prompt with profile awareness
    // Only use theory context if it matches the current topic
    const storedTheoryTopic = localStorage.getItem("lastTheoryTopic");
    const shouldUseTheory = theoryContext && storedTheoryTopic === topic;
    
    let contextPrompt = shouldUseTheory
      ? `You have this theory content:\n${theoryContext}\n\nGenerate 1 ${getDifficultyPrompt(difficultyToUse)} multiple choice question that tests understanding of ONLY what is taught in the above content. The question MUST be based strictly on the theory provided. Do NOT create questions about topics not covered in the theory.`
      : `Generate 1 ${getDifficultyPrompt(difficultyToUse)} multiple choice question about "${topicToUse}".`;

    contextPrompt += getProfileContext();

    try {
      const res = await fetch(`${apiBase}/api/gemini`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `${contextPrompt}
Return ONLY valid JSON:
{"question":"","options":[],"answer":"","difficulty":${difficultyToUse}}`
        })
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      const data = await res.json();
      
      // Check for error response from backend
      if (data.error) {
        setError(data.error);
        return;
      }
      
      let text = data.ai_text || data.text;
      if (!text) {
        setError("No question returned from the API.");
        return;
      }
      
      text = text.replace(/```json/gi, "").replace(/```/g, "").trim();
      const q: QuizQuestion = JSON.parse(text);

      if (!q.options || !q.options.includes(q.answer)) throw new Error("Invalid question structure");

      setCurrentQuestion(q);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      console.error("Question generation failed", err);
    } finally {
      setLoading(false);
    }
  };

  /* ------------------- ANSWER HANDLER ------------------- */
  const handleAnswer = (option: string) => {
    if (!currentQuestion || selectedOption) return;
    setSelectedOption(option);
    setTotalQuestions(p => p + 1);

    setTimeout(() => {
      if (option === currentQuestion.answer) setScore(p => p + 1);
      generateQuestion(); // next question with current difficulty
    }, 700);
  };

  /* ------------------- START / RESET ------------------- */
  const startQuiz = (topicOverride?: string) => {
    setScore(0);
    setTotalQuestions(0);
    setCurrentDifficulty(2);
    setDifficultyChanged(null);
    generateQuestion(undefined, topicOverride);
  };

  const resetQuiz = () => {
    setTopic("");
    setCurrentQuestion(null);
    setScore(0);
    setTotalQuestions(0);
    setCurrentDifficulty(2);
    setDifficultyChanged(null);
  };

  const difficultyLabels = ["Very Easy", "Easy", "Medium", "Hard", "Very Hard"];

  /* ------------------- UI ------------------- */
  return (
    <div className="min-h-screen bg-purple-200 p-6 pt-6">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">

            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-1">🎯 Adaptive Quiz</h1>
              <p className="text-sm text-gray-600">
                {`Difficulty: ${difficultyLabels[currentDifficulty - 1]} (${currentDifficulty})`}
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-lg text-center bg-red-100 text-red-700">
                {error}
              </div>
            )}

            {difficultyChanged && (
              <div className={`p-3 rounded-lg text-center animate-fade-in ${
                difficultyChanged === "up"
                  ? "bg-orange-100 text-orange-700"
                  : "bg-green-100 text-green-700"
              }`}>
                {difficultyChanged === "up"
                  ? <TrendingUp className="inline w-5 h-5 mr-1" />
                  : <TrendingDown className="inline w-5 h-5 mr-1" />}
                {difficultyChanged === "up"
                  ? "Difficulty increased 🎉"
                  : "Difficulty lowered to help 💪"}
              </div>
            )}

            {!currentQuestion && !loading && (
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Enter a topic..."
                  value={topic}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setTopic(e.target.value)}
                  onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && startQuiz()}
                  className="w-full p-4 border-2 border-purple-300 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  onClick={() => startQuiz()}
                  disabled={!topic.trim()}
                  className="w-full bg-purple-500 hover:bg-purple-600 disabled:bg-purple-300 text-white py-4 rounded-xl text-lg font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-5 h-5" /> Start Adaptive Quiz
                </button>
              </div>
            )}

            {loading && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-14 w-14 border-b-4 border-purple-500 mx-auto mb-4"></div>
                <p className="text-gray-700 text-lg">Generating next question...</p>
              </div>
            )}

            {currentQuestion && !loading && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-purple-600 bg-purple-100 px-4 py-2 rounded-full">
                    Question {totalQuestions + 1}
                  </span>
                  <span className="text-sm font-semibold text-gray-600">
                    Score: {score}/{totalQuestions}
                  </span>
                </div>

                <div className="bg-linear-to-r from-purple-50 to-pink-50 p-6 rounded-xl">
                  <p className="text-xl font-bold text-gray-900">
                    {currentQuestion.question}
                  </p>
                </div>

                <div className="grid gap-3">
                  {currentQuestion.options.map((option, idx) => {
                    const isSelected = selectedOption === option;
                    const isCorrect = option === currentQuestion.answer;
                    const isWrong = isSelected && !isCorrect;

                    let btnClass =
                      "p-4 border-2 rounded-xl text-left text-lg font-medium transition-all ";

                    if (selectedOption) {
                      if (isSelected && isCorrect)
                        btnClass += "border-green-500 bg-green-100";
                      else if (isWrong)
                        btnClass += "border-red-500 bg-red-100";
                      else if (isCorrect)
                        btnClass += "border-green-500 bg-green-100";
                      else btnClass += "border-gray-200 text-gray-400";
                    } else {
                      btnClass +=
                        "border-gray-200 hover:border-purple-400 hover:bg-purple-50 hover:scale-[1.02]";
                    }

                    return (
                      <button
                        key={idx}
                        disabled={!!selectedOption}
                        onClick={() => handleAnswer(option)}
                        className={btnClass}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {currentQuestion && (
              <button
                onClick={resetQuiz}
                className="mt-6 mx-auto block text-sm text-gray-500 hover:text-gray-700"
              >
                <RefreshCw className="inline w-4 h-4 mr-1" /> Reset
              </button>
            )}
          </div>
        </div>

        {/* Emotion Sidebar */}
        <div className="lg:col-span-1">
          <EmotionTracker />
        </div>
      </div>
    </div>
  );
}