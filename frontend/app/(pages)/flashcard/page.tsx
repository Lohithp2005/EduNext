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

  const [theoryContent, setTheoryContent] = useState<string | undefined>(
    undefined
  );

  const initialMode = isLearningMode(modeParam) ? modeParam : undefined;

  useEffect(() => {
    if (fromCourse) {
      const cachedTheory = localStorage.getItem("lastTheory") || "";
      setTheoryContent(cachedTheory);
    }
  }, [fromCourse]);

  return (
    <FlashcardExperience
      initialMode={initialMode}
      skipModeSelection={!!initialMode}
      initialLessonText={fromCourse ? theoryContent : undefined}
      skipInput={fromCourse}
    />
  );
}
