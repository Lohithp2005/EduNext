"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import AdaptiveQuiz from "@/app/components/AdaptiveQuiz";

export default function Page() {
  const searchParams = useSearchParams();
  const [resolvedTopic, setResolvedTopic] = useState("");

  useEffect(() => {
    let topic = searchParams.get("topic") || "";
    if (!topic) {
      const planRaw = localStorage.getItem("coursePlan");
      if (planRaw) {
        try {
          const parsed = JSON.parse(planRaw);
          topic = parsed.topic || "";
        } catch {
          // Ignore malformed cache
        }
      }
    }
    setResolvedTopic(topic);
  }, [searchParams]);

  return (
    <AdaptiveQuiz
      initialTopic={resolvedTopic || undefined}
      autoStart={!!resolvedTopic}
    />
  );
}
