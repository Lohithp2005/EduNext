"use client";

import Card2 from "@/app/components/card2";
import { Activity, Brain, Eye, FileText, HelpCircle } from "lucide-react";

const page = () => {
  return (
    <div className="min-h-screen max-w-screen p-5 bg-white flex  gap-10 mx-auto">
     <Card2
  href="/dot"
  title="Child Profiling"
  description="gamified assessment to understand learning styles, strengths, and challenges."
  tags={["Diagnostics", "Personalized"]}
  badge="AI Analysis"
  colorScheme="violet"
  buttonText="Start Learning"
  floatingIcons={[
    { icon: <Brain className="w-5 h-5 text-white" />, key: "brain", className: "top-4 right-4", delay: "0s" },
    { icon: <Eye className="w-5 h-5 text-white" />, key: "eye", className: "top-14 right-19", delay: "0.2s" },
    { icon: <FileText className="w-5 h-5 text-white" />, key: "file", className: "bottom-6 right-6", delay: "0.4s" },
    { icon: <Activity className="w-5 h-5 text-white" />, key: "activity", className: "bottom-3 right-24", delay: "0.6s" },
  ]}
/>
  
     
      <Card2
        href="/quiz2"
        title="AI Cartoon Quiz Generator"
        description="Generate fun,engaging, personalized quizzes instantly based on your learning level."
        tags={["Fun", "AI Generated"]}
        badge="Quiz"
        colorScheme="orange"
        headerIcon={<HelpCircle className="w-6 h-6 text-white" />}
        buttonText="Start Learning"
      />
    </div>
  );
};

export default page;
