"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import FlashcardExperience from "@/app/components/FlashcardExperience";

type LearningMode = "adhd" | "dyslexia" | "autism" | "general";

const isLearningMode = (value: string | null): value is LearningMode =>
  value === "adhd" ||
  value === "dyslexia" ||
  value === "autism" ||
  value === "general";

export default function Page() {
  const searchParams = useSearchParams();
  const modeParam = searchParams.get("mode");
  const fromCourse = searchParams.get("from") === "course";
  const topicParam = searchParams.get("topic");

  const [theoryContent, setTheoryContent] = useState<string>("");
  const [isReady, setIsReady] = useState(false);
  const [resolvedTopic, setResolvedTopic] = useState<string | null>(null);

  const initialMode = isLearningMode(modeParam) ? modeParam : undefined;

  useEffect(() => {
    if (!fromCourse) {
      setResolvedTopic(topicParam || null);
      setIsReady(true);
      return;
    }

    const cachedTheory = localStorage.getItem("lastTheory") || "";
    let planTopic = "";
    let planText = "";

    const planRaw = localStorage.getItem("coursePlan");
    if (planRaw) {
      try {
        const parsed = JSON.parse(planRaw);
        planTopic = parsed.topic || "";
        planText = parsed.pdfText || "";
      } catch {
        // Ignore malformed cache
      }
    }

    const finalTopic = topicParam || planTopic || "";
    setResolvedTopic(finalTopic || null);

    const finalTheory = cachedTheory || planText || finalTopic;
    setTheoryContent(finalTheory);

    // Only set ready after content is loaded
    setTimeout(() => setIsReady(true), 100);
  }, [fromCourse, topicParam]);

  // Wait until theory content is loaded if coming from course
  if (fromCourse && !isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
        <div className="text-center">
          <div className="animate-spin mb-4 inline-block">
            <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full"></div>
          </div>
          <p className="text-slate-600 font-semibold">Loading flashcards...</p>
        </div>
      </div>
    );
  }

  return (
    <FlashcardExperience
      initialMode={initialMode}
      skipModeSelection={!!initialMode}
      initialLessonText={fromCourse && theoryContent ? theoryContent : undefined}
      skipInput={fromCourse && !!theoryContent}
      initialTopic={resolvedTopic || undefined}
    />
  );
}
