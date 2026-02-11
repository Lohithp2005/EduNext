'use client';

import Card2 from '@/app/components/card2';
import { Hand, Pointer, MousePointerClick, HelpCircle, BookOpen, Mic, Sparkles, Brain, Eye, FileText, Activity, Book, Focus, Zap, Scroll, PenTool, GitBranch, Layers } from "lucide-react";
import React from 'react';
import Image from 'next/image';
import { useLanguage } from '@/app/context/LanguageContext';

const page = () => {
  const { messages } = useLanguage();
  const c = messages.Common;
  
  return (
    <div className="min-h-screen max-w-screen p-5 bg-white
                flex flex-col  items-center  gap-6 md:grid md:grid-cols-4 mt-5 mx-auto
                md:justify-items-center md:items-start">
                        <Card2
        href="/test"
        title={messages.Cards.childProfiling.title}
        description={messages.Cards.childProfiling.description}
        tags={[c.diagnostics, c.personalized]}
        badge={c.aiAnalysis}
        colorScheme="violet"
        buttonText={c.startLearning}
        floatingIcons={[
          { icon: <Brain className="w-5 h-5 text-white" />, key: "brain", className: "top-4 right-4", delay: "0s" },
          { icon: <Eye className="w-5 h-5 text-white" />, key: "eye", className: "top-14 right-19", delay: "0.2s" },
          { icon: <FileText className="w-5 h-5 text-white" />, key: "file", className: "bottom-6 right-6", delay: "0.4s" },
          { icon: <Activity className="w-5 h-5 text-white" />, key: "activity", className: "bottom-3 right-24", delay: "0.6s" },
        ]}
      />

      <Card2
        href="/course"
        title={messages.Cards.studyPath.title}
        description={messages.Cards.studyPath.description}
        tags={[c.personalizedLearningPath]}
        badge={c.courseAi}
        colorScheme="cyan"
        buttonText={c.startLearning}
        floatingIcons={[
          { icon: <BookOpen className="w-5 h-5 text-white" />, key: "book", className: "top-4 right-4", delay: "0s" },
          { icon: <GitBranch className="w-5 h-5 text-white" />, key: "flow", className: "top-14 right-20", delay: "0.2s" },
          { icon: <Layers className="w-5 h-5 text-white" />, key: "layers", className: "bottom-6 right-6", delay: "0.4s" },
          { icon: <Sparkles className="w-5 h-5 text-white" />, key: "sparkles", className: "bottom-3 right-24", delay: "0.6s" },
        ]}
      />

      <Card2
        href="/quiz-choice"
        title={messages.Cards.quiz.title}
        description={messages.Cards.quiz.description}
        tags={[c.fun, c.aiGeneratedQuiz]}
        badge={c.quiz}
        colorScheme="orange"
        headerIcon={<HelpCircle className="w-6 h-6 text-white" />}
        floatingIcons={[]}
        buttonText={c.startLearning}
      />

      <Card2
        href="/flashcard"
        title={messages.Cards.flashcards.title}
        description={messages.Cards.flashcards.description}
        tags={[c.reading, c.visual, c.audio]}
        badge={c.lesson}
        colorScheme="green"
        headerIcon={<BookOpen className="w-6 h-6 text-white" />}
        floatingIcons={[]}
        buttonText={c.startLearning}
      />



      <Card2
        href="/reading"
        title={messages.Cards.adhd.title}
        description={messages.Cards.adhd.description}
        tags={[c.focusMode, c.personalized]}
        badge={c.readingMode}
        colorScheme="red"
        buttonText={c.startLearning}
        floatingIcons={[
          { icon: <Book className="w-5 h-5 text-white" />, key: "book", className: "top-4 right-4", delay: "0s" },
          { icon: <Eye className="w-5 h-5 text-white" />, key: "eye", className: "top-14 right-19", delay: "0.2s" },
          { icon: <Focus className="w-5 h-5 text-white" />, key: "focus", className: "bottom-6 right-6", delay: "0.4s" },
          { icon: <Zap className="w-5 h-5 text-white" />, key: "zap", className: "bottom-3 right-24", delay: "0.6s" },
        ]}
      />

      <Card2
        href="/story"
        title={messages.Cards.story.title}
        description={messages.Cards.story.description}
        tags={[c.creativity, c.writing, c.interactive]}
        badge={c.aiTool}
        colorScheme="yellow"
        buttonText={c.startLearning}
        floatingIcons={[
          { icon: <Book className="w-5 h-5 text-white" />, key: "book", className: "top-4 right-4", delay: "0s" },
          { icon: <PenTool className="w-5 h-5 text-white" />, key: "pen", className: "top-14 right-16", delay: "0.2s" },
          { icon: <Sparkles className="w-5 h-5 text-white" />, key: "sparkles", className: "bottom-6 right-6", delay: "0.4s" },
          { icon: <Scroll className="w-5 h-5 text-white" />, key: "scroll", className: "bottom-3 right-20", delay: "0.6s" },
        ]}
      />
       <Card2
        href="/camera"
        title={messages.Cards.camera.title}
        description={messages.Cards.camera.description}
        tags={[c.realTime, c.voiceAi, c.handsOn]}
        badge={c.interactive}
        colorScheme="lime"
        buttonText={c.startLearning}
        floatingIcons={[
          { icon: <Hand className="w-5 h-5 text-white" />, key: "hand", className: "top-4 right-4", delay: "0s" },
          { icon: <Pointer className="w-5 h-5 text-white" />, key: "pointer", className: "top-16 right-20", delay: "0.3s" },
          { icon: <MousePointerClick className="w-5 h-5 text-white" />, key: "click", className: "bottom-6 right-8", delay: "0.5s" },
        ]}
      />
    <Card2
        href="/speech"
        title={messages.Cards.speechHelper.title}
        description={messages.Cards.speechHelper.description}
        tags={[c.speechTherapy, c.aiAnalysis]}
        badge={c.therapy}
        colorScheme="blue"
        buttonText={c.startLearning}
        floatingIcons={[
          { icon: <Mic className="w-5 h-5 text-white" />, key: "mic1", className: "top-4 right-4", delay: "0s" },
          { icon: <Sparkles className="w-5 h-5 text-white" />, key: "sparkle2", className: "bottom-6 right-8", delay: "0.4s" },
        ]}
      />
    </div>
  );
};

export default page;
