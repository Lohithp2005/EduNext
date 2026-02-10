"use client";

import { useMemo, useState, ChangeEvent, useEffect } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Loader2,
  Sparkles,
  Upload,
  X,
} from "lucide-react";

import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { Locale, useLanguage } from '@/app/context/LanguageContext';

type LearningStep = {
  title: string;
  desc: string;
};

type LearningMode = "adhd" | "dyslexia" | "autism" | "general";

type OrchestrateResponse = {
  steps: LearningStep[];
  flashcardMode: LearningMode;
};

// Localized default steps for all languages
const DEFAULT_STEPS_BY_LOCALE = {
  en: [
    { title: "Theory", desc: "Learn concepts with examples" },
    { title: "Quiz", desc: "Identify $F = ma$ components using simple MCQs" },
    { title: "Flashcards", desc: "Revise important terms quickly" },
    { title: "Mini Test", desc: "Check understanding" },
  ],
  ta: [
    { title: "கோட்பாடு", desc: "கருத்துக்களை எடுத்துக்காட்டுகளுடன் கற்க" },
    { title: "வினா", desc: "பல்வேறு தேர்வு கேள்விகளுடன் பயிற்சி" },
    { title: "ஃபிளாஷ்கார்டுகள்", desc: "முக்கிய சொற்களை மீண்டும் பார்க்க" },
    { title: "மினி சோதனை", desc: "புரிதலை சோதிக்க" },
  ],
  kn: [
    { title: "ಸಿದ್ಧಾಂತ", desc: "ಉದಾಹರಣೆಗಳೊಂದಿಗೆ ಪರಿಕಲ್ಪನೆಗಳನ್ನು ಕಲಿಯಿರಿ" },
    { title: "ಪ್ರಶ್ನೆ", desc: "ಬಹು-ಆಯ್ದ ಪ್ರಶ್ನೆಗಳೊಂದಿಗೆ ಅಭ್ಯಾಸ" },
    { title: "ಫ್ಲ್ಯಾಶ್ಕಾರ್ಡ್ಗಳು", desc: "ಪ್ರಮುಖ ಪದಗಳನ್ನು ಪುನರಾವಿಷ್ಕರಿಸಿ" },
    { title: "ಮಿನಿ ಪರೀಕ್ಷೆ", desc: "ಅರ್ಥವನ್ನು ಪರೀಕ್ಷಿಸಿ" },
  ],
  hi: [
    { title: "सिद्धांत", desc: "उदाहरणों के साथ अवधारणाएं सीखें" },
    { title: "प्रश्नोत्तरी", desc: "बहु-विकल्प प्रश्नों का अभ्यास करें" },
    { title: "फ्लैशकार्ड", desc: "महत्वपूर्ण शब्दों की समीक्षा करें" },
    { title: "लघु परीक्षा", desc: "समझ की जांच करें" },
  ],
  te: [
    { title: "సిద్ధాంతం", desc: "ఉదాహరణలతో భావనలను నేర్చుకోండి" },
    { title: "క్విజ్", desc: "బహుళ-ఎంపిక ప్రశ్నలతో సాధన" },
    { title: "ఫ్లాష్‌కార్డ్స్", desc: "ముఖ్యమైన పదాలను సమీక్షించండి" },
    { title: "మినీ టెస్ట్", desc: "అవగతను తనిఖీ చేయండి" },
  ],
};

const isLearningMode = (value: string): value is LearningMode =>
  value === "adhd" ||
  value === "dyslexia" ||
  value === "autism" ||
  value === "general";

export default function Page() {
  const { messages, locale } = useLanguage();
  const t = messages.CoursePage;
  
  // Helper function to detect if text is primarily in English
  const isEnglishText = (text: string): boolean => {
    const latinCount = (text.match(/[a-zA-Z]/g) || []).length;
    const nonLatinCount = (text.match(/[^\x00-\x7F]/g) || []).length;
    return latinCount > nonLatinCount;
  };
  
  // Helper function to validate if steps are in the requested language
  const validateStepsLanguage = (steps: LearningStep[], requestedLocale: Locale): boolean => {
    if (requestedLocale === "en") return true; // English is fine for English locale
    
    // For other locales, check if descriptions are actually in that language
    const allDesc = steps.map(s => s.desc).join(" ");
    return !isEnglishText(allDesc);
  };

  const [topic, setTopic] = useState("");
  const [pdfName, setPdfName] = useState<string | null>(null);
  const [pdfText, setPdfText] = useState("");
  const [steps, setSteps] = useState<LearningStep[]>(
    DEFAULT_STEPS_BY_LOCALE[locale as keyof typeof DEFAULT_STEPS_BY_LOCALE] || DEFAULT_STEPS_BY_LOCALE.en
  );
  const [flashcardMode, setFlashcardMode] =
    useState<LearningMode>("general");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasPlan, setHasPlan] = useState(false);
  const [reports, setReports] = useState<Array<{ name: string; label: string }>>(
    []
  );
  const [selectedReport, setSelectedReport] = useState("");
  const [reportsLoading, setReportsLoading] = useState(true);

  // Update default steps when locale changes (only if no plan exists)
  useEffect(() => {
    if (!hasPlan) {
      const localizedSteps = DEFAULT_STEPS_BY_LOCALE[locale as keyof typeof DEFAULT_STEPS_BY_LOCALE] || DEFAULT_STEPS_BY_LOCALE.en;
      setSteps(localizedSteps);
    }
  }, [locale, hasPlan]);

  // Load available reports
  useEffect(() => {
    const loadReports = async () => {
      try {
        const res = await fetch("/api/list-reports");
        const data = await res.json();
        if (data.reports && Array.isArray(data.reports)) {
          setReports(data.reports);
          if (data.reports.length > 0) {
            setSelectedReport(data.reports[0].name);
          }
        }
      } catch (err) {
        console.error("Failed to load reports:", err);
      } finally {
        setReportsLoading(false);
      }
    };

    loadReports();
  }, []);

  // Restore plan from localStorage on mount
  useEffect(() => {
    const savedPlan = localStorage.getItem("coursePlan");
    if (savedPlan) {
      try {
        const parsed = JSON.parse(savedPlan);
        if (parsed.hasPlan) {
          setHasPlan(true);
          const localizedSteps = DEFAULT_STEPS_BY_LOCALE[locale as keyof typeof DEFAULT_STEPS_BY_LOCALE] || DEFAULT_STEPS_BY_LOCALE.en;
          setSteps(parsed.steps || localizedSteps);
          setFlashcardMode(parsed.flashcardMode || "general");
          setTopic(parsed.topic || "");
          setPdfText(parsed.pdfText || "");
          setPdfName(parsed.pdfName || null);
          setSelectedReport(parsed.selectedReport || "");
        }
      } catch (err) {
        console.error("Failed to restore plan:", err);
      }
    }
  }, []);

  const canAnalyze = topic.trim().length > 0 || pdfText.trim().length > 0;

  const resetFlow = () => {
    setHasPlan(false);
    const localizedSteps = DEFAULT_STEPS_BY_LOCALE[locale as keyof typeof DEFAULT_STEPS_BY_LOCALE] || DEFAULT_STEPS_BY_LOCALE.en;
    setSteps(localizedSteps);
    setFlashcardMode("general");
    localStorage.removeItem("coursePlan");
  };

  const actionMap = useMemo(() => {
    const encodedTopic = encodeURIComponent(topic.trim());
    const baseQuery = encodedTopic ? `?topic=${encodedTopic}` : "";

    return {
      quiz: {
        label: t.stepActions.openQuiz,
        href: `/quiz${baseQuery}`,
      },
      flashcards: {
        label: `${t.stepActions.openFlashcards} (${flashcardMode})`,
        href: `/flashcard?mode=${flashcardMode}${
          encodedTopic ? `&topic=${encodedTopic}` : ""
        }`,
      },
    } as const;
  }, [topic, flashcardMode, t.stepActions]);

  const parsePdfText = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdfjs = await import("pdfjs-dist/build/pdf");
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.mjs",
      import.meta.url
    ).toString();

    const doc = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    let combined = "";

    for (let i = 1; i <= doc.numPages; i += 1) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item: any) => (item?.str ? String(item.str) : ""))
        .join(" ");
      combined += `${pageText}\n`;

      if (combined.length > 12000) break;
    }

    return combined.trim();
  };

  const handlePdfUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setPdfName(file.name);
    setLoading(true);

    try {
      const extracted = await parsePdfText(file);
      if (!extracted) {
        setError(
          "Couldn’t extract text from that PDF. Try another file or enter a topic."
        );
        setPdfText("");
        return;
      }
      setPdfText(extracted);
    } catch (err) {
      console.error(err);
      setError("PDF parsing failed. Try a different PDF or enter a topic.");
      setPdfText("");
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!canAnalyze) return;
    if (!selectedReport) {
      setError("Please select a user profile");
      return;
    }
    
    // Clear old course plan from localStorage
    localStorage.removeItem("coursePlan");
    
    setLoading(true);
    setError("");

    try {
      const res = await fetch("http://localhost:8000/api/course-orchestrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, pdfText, selectedReport, language: locale }),
      });

      if (!res.ok) {
        throw new Error(`API returned ${res.status}: ${res.statusText}`);
      }

      const data = (await res.json()) as OrchestrateResponse;

      if (!data.steps || !Array.isArray(data.steps)) {
        throw new Error("Invalid response: missing steps array");
      }

      // Validate that the response is in the requested language
      if (!validateStepsLanguage(data.steps, locale)) {
        console.warn(`Backend returned ${locale} but content appears to be in English. Using default ${locale} steps.`);
        // Use default steps in the requested language instead
        const defaultSteps = DEFAULT_STEPS_BY_LOCALE[locale as keyof typeof DEFAULT_STEPS_BY_LOCALE] || DEFAULT_STEPS_BY_LOCALE.en;
        data.steps = defaultSteps;
      }

      if (data.steps.length > 0) {
        setSteps(data.steps);
      }

      if (data.flashcardMode && isLearningMode(data.flashcardMode)) {
        setFlashcardMode(data.flashcardMode);
      }

      setHasPlan(true);

      localStorage.setItem(
        "coursePlan",
        JSON.stringify({
          hasPlan: true,
          steps: data.steps,
          flashcardMode: data.flashcardMode,
          topic: topic,
          pdfText: pdfText,
          pdfName: pdfName,
          selectedReport: selectedReport,
        })
      );
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error("Full error:", err);
      setError(`API Error: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-16">
      <div className="max-w-5xl mx-auto space-y-10">
        <div className="text-center space-y-3">
          <h1 className="text-3xl sm:text-4xl font-bold">{t.title}</h1>
          <p className="text-gray-600">
            {t.subtitle}
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-lg p-6 sm:p-8 space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-700">
              {t.topicLabel}
            </label>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={t.topicPlaceholder}
              className="w-full border-2 border-gray-200 focus:border-purple-400 rounded-xl px-4 py-3 text-base"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700">
                {t.profileLabel}
              </label>
              {reportsLoading ? (
                <div className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 bg-gray-50 text-gray-500">
                  {t.loading}
                </div>
              ) : reports.length > 0 ? (
                <select
                  value={selectedReport}
                  onChange={(e) => setSelectedReport(e.target.value)}
                  className="w-full border-2 border-gray-200 focus:border-purple-400 rounded-xl px-4 py-3 text-base"
                >
                  {reports.map((report) => (
                    <option key={report.name} value={report.name}>
                      {report.label}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 bg-gray-50 text-gray-500">
                  {t.noProfiles}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700">
                {t.pdfLabel}
              </label>
              <div className="border-2 border-dashed border-purple-200 rounded-xl p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <FileText className="w-5 h-5 text-purple-400" />
                  <span>{pdfName ?? t.noFileSelected}</span>
                </div>
                <label className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg cursor-pointer hover:bg-purple-200">
                  <Upload className="w-4 h-4" />
                  <span>{t.uploadPdf}</span>
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={handlePdfUpload}
                  />
                </label>
              </div>
            </div>
          </div>

          {pdfText && (
            <div className="text-xs text-gray-500">
              {t.extractedCharacters.replace('{count}', pdfText.length.toLocaleString())}
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-red-50 text-red-600 px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleAnalyze}
            disabled={!canAnalyze || loading}
            className="w-full inline-flex items-center justify-center gap-2 bg-purple-600 text-white px-8 py-3 rounded-xl shadow hover:scale-[1.01] transition disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Sparkles className="w-5 h-5" />
            )}
            {loading ? t.analyzing : t.analyze}
          </button>
        </div>

        {hasPlan && (
          <div className="relative w-full max-w-3xl mx-auto">
            <button
              onClick={resetFlow}
              className="absolute top-0 -right-10 text-red-500 transition p-2 rounded-lg bg-red-50"
              title={t.deletePlan}
            >
              <X className="w-5 h-5" />
            </button>
            <div className="absolute left-1/2 top-0 h-full w-1 bg-gray-300 -translate-x-1/2"></div>

            {steps.map((step, index) => {
              // Detect step type by index position (language-agnostic)
              // Order: Theory (0), Quiz (1), Flashcards (2), Mini Test (3)
              const stepType = index === 0 ? 'theory' : index === 1 ? 'quiz' : index === 2 ? 'flashcards' : 'minitest';

              const action = stepType === 'flashcards'
                ? actionMap.flashcards
                : stepType === 'quiz'
                ? actionMap.quiz
                : stepType === 'minitest'
                ? {
                    label: t.stepActions.takeMiniTest,
                    href: `/mini-test`,
                  }
                : stepType === 'theory'
                ? {
                    label: t.stepActions.openTheory,
                    href: `/theory?topic=${encodeURIComponent(topic.trim())}`,
                  }
                : null;

              return (
                <div
                  key={`${step.title}-${index}`}
                  className="relative flex items-center mb-16"
                >
                  <div className="absolute left-1/2 -translate-x-1/2 z-10 w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold">
                    {index + 1}
                  </div>

                  <div
                    className={`w-1/2 ${
                      index % 2 === 0
                        ? "ml-auto pl-12 text-left"
                        : "mr-auto pl-5 text-left"
                    }`}
                  >
                    <div className="bg-white border border-purple-100 p-4 rounded-xl shadow-lg w-fit max-w-xs">
                      <h2 className="font-bold text-purple-700">
                        {step.title}
                      </h2>

                      {/* ✅ Math-safe description rendering */}
                      <div className="text-sm text-gray-600 mb-3 prose prose-sm max-w-none">
                        <ReactMarkdown
                          remarkPlugins={[remarkMath]}
                          rehypePlugins={[rehypeKatex]}
                        >
                          {step.desc}
                        </ReactMarkdown>
                      </div>

                      {action && (
                        <Link
                          href={action.href}
                          className="inline-flex items-center gap-2 text-sm font-semibold text-purple-600 hover:text-purple-800"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          {action.label}
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
