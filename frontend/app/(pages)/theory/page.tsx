"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, ChangeEvent, useRef } from "react";
import {
  Volume2,
  VolumeX,
  Loader2,
  Send,
  MessageCircle,
  ArrowLeft,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Keyboard,
  Download,
  X,
  Eye,
  BookOpen,
} from "lucide-react";
import Link from "next/link";

import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { useLanguage } from '@/app/context/LanguageContext';

type Message = {
  role: "user" | "assistant";
  content: string;
};

interface ReadingMetrics {
  wordsRead: number;
  rereadCount: number;
  pauseCount: number;
  totalTime: number;
  avgSpeed: number;
}

export default function TheoryPage() {
  const { messages: i18nMessages, locale } = useLanguage();
  const t = i18nMessages.TheoryPage;
  const searchParams = useSearchParams();
  const urlTopic = searchParams.get("topic");

  const [theory, setTheory] = useState("");
  const [loading, setLoading] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [cognitiveProfile, setCognitiveProfile] = useState<any>(null);
  const [topic, setTopic] = useState("");
  const [chatWidth, setChatWidth] = useState(33); // percentage width
  const [isResizing, setIsResizing] = useState(false);
  const [flashcardMode, setFlashcardMode] = useState<string>("general"); // Track flashcard mode for reading mode suggestion

  // Reading Mode States
  const [useReadingMode, setUseReadingMode] = useState(false);
  const [words, setWords] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [displayWords, setDisplayWords] = useState<string[]>([]);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isReadingActive, setIsReadingActive] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(2000);
  const [wordsPerGroup, setWordsPerGroup] = useState<number>(3);
  const [bionicMode, setBionicMode] = useState<boolean>(true);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState<boolean>(false);
  const [metrics, setMetrics] = useState<ReadingMetrics>({
    wordsRead: 0,
    rereadCount: 0,
    pauseCount: 0,
    totalTime: 0,
    avgSpeed: 2000,
  });
  const startTimeRef = useRef<number>(0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Determine if reading mode should be suggested
  const shouldSuggestReadingMode = () => {
    // Check if flashcard mode indicates special learning needs
    if (flashcardMode === "dyslexia" || flashcardMode === "adhd") {
      console.log(`✅ Reading mode suggested based on flashcardMode: ${flashcardMode}`);
      return true;
    }
    
    // Fallback to cognitive profile if available
    if (!cognitiveProfile?.cognitiveScores) {
      console.log("❌ No cognitive profile available yet");
      return false;
    }
    
    const { attention, workingMemory, visualSpatial, auditoryProcessing } = cognitiveProfile.cognitiveScores;
    
    // Suggest reading mode for:
    // 1. Low attention
    // 2. Low working memory
    // 3. Dyslexia indicators (low visual-spatial + high auditory processing)
    const hasLowAttention = attention && attention < 40;
    const hasLowWorkingMemory = workingMemory && workingMemory < 40;
    const hasDyslexiaIndicators = (visualSpatial && visualSpatial < 40) && (auditoryProcessing && auditoryProcessing > 60);
    
    console.log(`Profile check - Attention: ${attention}, WorkingMemory: ${workingMemory}, VisualSpatial: ${visualSpatial}, AuditoryProcessing: ${auditoryProcessing}`);
    
    return hasLowAttention || hasLowWorkingMemory || hasDyslexiaIndicators;
  };

  // Load cached theory or generate new
  useEffect(() => {
    const generateTheory = async () => {
      console.log("=== THEORY PAGE LOADING ===");

      // Backend health check
      try {
        const healthRes = await fetch("http://localhost:8000/api/health", {
          signal: AbortSignal.timeout(15000),
        });
        if (!healthRes.ok) {
          throw new Error("Backend health check failed");
        }
      } catch (err: any) {
        console.error("Backend connectivity check failed:", err);
        setTheory(t.errorBackendNotReachable);
        setLoading(false);
        return;
      }

      const coursePlan = localStorage.getItem("coursePlan");

      let plan: any = null;
      let profile = null;

      if (coursePlan) {
        try {
          plan = JSON.parse(coursePlan);
          const actualTopic = urlTopic || plan.topic || "";
          setTopic(actualTopic);
          
          // Set flashcard mode early so reading mode suggestion is available immediately
          if (plan.flashcardMode) {
            setFlashcardMode(plan.flashcardMode);
            console.log(`Loaded flashcardMode from coursePlan: ${plan.flashcardMode}`);
          }

          if (plan.selectedReport) {
            try {
              const res = await fetch("http://localhost:8000/api/get-report", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reportName: plan.selectedReport }),
              });

              if (res.ok) {
                const data = await res.json();
                if (data.profile) {
                  profile = data.profile;
                  setCognitiveProfile(profile);
                  console.log("Successfully loaded cognitive profile");
                }
              }
            } catch (err) {
              console.warn("Failed to load report:", err);
            }
          }
        } catch (err) {
          console.error("Failed to load course plan:", err);
        }
      }

      const finalTopic = urlTopic || plan?.topic || "";
      setTopic(finalTopic);

      const cachedTheory = localStorage.getItem("lastTheory");
      const cachedTopic = localStorage.getItem("lastTheoryTopic");

      if (cachedTheory && cachedTopic === finalTopic && cachedTheory.length > 50) {
        setTheory(cachedTheory);
        setLoading(false);
        return;
      }

      if (cachedTheory && cachedTopic !== finalTopic) {
        localStorage.removeItem("lastTheory");
        localStorage.removeItem("lastTheoryTopic");
      }

      if (!finalTopic && !plan?.pdfText) {
        setTheory(t.noTopicProvided);
        setLoading(false);
        return;
      }

      try {
        const profileContext = profile
          ? `\n\nConsider this student's cognitive profile:\n${JSON.stringify(
              profile.cognitiveScores,
              null,
              2
            )}\nAdapt the explanation to their learning strengths.`
          : "";

        // Language mapping for instructions
        const languageNames: Record<string, string> = {
          en: "English",
          ta: "Tamil",
          kn: "Kannada",
          hi: "Hindi",
          te: "Telugu"
        };
        const langName = languageNames[locale] || "English";

        let prompt = "";
        if (plan?.pdfText) {
          prompt = `🚨 CRITICAL LANGUAGE REQUIREMENT 🚨\nLANGUAGE: ${langName.toUpperCase()} ONLY\nYOU MUST WRITE EVERYTHING IN ${langName.toUpperCase()}\n\nCreate simple, easy-to-understand theory content based ONLY on the following source content.\n\nSOURCE CONTENT:\n${plan.pdfText}\n\nIMPORTANT:\n- Write EVERYTHING in ${langName} language\n- Use simple words and short sentences in ${langName}\n- Keep it friendly and engaging\n- Max 300 words\n- NO English words allowed${profileContext}`;
        } else {
          prompt = `🚨 CRITICAL LANGUAGE REQUIREMENT 🚨\nLANGUAGE: ${langName.toUpperCase()} ONLY\nYOU MUST WRITE EVERYTHING IN ${langName.toUpperCase()}\n\nCreate simple, easy-to-understand theory content about "${finalTopic}" suitable for a child learner.\n\nIMPORTANT:\n- Write EVERYTHING in ${langName} language\n- Use simple words and short sentences in ${langName}\n- Include:\n  1. What is it? (Simple definition in ${langName})\n  2. Why is it important? (in ${langName})\n  3. Key concepts (2-3 points in ${langName})\n  4. Real-world example (in ${langName})\n\nKeep it friendly and engaging. Max 300 words.\nNO English words allowed - pure ${langName} only!${profileContext}`;
        }

        const res = await fetch("http://localhost:8000/api/gemini", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, language: locale }),
          signal: AbortSignal.timeout(180000), // 3 minutes timeout
        });

        if (!res.ok) {
          const errorData = await res.json();
          const errorMsg =
            errorData.detail ||
            errorData.message ||
            JSON.stringify(errorData);
          throw new Error(`API returned ${res.status}: ${errorMsg}`);
        }

        const data = await res.json();

        if (!data.ai_text) {
          throw new Error("Invalid response: missing ai_text field");
        }

        setTheory(data.ai_text);
        localStorage.setItem("lastTheory", data.ai_text);
        localStorage.setItem("lastTheoryTopic", finalTopic);
      } catch (err: any) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error("FINAL ERROR:", err);

        let displayError = errorMsg;
        if (errorMsg.includes("Failed to fetch")) {
          displayError =
            "Backend server not responding. Make sure http://localhost:8000 is running.";
        }

        setTheory(
          `Error: ${displayError}\n\nDebug Info:\n- Check browser console (F12 > Console tab) for step-by-step logs\n- All logs start with "Step X:"\n- Look for the first "FAILED" or "ERROR" message`
        );
      } finally {
        setLoading(false);
      }
    };

    generateTheory();
  }, [urlTopic]);

  useEffect(() => {
    return () => {
      speechSynthesis.cancel();
    };
  }, []);

  // Handle resize
  const handleMouseDown = () => {
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const container = document.getElementById("theory-container");
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const newWidth = ((containerRect.right - e.clientX) / containerRect.width) * 100;

      // Constrain between 20% and 60%
      if (newWidth >= 20 && newWidth <= 60) {
        setChatWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  // Strip markdown symbols for clean text-to-speech
  const stripMarkdownForSpeech = (text: string): string => {
    return text
      .replace(/#{1,6}\s?/g, '') // Remove headers
      .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.+?)\*/g, '$1') // Remove italic
      .replace(/_(.+?)_/g, '$1') // Remove italic underscore
      .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Remove links, keep text
      .replace(/`(.+?)`/g, '$1') // Remove inline code
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/^>\s?/gm, '') // Remove blockquotes
      .replace(/^[-*+]\s/gm, '') // Remove list markers
      .replace(/^\d+\.\s/gm, '') // Remove numbered list markers
      .replace(/\n{2,}/g, ' ') // Replace multiple newlines with space
      .trim();
  };

  const playText = (text: string) => {
    if (!text) return;
    speechSynthesis.cancel();
    
    // Strip markdown before speaking
    const cleanText = stripMarkdownForSpeech(text);
    
    // Wait for voices to load
    const speakWithVoice = () => {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      
      // Language mapping
      const languageCodes: Record<string, string> = {
        en: 'en',
        ta: 'ta',
        kn: 'kn',
        hi: 'hi',
        te: 'te'
      };
      const langCode = languageCodes[locale] || 'en';
      
      // Get available voices
      const voices = speechSynthesis.getVoices();
      
      // Find a voice that matches the language
      const matchingVoice = voices.find(voice => 
        voice.lang.toLowerCase().startsWith(langCode.toLowerCase())
      );
      
      if (matchingVoice) {
        utterance.voice = matchingVoice;
        utterance.lang = matchingVoice.lang;
        console.log(`Using voice: ${matchingVoice.name} (${matchingVoice.lang})`);
      } else {
        // Fallback to setting language code
        utterance.lang = `${langCode}-IN`;
        console.warn(`No ${langCode} voice found. Available voices:`, voices.map(v => v.lang));
      }
      
      utterance.rate = 0.9;
      utterance.pitch = 1.1;
      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = (e) => {
        console.error('Speech error:', e);
        setSpeaking(false);
      };
      
      speechSynthesis.speak(utterance);
    };
    
    // Ensure voices are loaded
    if (speechSynthesis.getVoices().length > 0) {
      speakWithVoice();
    } else {
      speechSynthesis.onvoiceschanged = () => {
        speakWithVoice();
      };
    }
  };

  const stopSpeaking = () => {
    speechSynthesis.cancel();
    setSpeaking(false);
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput.trim();
    setChatInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setChatLoading(true);

    try {
      const chatPrompt = `You are a helpful tutor teaching about "${topic}". 
A student asked: "${userMsg}"
The theory content is: ${theory}

Answer briefly, simply, and in a friendly way (2-3 sentences max). If the question is unrelated to the topic, gently guide them back.`;

      const res = await fetch("http://localhost:8000/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: chatPrompt }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        const errorMsg =
          errorData.detail ||
          errorData.message ||
          JSON.stringify(errorData);
        throw new Error(`API returned ${res.status}: ${errorMsg}`);
      }

      const data = await res.json();

      if (!data.ai_text) {
        throw new Error("Invalid response: missing ai_text field");
      }

      const botResponse = data.ai_text;
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: botResponse },
      ]);
      playText(botResponse);
    } catch (err: any) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error("CHAT API ERROR:", err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `❌ Error: ${errorMsg}` },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // ===== READING MODE FUNCTIONS =====
  // Strip markdown and HTML from text for voice reading
  const stripMarkdown = (text: string): string => {
    return text
      .replace(/#{1,6}\s+/g, "") // Remove headers (##, ###, etc)
      .replace(/\*\*(.+?)\*\*/g, "$1") // Remove bold
      .replace(/\*(.+?)\*/g, "$1") // Remove italic
      .replace(/\[(.+?)\]\(.+?\)/g, "$1") // Remove links
      .replace(/`(.+?)`/g, "$1") // Remove inline code
      .replace(/```[\s\S]*?```/g, "") // Remove code blocks
      .replace(/<[^>]*>/g, "") // Remove HTML tags
      .replace(/--\d+/g, "") // Remove special markers like --1
      .replace(/[-_]{2,}/g, "") // Remove multiple dashes/underscores
      .replace(/^[-\s]*/, "") // Remove leading dashes/spaces
      .trim();
  };

  // Break text into sentences and phrases for meaningful reading
  const splitIntoSentences = (text: string): string[] => {
    const plainText = stripMarkdown(text);
    // Split by sentence endings: . ! ? followed by space, or line breaks
    const sentences = plainText
      .split(/(?<=[.!?])\s+/)
      .filter((s) => s.trim().length > 0)
      .map((s) => s.trim());
    return sentences;
  };

  // Apply bionic reading to individual words in a sentence
  const processDyslexiaText = (text: string): string => {
    if (!bionicMode || text.length <= 2) return text;
    
    // Split into words
    const words = text.split(/\s+/);
    const processedWords = words.map((word) => {
      if (word.length <= 2) return word;
      const boldCount = Math.ceil(word.length / 2);
      const boldPart = word.slice(0, boldCount);
      const regularPart = word.slice(boldCount);
      return `<strong>${boldPart}</strong>${regularPart}`;
    });
    
    return processedWords.join(" ");
  };

  useEffect(() => {
    if (theory) {
      const sentences = splitIntoSentences(theory);
      setWords(sentences);
    }
  }, [theory]);

  useEffect(() => {
    if (!isReadingActive || words.length === 0) {
      setDisplayWords([]);
      return;
    }

    const currentSentence = words[currentIndex] || "";
    const processedSentence = processDyslexiaText(currentSentence);
    
    setDisplayWords([processedSentence]);

    let timeouts: NodeJS.Timeout[] = [];

    // Voice output - only speak if not paused
    if (voiceEnabled && currentSentence.length > 0 && !isPaused) {
      // Cancel any previous speech
      window.speechSynthesis.cancel();
      
      // Use clean text without markdown
      const cleanText = stripMarkdown(currentSentence);
      
      const speakSentence = () => {
        utteranceRef.current = new SpeechSynthesisUtterance(cleanText);
        
        // Language mapping
        const languageCodes: Record<string, string> = {
          en: 'en',
          ta: 'ta',
          kn: 'kn',
          hi: 'hi',
          te: 'te'
        };
        const langCode = languageCodes[locale] || 'en';
        
        // Get available voices
        const voices = window.speechSynthesis.getVoices();
        
        // Find a voice that matches the language
        const matchingVoice = voices.find(voice => 
          voice.lang.toLowerCase().startsWith(langCode.toLowerCase())
        );
        
        if (matchingVoice) {
          utteranceRef.current.voice = matchingVoice;
          utteranceRef.current.lang = matchingVoice.lang;
        } else {
          utteranceRef.current.lang = `${langCode}-IN`;
        }
        
        utteranceRef.current.rate = 0.85;
        utteranceRef.current.pitch = 1;
        
        // When speech finishes, automatically advance to next sentence
        utteranceRef.current.onend = () => {
          const advanceTimer = setTimeout(() => {
            if (currentIndex < words.length - 1) {
              setCurrentIndex((prevIndex) => prevIndex + 1);
              setMetrics((prev) => ({
                ...prev,
                wordsRead: prev.wordsRead + currentSentence.split(/\s+/).length,
              }));
            } else {
              // Reading completed
              setCurrentIndex(0);
              setIsReadingActive(false);
            }
          }, speed); // speed = pause duration after sentence completes
          timeouts.push(advanceTimer);
        };
        
        window.speechSynthesis.speak(utteranceRef.current);
      };
      
      // Ensure voices are loaded
      if (window.speechSynthesis.getVoices().length > 0) {
        speakSentence();
      } else {
        window.speechSynthesis.onvoiceschanged = () => {
          speakSentence();
        };
      }
    } else if (!voiceEnabled && !isPaused && currentSentence.length > 0) {
      // Auto-advance WITHOUT voice - just move to next sentence after speed delay
      const advanceTimer = setTimeout(() => {
        if (currentIndex < words.length - 1) {
          setCurrentIndex((prevIndex) => prevIndex + 1);
          setMetrics((prev) => ({
            ...prev,
            wordsRead: prev.wordsRead + currentSentence.split(/\s+/).length,
          }));
        } else {
          // Reading completed
          setCurrentIndex(0);
          setIsReadingActive(false);
        }
      }, speed); // Automatically advance after speed milliseconds
      timeouts.push(advanceTimer);
    }

    return () => {
      // Clean up all timeouts
      timeouts.forEach((timer) => clearTimeout(timer));
      window.speechSynthesis.cancel();
    };
  }, [
    currentIndex,
    words,
    isReadingActive,
    isPaused,
    speed,
    bionicMode,
    voiceEnabled,
    locale,
  ]);

  useEffect(() => {
    if (!isReadingActive) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        toggleReadingPause();
      }
      if (e.code === "ArrowLeft") {
        e.preventDefault();
        handlePrevGroup();
      }
      if (e.code === "ArrowRight") {
        e.preventDefault();
        handleNextGroup();
      }
      if (e.code === "ArrowUp") {
        e.preventDefault();
        setSpeed((prev) => Math.max(1000, prev - 500));
      }
      if (e.code === "ArrowDown") {
        e.preventDefault();
        setSpeed((prev) => Math.min(5000, prev + 500));
      }
      if (e.code === "KeyV") {
        e.preventDefault();
        setVoiceEnabled((prev) => !prev);
      }
      if (e.code === "Escape") {
        e.preventDefault();
        stopReading();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [isReadingActive, speed]);

  const handlePrevGroup = (): void => {
    setCurrentIndex((prevIndex) =>
      Math.max(0, prevIndex - 1)
    );
    setMetrics((prev) => ({
      ...prev,
      rereadCount: prev.rereadCount + 1,
    }));
  };

  const handleNextGroup = (): void => {
    setCurrentIndex((prevIndex) =>
      Math.min(words.length - 1, prevIndex + 1)
    );
  };

  const toggleReadingPause = (): void => {
    setIsPaused((prev) => !prev);
    setMetrics((prev) => ({
      ...prev,
      pauseCount: prev.pauseCount + 1,
    }));

    // Stop voice immediately when pausing
    window.speechSynthesis.cancel();
  };

  const startReading = (): void => {
    if (words.length > 0) {
      setIsReadingActive(true);
      setCurrentIndex(0);
      setIsPaused(false);
      startTimeRef.current = Date.now();
      setMetrics({
        wordsRead: 0,
        rereadCount: 0,
        pauseCount: 0,
        totalTime: 0,
        avgSpeed: speed,
      });
    }
  };

  const stopReading = (): void => {
    setIsReadingActive(false);
    setCurrentIndex(0);
    setIsPaused(false);

    const totalTime = Date.now() - startTimeRef.current;
    setMetrics((prev) => ({
      ...prev,
      totalTime,
    }));

    if (voiceEnabled) {
      window.speechSynthesis.cancel();
    }
  };

  const getWordColor = (index: number): string => {
    const colors = [
      "text-purple-600",
      "text-purple-700",
      "text-purple-800",
      "text-indigo-600",
      "text-indigo-700",
      "text-violet-600",
    ];
    return colors[index % colors.length];
  };

  const progress =
    words.length === 0
      ? 0
      : Math.min(100, (currentIndex / (words.length - 1)) * 100);

  if (useReadingMode && theory) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-8 transition-colors duration-500">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <button
              onClick={() => {
                setUseReadingMode(false);
                stopReading();
              }}
              className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-800 font-semibold mb-4"
            >
              <ArrowLeft className="w-5 h-5" />
              {t.backToNormalView}
            </button>
            <h1 className="text-4xl font-bold text-purple-900 mb-2">
              📖 {t.readingMode}
            </h1>
            <p className="text-purple-700">{t.focusOptimizedReading}</p>
          </div>

          {!isReadingActive ? (
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-purple-900 mb-2">
                    {t.timePerSentence}: {speed / 1000}s
                  </label>
                  <input
                    type="range"
                    min="1000"
                    max="6000"
                    step="500"
                    value={speed}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setSpeed(Number(e.target.value))
                    }
                    className="w-full accent-purple-500"
                  />
                  <p className="text-xs text-purple-600 mt-1">Adjust reading speed</p>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bionicMode}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setBionicMode(e.target.checked)
                      }
                      className="w-4 h-4 accent-purple-500"
                    />
                    <span className="text-sm text-purple-900">
                      {t.bionicReading}
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={voiceEnabled}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setVoiceEnabled(e.target.checked)
                      }
                      className="w-4 h-4 accent-purple-500"
                    />
                    <span className="text-sm text-purple-900">
                      {t.voiceNarration}
                    </span>
                  </label>
                </div>
              </div>

              <button
                onClick={startReading}
                disabled={words.length === 0}
                className="w-full bg-purple-500 hover:bg-purple-600 disabled:bg-purple-300 text-white font-semibold py-4 rounded-lg transition-colors duration-200"
              >
                Start Reading Mode
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-xl p-8 relative">
              <button
                onClick={stopReading}
                className="absolute -top-1 right-1 p-2 hover:bg-purple-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-purple-700" />
              </button>

              <div className="relative w-full h-2 bg-purple-200 mb-12 rounded-full overflow-hidden">
                <div
                  className="absolute h-full bg-purple-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="min-h-[400px] flex flex-col items-center justify-center mb-8 bg-white rounded-2xl p-12 shadow-lg border-2 border-purple-200">
                <p className="text-sm text-gray-500 mb-6 font-medium">Sentence {currentIndex + 1} of {words.length}</p>
                {words.length > 0 ? (
                  <div className="w-full text-center">
                    <p
                      className="text-3xl md:text-4xl font-normal text-purple-900 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: displayWords[0] || "" }}
                      style={{
                        '--strong-weight': '900',
                      } as React.CSSProperties}
                    />
                  </div>
                ) : (
                  <p className="text-gray-400">Click "Start Reading Mode" to begin</p>
                )}
              </div>

              <style>{`
                p strong {
                  font-weight: 900;
                  color: inherit;
                }
                p {
                  font-weight: 500;
                }
              `}</style>

              <div className="mt-4 p-4 bg-purple-50 rounded-lg max-h-40 overflow-y-auto text-sm">
                <p className="text-xs font-semibold text-purple-700 mb-2">Sentences:</p>
                {words.map((sentence, idx) => (
                  <div
                    key={idx}
                    className={`mb-2 p-2 rounded transition-all ${
                      idx === currentIndex
                        ? "bg-yellow-200 font-semibold text-purple-900"
                        : "text-gray-600"
                    }`}
                  >
                    {sentence}
                  </div>
                ))}
              </div>

              <div className="flex gap-4 justify-center mt-6">
                <button
                  onClick={handlePrevGroup}
                  disabled={currentIndex === 0}
                  className="bg-purple-500 hover:bg-purple-600 disabled:bg-purple-300 text-white p-4 rounded-full transition-colors"
                  title="Previous sentence"
                >
                  <SkipBack className="h-6 w-6" />
                </button>

                <button
                  onClick={toggleReadingPause}
                  className="bg-purple-500 hover:bg-purple-600 text-white p-4 rounded-full transition-colors"
                  title="Pause/Play"
                >
                  {isPaused ? (
                    <Play className="h-6 w-6" />
                  ) : (
                    <Pause className="h-6 w-6" />
                  )}
                </button>

                <button
                  onClick={handleNextGroup}
                  disabled={currentIndex >= words.length - 1}
                  className="bg-purple-500 hover:bg-purple-600 disabled:bg-purple-300 text-white p-4 rounded-full transition-colors"
                  title="Next sentence"
                >
                  <SkipForward className="h-6 w-6" />
                </button>

                <button
                  onClick={() => setVoiceEnabled(!voiceEnabled)}
                  className={`${
                    voiceEnabled
                      ? "bg-green-500 hover:bg-green-600"
                      : "bg-gray-400 hover:bg-gray-500"
                  } text-white p-4 rounded-full transition-colors`}
                >
                  {voiceEnabled ? (
                    <Volume2 className="h-6 w-6" />
                  ) : (
                    <VolumeX className="h-6 w-6" />
                  )}
                </button>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-3">
                <div className="bg-blue-50 p-3 rounded-lg text-center">
                  <p className="text-xs text-blue-600">Sentences</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {currentIndex + 1}/{words.length}
                  </p>
                </div>
                <div className="bg-orange-50 p-3 rounded-lg text-center">
                  <p className="text-xs text-orange-600">Rereads</p>
                  <p className="text-2xl font-bold text-orange-700">
                    {metrics.rereadCount}
                  </p>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg text-center">
                  <p className="text-xs text-purple-600">Pace</p>
                  <p className="text-2xl font-bold text-purple-700">
                    {speed / 1000}s
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <button
                  onClick={() =>
                    setShowKeyboardHelp(!showKeyboardHelp)
                  }
                  className="w-full text-purple-700 hover:bg-purple-50 py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-2"
                >
                  <Keyboard className="w-4 h-4" />
                  Keyboard Shortcuts
                </button>
              </div>

              {showKeyboardHelp && (
                <div className="mt-4 p-4 bg-purple-50 rounded-lg text-sm">
                  <h4 className="font-bold mb-2">Keyboard Shortcuts:</h4>
                  <ul className="space-y-1 text-gray-700">
                    <li>
                      <kbd className="bg-white px-2 py-1 rounded">Space</kbd> -
                      Pause/Play
                    </li>
                    <li>
                      <kbd className="bg-white px-2 py-1 rounded">←</kbd> -
                      Previous group
                    </li>
                    <li>
                      <kbd className="bg-white px-2 py-1 rounded">→</kbd> -
                      Next group
                    </li>
                    <li>
                      <kbd className="bg-white px-2 py-1 rounded">↑</kbd> -
                      Speed up
                    </li>
                    <li>
                      <kbd className="bg-white px-2 py-1 rounded">↓</kbd> -
                      Slow down
                    </li>
                    <li>
                      <kbd className="bg-white px-2 py-1 rounded">V</kbd> -
                      Toggle voice
                    </li>
                    <li>
                      <kbd className="bg-white px-2 py-1 rounded">Esc</kbd> -
                      Exit
                    </li>
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <style jsx>{`
          /* Styles for reading mode */
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-purple-50 to-pink-50 p-4 sm:p-8">
      <div className="max-w-8xl mx-auto">
        {/* Header with Back Button on Left */}
        <div className="mb-8">
          <Link
            href="/course"
            className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-800 font-semibold mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            {t.backToCourse}
          </Link>
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-3xl font-bold text-purple-700">
              📚 {t.theory}: {topic}
            </h1>
            {shouldSuggestReadingMode() && (
              <button
                onClick={() => setUseReadingMode(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all bg-purple-500 text-white "
              >
                <Eye className="w-5 h-5" />
                {t.enableReadingMode}
              </button>
            )}
          </div>
        </div>

        <div id="theory-container" className="flex gap-0 relative">
          {/* ===== THEORY PANEL ===== */}
          <div style={{ width: `${100 - chatWidth}%` }} className="pr-3">
            <div className="bg-white rounded-3xl shadow-lg p-6 sm:p-8">
              <div className="flex gap-3 mb-6">
                {theory && (
                  <button
                    onClick={() =>
                      speaking ? stopSpeaking() : playText(theory)
                    }
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all ${
                      speaking
                        ? "bg-red-500 text-white hover:bg-red-600"
                        : "bg-blue-500 text-white hover:bg-blue-600"
                    }`}
                  >
                    {speaking ? (
                      <>
                        <VolumeX className="w-5 h-5" />
                        {t.stopSpeaking}
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-5 h-5" />
                        {t.readAloud}
                      </>
                    )}
                  </button>
                )}
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-12 h-12 animate-spin text-purple-500 mb-4" />
                  <p className="text-gray-600 font-semibold">
                    {t.loadingTheory}
                  </p>
                </div>
              ) : (
                <div className="prose prose-lg max-w-none leading-relaxed">
                  {/* ✅ Math-safe theory rendering with proper spacing */}
                  <ReactMarkdown
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={{
                      p: ({ children }) => (
                        <p className="mb-4 leading-relaxed text-gray-700 text-base">
                          {children}
                        </p>
                      ),
                      h1: ({ children }) => (
                        <h1 className="text-2xl font-bold mb-4 mt-6 text-gray-900">
                          {children}
                        </h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-xl font-bold mb-3 mt-5 text-gray-800">
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-lg font-semibold mb-2 mt-4 text-gray-800">
                          {children}
                        </h3>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc list-inside mb-4 space-y-2 ml-4">
                          {children}
                        </ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal list-inside mb-4 space-y-2 ml-4">
                          {children}
                        </ol>
                      ),
                      li: ({ children }) => (
                        <li className="ml-2 text-gray-700 leading-relaxed">
                          {children}
                        </li>
                      ),
                      strong: ({ children }) => (
                        <strong className="font-semibold text-gray-900">
                          {children}
                        </strong>
                      ),
                      em: ({ children }) => (
                        <em className="italic text-gray-700">{children}</em>
                      ),
                      code: ({ children }) => (
                        <code className="bg-purple-50 text-purple-700 px-2 py-1 rounded text-sm font-mono">
                          {children}
                        </code>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-purple-300 pl-4 my-4 italic text-gray-700">
                          {children}
                        </blockquote>
                      ),
                    }}
                  >
                    {theory}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </div>

          {/* ===== RESIZE DIVIDER ===== */}
          <div
            onMouseDown={handleMouseDown}
            className={`w-1 bg-purple-200 hover:bg-purple-400 cursor-col-resize transition-colors flex-shrink-0 ${
              isResizing ? "bg-purple-500" : ""
            }`}
            style={{ minWidth: "4px" }}
          />

          {/* ===== CHAT PANEL ===== */}
          <div style={{ width: `${chatWidth}%` }} className="pl-3">
            <div className="bg-white rounded-3xl shadow-lg p-6 flex flex-col sticky top-8 h-[calc(100vh-4rem)]">
              <div className="flex items-center gap-2 mb-4 pb-4 border-b-2 border-purple-100">
                <MessageCircle className="w-6 h-6 text-purple-600" />
                <h2 className="font-bold text-gray-800">Tutor Chat</h2>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                {messages.length === 0 && (
                  <div className="text-center text-gray-500 text-sm py-4">
                    <p>Ask me anything about this topic! 👋</p>
                  </div>
                )}

                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-xs px-4 py-2 rounded-xl text-sm ${
                        msg.role === "user"
                          ? "bg-purple-500 text-white rounded-br-none"
                          : "bg-gray-100 text-gray-800 rounded-bl-none"
                      }`}
                    >
                      {/* ✅ Math-safe chat rendering */}
                      <ReactMarkdown
                        remarkPlugins={[remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                ))}

                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded-xl text-sm rounded-bl-none">
                      <div className="flex gap-2 items-center">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        />
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0.4s" }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <form onSubmit={handleChatSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={t.askQuestion}
                  disabled={chatLoading}
                  className="flex-1 border-2 border-purple-200 focus:border-purple-400 rounded-xl px-3 py-2 text-sm focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={chatLoading || !chatInput.trim()}
                  className="bg-purple-500 text-white rounded-xl px-3 py-2 hover:bg-purple-600 disabled:opacity-50 transition-all"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}