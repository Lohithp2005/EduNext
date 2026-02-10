"use client";

import { useState, useEffect } from "react";
import {
  Brain,
  Eye,
  Focus,
  Sparkles,
  Volume2,
  VolumeX,
  RotateCw,
  ArrowLeft,
  ArrowRight,
  Home,
  Star,
  Upload,
  Camera,
  Trophy,
  Zap,
} from "lucide-react";
import { useLanguage } from '@/app/context/LanguageContext';

type LearningMode = "adhd" | "dyslexia" | "autism" | "general";

type Flashcard = {
  front: string;
  back: string;
};

type ModeSettings = {
  fontSize: string;
  fontFamily: string;
  lineHeight: string;
  breakInterval: number;
  maxQuestionLength: number;
  audioEnabled: boolean;
  gamification: boolean;
};

type FlashcardExperienceProps = {
  initialMode?: LearningMode;
  skipModeSelection?: boolean;
  initialLessonText?: string;
  skipInput?: boolean;
};

export default function FlashcardExperience({
  initialMode,
  skipModeSelection,
  initialLessonText,
  skipInput,
}: FlashcardExperienceProps) {
  const { messages } = useLanguage();
  const t = messages.FlashcardExperience;

  const modeConfigs = {
    adhd: {
      name: t.adhd.name,
      description: t.adhd.description,
      icon: Focus,
      color: "from-orange-400 to-red-500",
      features: [
        "⚡ Max 10-word questions",
        "🎮 Points, badges & streaks",
        "⏰ Break every 15 cards",
        "🎯 Minimal distractions",
        "🚀 Quick flip animations",
      ],
      settings: {
        fontSize: "text-xl",
        fontFamily: "font-sans",
        lineHeight: "leading-relaxed",
        breakInterval: 15,
        maxQuestionLength: 10,
        audioEnabled: false,
        gamification: true,
      },
    },
    dyslexia: {
      name: t.dyslexia.name,
      description: t.dyslexia.description,
      icon: Eye,
      color: "from-blue-400 to-cyan-500",
      features: [
        "🔤 OpenDyslexic font",
        "🔊 Auto-read questions & answers",
        "📏 Extra line spacing (2x)",
        "🎨 Cream background (easier on eyes)",
        "🐢 Slower animations",
      ],
      settings: {
        fontSize: "text-2xl",
        fontFamily: "font-mono",
        lineHeight: "leading-loose",
        breakInterval: 20,
        maxQuestionLength: 15,
        audioEnabled: true,
        gamification: false,
      },
    },
    autism: {
      name: t.autism.name,
      description: t.autism.description,
      icon: Brain,
      color: "from-green-400 to-teal-500",
      features: [
        "📋 Same layout every time",
        "🔄 No surprises or pop-ups",
        "😊 Gentle colors (no bright)",
        "✅ Clear progress indicators",
        "🧘 Calm, no animations",
      ],
      settings: {
        fontSize: "text-xl",
        fontFamily: "font-sans",
        lineHeight: "leading-relaxed",
        breakInterval: 25,
        maxQuestionLength: 12,
        audioEnabled: true,
        gamification: false,
      },
    },
    general: {
      name: t.general.name,
      description: t.general.description,
      icon: Sparkles,
      color: "from-purple-400 to-pink-500",
      features: [
        "📚 Standard flashcards",
        "📊 Progress tracking",
        "🎯 Adaptive difficulty",
        "🌈 Colorful interface",
        "⚖️ Balanced features",
      ],
      settings: {
        fontSize: "text-lg",
        fontFamily: "font-sans",
        lineHeight: "leading-normal",
        breakInterval: 30,
        maxQuestionLength: 20,
        audioEnabled: false,
        gamification: true,
      },
    },
  };
  
  /* ---------------------------------- */
  /* Detect if user came from course     */
  /* ---------------------------------- */
  const [showBackButton, setShowBackButton] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      setShowBackButton(params.get("from") === "course");
    }
  }, []);

  /* ---------------------------------- */
  /* Mode selection state               */
  /* ---------------------------------- */
  const [step, setStep] = useState<"select" | "learn">(
    skipInput && initialLessonText ? "learn" : "select"
  );
  const [selectedMode, setSelectedMode] = useState<LearningMode | null>(
    initialMode || null
  );
  const [modeSettings, setModeSettings] = useState<ModeSettings | null>(
    initialMode ? modeConfigs[initialMode].settings : null
  );

  /* ---------------------------------- */
  /* Flashcard state                    */
  /* ---------------------------------- */
  const [lessonText, setLessonText] = useState(initialLessonText ?? "");
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentCard, setCurrentCard] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [masteredCards, setMasteredCards] = useState<Set<number>>(new Set());
  const [inputMode, setInputMode] = useState<"text" | "image">("text");

  /* ---------------------------------- */
  /* Gamification state                 */
  /* ---------------------------------- */
  const [points, setPoints] = useState(0);
  const [cardsStudied, setCardsStudied] = useState(0);
  const [showBreakReminder, setShowBreakReminder] = useState(false);

  const colorSchemes = [
    "from-violet-400 via-purple-500 to-indigo-500",
    "from-orange-400 via-pink-500 to-rose-500",
    "from-green-400 via-teal-500 to-cyan-500",
    "from-yellow-400 via-orange-500 to-red-500",
    "from-blue-400 via-indigo-500 to-purple-500",
  ];

  /* ---------------------------------- */
  /* Auto-generate when coming from course */
  /* ---------------------------------- */
  useEffect(() => {
    if (initialLessonText) {
      setLessonText(initialLessonText);
      if (skipInput && step === "learn" && initialMode && initialLessonText.trim()) {
        const config = modeConfigs[initialMode];
        generateFlashcardsFromText(initialLessonText, initialMode, config.settings);
      }
    }
  }, [initialLessonText, skipInput, step, initialMode]);

  useEffect(() => {
    if (initialMode) {
      const config = modeConfigs[initialMode];
      setSelectedMode(initialMode);
      setModeSettings(config.settings);
      localStorage.setItem("learningMode", initialMode);
      localStorage.setItem("modeSettings", JSON.stringify(config.settings));
      setStep("learn");
      return;
    }

    const savedMode = localStorage.getItem("learningMode") as LearningMode;
    const savedSettings = localStorage.getItem("modeSettings");
    if (savedMode && savedSettings) {
      setSelectedMode(savedMode);
      setModeSettings(JSON.parse(savedSettings));
      setStep("learn");
    }
  }, [initialMode]);

  useEffect(() => {
    if (
      modeSettings?.breakInterval &&
      cardsStudied > 0 &&
      cardsStudied % modeSettings.breakInterval === 0
    ) {
      setShowBreakReminder(true);
      if (modeSettings.audioEnabled) playTTS("Great job! Time for a quick break.");
    }
  }, [cardsStudied]);

  /* ---------------------------------- */
  /* Handlers                           */
  /* ---------------------------------- */
  const handleModeSelect = (mode: LearningMode) => {
    const config = modeConfigs[mode];
    setSelectedMode(mode);
    setModeSettings(config.settings);
    localStorage.setItem("learningMode", mode);
    localStorage.setItem("modeSettings", JSON.stringify(config.settings));
    setStep("learn");
  };

  const playTTS = (text: string) => {
    if (!text || !modeSettings?.audioEnabled) return;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    speechSynthesis.speak(utterance);
  };

  const stopTTS = () => {
    speechSynthesis.cancel();
    setSpeaking(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError("");
    setFlashcards([]);
    setCurrentCard(0);
    setIsFlipped(false);
    setMasteredCards(new Set());

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const maxLength = modeSettings?.maxQuestionLength || 20;
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: base64.split(",")[1],
          prompt: `Extract text and create 5 flashcards for ${selectedMode} learners. Questions max ${maxLength} words. Return ONLY JSON: [{"front":"Q?","back":"A"}]`,
        }),
      });

      if (!res.ok) throw new Error(`API error: ${res.status}`);

      const data = await res.json();
      let text = data.ai_text.replace(/```json/g, "").replace(/```/g, "").trim();
      const jsonMatch = text.match(/\[\s*\{[\s\S]*?\}\s*\]/);
      if (jsonMatch) setFlashcards(JSON.parse(jsonMatch[0]));
      else throw new Error("No flashcards generated");
    } catch (err: unknown) {
      setError(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  const generateFlashcards = async () => {
    if (!lessonText.trim()) return alert("Please enter lesson text");

    setLoading(true);
    setError("");
    setFlashcards([]);
    setCurrentCard(0);
    setIsFlipped(false);
    setMasteredCards(new Set());

    try {
      const maxLength = modeSettings?.maxQuestionLength || 20;
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `You have this content/theory:
${lessonText}

Create 5 flashcards STRICTLY based on this content. Every question must test understanding of ONLY what is taught above. Do NOT create questions about topics not covered.

For ${selectedMode} learners, max ${maxLength} words per question. Return ONLY JSON: [{"front":"Q?","back":"A"}]`,
        }),
      });

      if (!res.ok) throw new Error(`API error: ${res.status}`);

      const data = await res.json();
      let text = data.ai_text.replace(/```json/g, "").replace(/```/g, "").trim();
      const jsonMatch = text.match(/\[\s*\{[\s\S]*?\}\s*\]/);
      if (jsonMatch) setFlashcards(JSON.parse(jsonMatch[0]));
      else throw new Error("No flashcards generated");
    } catch (err: unknown) {
      setError(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  const generateFlashcardsFromText = async (
    text: string,
    mode: LearningMode,
    settings: ModeSettings
  ) => {
    if (!text.trim()) return;

    setLoading(true);
    setError("");
    setFlashcards([]);
    setCurrentCard(0);
    setIsFlipped(false);
    setMasteredCards(new Set());

    try {
      const maxLength = settings.maxQuestionLength || 20;
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `You have this content/theory:
${text}

Create 5 flashcards STRICTLY based on this content. Every question must test understanding of ONLY what is taught above. Do NOT create questions about topics not covered.

For ${mode} learners, max ${maxLength} words per question. Return ONLY JSON: [{"front":"Q?","back":"A"}]`,
        }),
      });

      if (!res.ok) throw new Error(`API error: ${res.status}`);

      const data = await res.json();
      let responseText = data.ai_text
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
      const jsonMatch = responseText.match(/\[\s*\{[\s\S]*?\}\s*\]/);
      if (jsonMatch) setFlashcards(JSON.parse(jsonMatch[0]));
      else throw new Error("No flashcards generated");
    } catch (err: unknown) {
      setError(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  const nextCard = () => {
    stopTTS();
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentCard((prev) => (prev + 1) % flashcards.length);
      setCardsStudied(cardsStudied + 1);
    }, 150);
  };

  const prevCard = () => {
    stopTTS();
    setIsFlipped(false);
    setTimeout(
      () =>
        setCurrentCard((prev) => (prev - 1 + flashcards.length) % flashcards.length),
      150
    );
  };

  const handleFlip = () => {
    stopTTS();
    setIsFlipped(!isFlipped);
    if (modeSettings?.audioEnabled && !isFlipped) {
      setTimeout(() => playTTS(flashcards[currentCard].back), 300);
    }
  };

  const toggleMastered = () => {
    if (masteredCards.has(currentCard)) return;

    const newMastered = new Set(masteredCards);
    newMastered.add(currentCard);
    setMasteredCards(newMastered);

    if (modeSettings?.gamification) {
      setPoints(points + 10);
      playTTS("Great job! Plus 10 points!");
    }
  };

  const resetToModeSelection = () => {
    if (skipModeSelection) return;
    setStep("select");
    setFlashcards([]);
    setLessonText("");
    setCurrentCard(0);
    setIsFlipped(false);
    setError("");
    setMasteredCards(new Set());
    setPoints(0);
    setCardsStudied(0);
    localStorage.removeItem("learningMode");
    localStorage.removeItem("modeSettings");
  };

  const masteryPercentage =
    flashcards.length > 0
      ? Math.round((masteredCards.size / flashcards.length) * 100)
      : 0;

  /* ================================== */
  /* MODE SELECTION SCREEN              */
  /* ================================== */
  if (step === "select") {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 via-purple-50 to-pink-50 p-4 sm:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold bg-linear-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent mb-4">
              {t.chooseMode}
            </h1>
            <p className="text-lg sm:text-xl text-gray-600">
              {t.modeSubtitle}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
            {(Object.keys(modeConfigs) as LearningMode[]).map((mode) => {
              const config = modeConfigs[mode];
              const Icon = config.icon;
              return (
                <div
                  key={mode}
                  onClick={() => handleModeSelect(mode)}
                  className="bg-white rounded-3xl shadow-xl p-6 sm:p-8 cursor-pointer hover:shadow-2xl hover:scale-105 transition-all duration-300 border-2 border-transparent hover:border-purple-300"
                >
                  <div
                    className={`w-14 h-14 sm:w-16 sm:h-16 bg-linear-to-br ${config.color} rounded-2xl flex items-center justify-center text-white mb-4`}
                  >
                    <Icon className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                    {config.name}
                  </h3>
                  <p className="text-gray-600 mb-4 text-sm sm:text-base">
                    {config.description}
                  </p>
                  <ul className="space-y-2 mb-6">
                    {config.features.map((feature, idx) => (
                      <li key={idx} className="text-xs sm:text-sm text-gray-700">
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <button
                    className={`w-full py-3 bg-linear-to-r ${config.color} text-white rounded-xl font-semibold hover:shadow-lg transition-all`}
                  >
                    {t.selectMode}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  /* ================================== */
  /* LEARNING SCREEN                    */
  /* ================================== */
  const textSize = modeSettings?.fontSize || "text-lg";
  const fontFamily = modeSettings?.fontFamily || "font-sans";
  const lineHeight = modeSettings?.lineHeight || "leading-normal";

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-purple-50 to-pink-50 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          {showBackButton ? (
            <a
              href="/course"
              className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 font-semibold transition"
              title="Back to course"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">{t.backToCourse}</span>
            </a>
          ) : (
            <div className="w-32" />
          )}

          <div className="text-center flex-1">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full shadow-lg mb-4">
              <Sparkles className="w-5 h-5 text-purple-500" />
              <span className="text-sm font-semibold text-purple-700 capitalize">
                {selectedMode} {t.adhd.name.split(' ')[1]}
              </span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-bold bg-linear-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent mb-2">
              {t.title}
            </h1>
            {!skipModeSelection && (
              <button
                onClick={resetToModeSelection}
                className="text-sm text-purple-600 hover:underline"
              >
                Change Mode
              </button>
            )}
          </div>

          <div className="w-32" />
        </div>

        {/* Gamification Stats */}
        {modeSettings?.gamification && flashcards.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-linear-to-br from-yellow-400 to-orange-500 rounded-xl p-4 text-center text-white shadow-lg">
              <Trophy className="w-6 h-6 mx-auto mb-1" />
              <div className="text-2xl font-bold">{points}</div>
              <div className="text-xs">Points</div>
            </div>
            <div className="bg-linear-to-br from-red-400 to-pink-500 rounded-xl p-4 text-center text-white shadow-lg">
              <Zap className="w-6 h-6 mx-auto mb-1" />
              <div className="text-2xl font-bold">{masteredCards.size}</div>
              <div className="text-xs">Mastered</div>
            </div>
            <div className="bg-linear-to-br from-blue-400 to-purple-500 rounded-xl p-4 text-center text-white shadow-lg">
              <Star className="w-6 h-6 mx-auto mb-1" />
              <div className="text-2xl font-bold">{cardsStudied}</div>
              <div className="text-xs">Studied</div>
            </div>
          </div>
        )}

        {/* Break Reminder */}
        {showBreakReminder && (
          <div className="bg-green-50 border-2 border-green-400 rounded-2xl p-6 mb-6">
            <h3 className="text-lg font-bold text-green-900 mb-2">
              🎉 Great Progress!
            </h3>
            <p className="text-green-700 mb-4">
              Time for a 5-minute break!
            </p>
            <button
              onClick={() => setShowBreakReminder(false)}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
            >
              Got it!
            </button>
          </div>
        )}

        {/* Input Section */}
        {flashcards.length === 0 && !skipInput && (
          <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 space-y-4 border border-purple-100">
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setInputMode("text")}
                className={`flex-1 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                  inputMode === "text"
                    ? "bg-linear-to-r from-purple-500 to-pink-500 text-white shadow-lg"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                <Sparkles className="w-4 h-4" /> {t.pasteText}
              </button>
              <button
                onClick={() => setInputMode("image")}
                className={`flex-1 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                  inputMode === "image"
                    ? "bg-linear-to-r from-purple-500 to-pink-500 text-white shadow-lg"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                <Camera className="w-4 h-4" /> {t.uploadImage}
              </button>
            </div>

            {inputMode === "text" && (
              <>
                <label className={`block ${textSize} font-bold text-gray-800`}>
                  {t.pasteLesson}
                </label>
                <textarea
                  className={`w-full h-48 sm:h-56 p-4 border-2 border-purple-200 rounded-2xl focus:outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-100 transition-all ${textSize} ${fontFamily} ${lineHeight} resize-none`}
                  placeholder={t.lessonPlaceholder}
                  value={lessonText}
                  onChange={(e) => setLessonText(e.target.value)}
                />
                <button
                  onClick={generateFlashcards}
                  disabled={loading || !lessonText.trim()}
                  className="w-full py-4 bg-linear-to-r from-purple-500 via-pink-500 to-blue-500 text-white rounded-2xl font-bold text-lg hover:shadow-2xl hover:scale-[1.02] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>{" "}
                      {t.creating}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" /> {t.generateFlashcards}
                    </>
                  )}
                </button>
              </>
            )}

            {inputMode === "image" && (
              <>
                <label className={`block ${textSize} font-bold text-gray-800`}>
                  {t.uploadImageLabel}
                </label>
                <div className="border-2 border-dashed border-purple-300 rounded-2xl p-12 text-center hover:border-purple-400 transition-all bg-linear-to-br from-purple-50 to-pink-50">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                    disabled={loading}
                  />
                  <label
                    htmlFor="image-upload"
                    className="cursor-pointer flex flex-col items-center gap-4"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-500"></div>
                        <p className="text-gray-700 font-semibold">
                          {t.processing}
                        </p>
                      </>
                    ) : (
                      <>
                        <Upload className="w-16 h-16 text-purple-400" />
                        <p className={`${textSize} font-bold text-gray-800`}>
                          {t.clickToUpload}
                        </p>
                      </>
                    )}
                  </label>
                </div>
              </>
            )}

            {error && (
              <div className="p-4 bg-red-50 border-2 border-red-200 rounded-2xl">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}
          </div>
        )}

        {/* Flashcard Display */}
        {flashcards.length > 0 && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl shadow-lg p-4 border border-purple-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-gray-600">
                    Progress
                  </span>
                  <span className="text-xl font-bold bg-linear-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    {currentCard + 1}/{flashcards.length}
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-linear-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${((currentCard + 1) / flashcards.length) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-4 border border-green-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-gray-600">
                    Mastered
                  </span>
                  <span className="text-xl font-bold bg-linear-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">
                    {masteryPercentage}%
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-linear-to-r from-green-500 to-teal-500 rounded-full transition-all duration-500"
                    style={{ width: `${masteryPercentage}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="relative perspective-1000">
              <div
                onClick={handleFlip}
                className="relative w-full h-80 sm:h-96 cursor-pointer transition-transform duration-700"
                style={{
                  transformStyle: "preserve-3d",
                  transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                }}
              >
                <div
                  className={`absolute w-full h-full bg-linear-to-br ${
                    colorSchemes[currentCard % colorSchemes.length]
                  } rounded-3xl shadow-2xl p-8 flex flex-col items-center justify-center border-4 border-white`}
                  style={{ backfaceVisibility: "hidden" }}
                >
                  <div className="absolute top-6 left-6 px-4 py-2 bg-white/30 backdrop-blur-sm rounded-full">
                    <span className="text-white font-bold text-sm">
                      QUESTION
                    </span>
                  </div>
                  {masteredCards.has(currentCard) && (
                    <div className="absolute top-6 right-6">
                      <Star className="w-8 h-8 text-yellow-300 fill-yellow-300 drop-shadow-lg" />
                    </div>
                  )}
                  <p
                    className={`${textSize} sm:text-4xl ${fontFamily} ${lineHeight} font-bold text-white text-center drop-shadow-lg px-4`}
                  >
                    {flashcards[currentCard].front}
                  </p>
                  <div className="absolute bottom-6 flex items-center gap-2 text-white/80 text-sm">
                    <RotateCw className="w-4 h-4" /> <span>Tap to flip</span>
                  </div>
                </div>

                <div
                  className="absolute w-full h-full bg-white rounded-3xl shadow-2xl p-8 flex flex-col items-center justify-center border-4 border-gray-100"
                  style={{
                    backfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
                  }}
                >
                  <div className="absolute top-6 left-6 px-4 py-2 bg-linear-to-r from-green-400 to-teal-400 rounded-full">
                    <span className="text-white font-bold text-sm">ANSWER</span>
                  </div>
                  <p
                    className={`${textSize} sm:text-3xl ${fontFamily} ${lineHeight} font-bold text-gray-800 text-center px-4`}
                  >
                    {flashcards[currentCard].back}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <button
                onClick={prevCard}
                className="py-4 bg-white border-2 border-purple-200 text-purple-600 rounded-2xl font-bold hover:bg-purple-50 transition-all flex items-center justify-center"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              {modeSettings?.audioEnabled && (
                <button
                  onClick={() => {
                    const text = isFlipped
                      ? flashcards[currentCard].back
                      : flashcards[currentCard].front;
                    speaking ? stopTTS() : playTTS(text);
                  }}
                  className={`py-4 rounded-2xl font-bold transition-all flex items-center justify-center ${
                    speaking
                      ? "bg-linear-to-r from-red-500 to-pink-500 text-white"
                      : "bg-linear-to-r from-blue-500 to-cyan-500 text-white"
                  }`}
                >
                  {speaking ? (
                    <VolumeX className="w-5 h-5" />
                  ) : (
                    <Volume2 className="w-5 h-5" />
                  )}
                </button>
              )}

              <button
                onClick={toggleMastered}
                disabled={masteredCards.has(currentCard)}
                className={`py-4 rounded-2xl font-bold transition-all flex items-center justify-center ${
                  masteredCards.has(currentCard)
                    ? "bg-linear-to-r from-yellow-400 to-orange-400 text-white cursor-not-allowed"
                    : "bg-white border-2 border-gray-200 text-gray-600 hover:border-yellow-300 hover:bg-yellow-50"
                }`}
              >
                <Star
                  className={`w-5 h-5 ${
                    masteredCards.has(currentCard) ? "fill-white" : ""
                  }`}
                />
              </button>

              <button
                onClick={nextCard}
                className="py-4 bg-white border-2 border-purple-200 text-purple-600 rounded-2xl font-bold hover:bg-purple-50 transition-all flex items-center justify-center"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>

            <button
              onClick={() => {
                stopTTS();
                setFlashcards([]);
                setLessonText(initialLessonText ?? "");
                setCurrentCard(0);
                setIsFlipped(false);
                setError("");
                setMasteredCards(new Set());
              }}
              className="w-full py-3 bg-gray-100 text-gray-700 rounded-2xl font-semibold hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
            >
              <Home className="w-5 h-5" /> Create New Flashcards
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
