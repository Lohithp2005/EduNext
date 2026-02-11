"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Volume2, CheckCircle, AlertCircle, Lightbulb, RotateCw, TrendingUp } from "lucide-react";

type AnalysisResult = {
  transcript: string;
  fluencyScore: number;
  issues: string[];
  suggestions: string[];
  strengths: string[];
  wordCount: number;
  speakingRate: number;
};

export default function SpeechAnalysis() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"practice" | "analyze" | "word-practice">("practice");
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
  
  // Word practice state
  const [displayedText, setDisplayedText] = useState("The cat sat on the mat");
  const [spokenText, setSpokenText] = useState("");
  const [pronunciationResults, setPronunciationResults] = useState<{[key: string]: boolean}>({});
  const [practiceWords, setPracticeWords] = useState<string[]>([]);
  const [isListeningWord, setIsListeningWord] = useState(false);

  useEffect(() => {
    // Initialize speech recognition
    if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      
      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + " ";
          }
        }
        if (finalTranscript) {
          if (mode === "word-practice") {
            setSpokenText(prev => prev + finalTranscript);
            checkPronunciation(finalTranscript.trim());
          } else {
            setTranscript(prev => prev + finalTranscript);
          }
        }
      };
      
      recognitionRef.current.onend = () => {
        setIsListeningWord(false);
      };
    }
  }, [mode]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const audioUrl = URL.createObjectURL(blob);
        setRecordedAudio(audioUrl);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setTranscript("");
      
      if (recognitionRef.current) {
        recognitionRef.current.start();
      }
    } catch (err) {
      setError("Microphone access denied. Please allow microphone access.");
      console.error(err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    }
  };

  const analyzeWithAI = async () => {
    if (!transcript.trim()) {
      setError("No speech detected. Please try recording again.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Analyze this speech transcript for a student with potential speech/language difficulties:

"${transcript}"

Provide analysis in this EXACT JSON format (no markdown, no extra text):
{
  "fluencyScore": 85,
  "issues": ["Possible repetition of 'the'", "Long pause detected"],
  "suggestions": ["Practice breathing techniques", "Slow down when speaking"],
  "strengths": ["Clear pronunciation", "Good vocabulary"],
  "wordCount": ${transcript.split(' ').length},
  "speakingRate": 120
}

Be encouraging and supportive. Focus on strengths first, then gentle suggestions.`
        }),
      });

      const data = await res.json();
      let text = data.ai_text.replace(/```json/g, "").replace(/```/g, "").trim();
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        setAnalysis(result);
      } else {
        throw new Error("Could not parse analysis");
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(`Analysis error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const practicePrompts = [
    "My name is... and I am... years old.",
    "My favorite subject is... because...",
    "Today I feel... because...",
    "I like to play... with my friends.",
    "My family has... people in it."
  ];

  const [currentPrompt, setCurrentPrompt] = useState(practicePrompts[0]);

  const getNewPrompt = () => {
    const randomPrompt = practicePrompts[Math.floor(Math.random() * practicePrompts.length)];
    setCurrentPrompt(randomPrompt);
    setTranscript("");
    setRecordedAudio(null);
    setAnalysis(null);
  };

  // Word practice functions
  const startWordPractice = () => {
    if (recognitionRef.current) {
      setSpokenText("");
      setPronunciationResults({});
      setIsListeningWord(true);
      recognitionRef.current.start();
    }
  };

  const stopWordPractice = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListeningWord(false);
    }
  };

  const checkPronunciation = (spokenPhrase: string) => {
    const displayWords = displayedText.toLowerCase().split(' ');
    const spokenWords = spokenPhrase.toLowerCase().split(' ');
    
    const newResults: {[key: string]: boolean} = {...pronunciationResults};
    
    displayWords.forEach(word => {
      if (spokenWords.some(spoken => spoken.includes(word) || word.includes(spoken))) {
        newResults[word] = true;
      }
    });
    
    setPronunciationResults(newResults);
    
    // Find words that need practice
    const wordsNeedingPractice = displayWords.filter(word => !newResults[word]);
    if (wordsNeedingPractice.length > 0 && practiceWords.length === 0) {
      generateSimilarWords(wordsNeedingPractice[0]);
    }
  };

  const generateSimilarWords = async (word: string) => {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `Generate 5 similar words to "${word}" for pronunciation practice. Words should be similar in sound or difficulty. Return ONLY a JSON array like: ["word1", "word2", "word3", "word4", "word5"]`
          }]
        })
      });
      
      const data = await res.json();
      const text = data.content[0].text;
      const match = text.match(/\[.*\]/);
      if (match) {
        const words = JSON.parse(match[0]);
        setPracticeWords(words);
      }
    } catch (err) {
      console.error("Error generating similar words:", err);
    }
  };

  const nextPracticeSentence = () => {
    const sentences = [
      "The cat sat on the mat",
      "A quick brown fox jumps over the lazy dog",
      "The sun shines bright today",
      "I love to read books every day",
      "Birds fly high in the blue sky",
      "My dog likes to play fetch",
      "We went to the park yesterday",
      "The moon glows softly at night",
      "Rain falls gently on the roof",
      "Flowers bloom in the spring garden"
    ];
    const randomSentence = sentences[Math.floor(Math.random() * sentences.length)];
    setDisplayedText(randomSentence);
    setSpokenText("");
    setPronunciationResults({});
    setPracticeWords([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full shadow-lg mb-4">
            <Mic className="w-5 h-5 text-indigo-500" />
            <span className="text-sm font-semibold text-indigo-700">Speech & Language Helper</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            Practice Your Speech 🎤
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">AI-powered analysis to help you speak with confidence</p>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setMode("practice")}
            className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
              mode === "practice"
                ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            🎯 Guided Practice
          </button>
          <button
            onClick={() => setMode("word-practice")}
            className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
              mode === "word-practice"
                ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            📖 Word Practice
          </button>
          <button
            onClick={() => setMode("analyze")}
            className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
              mode === "analyze"
                ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            🔍 Free Speech
          </button>
        </div>

        {/* Practice Mode */}
        {mode === "practice" && (
          <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 mb-6">
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 mb-6 border-2 border-indigo-200">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-6 h-6 text-indigo-600" />
                <h3 className="text-lg font-bold text-indigo-900">Practice Prompt</h3>
              </div>
              <p className="text-2xl font-bold text-gray-800 mb-4">{currentPrompt}</p>
              <button
                onClick={getNewPrompt}
                className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-semibold"
              >
                <RotateCw className="w-4 h-4" />
                Get New Prompt
              </button>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-lg mb-6">
              <p className="text-sm text-blue-800">
                <span className="font-bold">💡 Tip:</span> Take a deep breath, speak slowly, and don't worry about mistakes. You're doing great!
              </p>
            </div>
          </div>
        )}

        {/* Word Practice Mode */}
        {mode === "word-practice" && (
          <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 mb-6">
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 mb-6 border-2 border-indigo-200">
              <div className="flex items-center gap-2 mb-4">
                <Volume2 className="w-6 h-6 text-indigo-600" />
                <h3 className="text-lg font-bold text-indigo-900">Read This Text Aloud</h3>
              </div>
              <div className="text-3xl font-bold text-gray-800 mb-6 leading-relaxed">
                {displayedText.split(' ').map((word, idx) => (
                  <span
                    key={idx}
                    className={`inline-block mx-2 px-3 py-1 rounded-lg transition-all ${
                      pronunciationResults[word.toLowerCase()]
                        ? 'bg-green-200 text-green-800'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {word}
                    {pronunciationResults[word.toLowerCase()] && (
                      <CheckCircle className="w-5 h-5 inline ml-1 text-green-600" />
                    )}
                  </span>
                ))}
              </div>
              
              <div className="flex gap-3">
                {!isListeningWord ? (
                  <button
                    onClick={startWordPractice}
                    className="flex-1 py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 text-white shadow-lg hover:shadow-xl"
                    style={{ backgroundColor: '#6366f1' }}
                  >
                    <Mic className="w-5 h-5" />
                    Start Speaking
                  </button>
                ) : (
                  <button
                    onClick={stopWordPractice}
                    className="flex-1 py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 text-white shadow-lg hover:shadow-xl"
                    style={{ backgroundColor: '#ef4444' }}
                  >
                    <MicOff className="w-5 h-5" />
                    Stop Listening
                  </button>
                )}
                <button
                  onClick={nextPracticeSentence}
                  className="px-6 py-4 rounded-xl font-bold transition-all flex items-center gap-2 shadow text-gray-800"
                  style={{ backgroundColor: '#e5e7eb' }}
                >
                  <RotateCw className="w-5 h-5" />
                  New Text
                </button>
              </div>
            </div>

            {spokenText && (
              <div className="bg-gray-50 rounded-2xl p-6 border-2 border-gray-200 mb-6">
                <h3 className="text-sm font-semibold text-gray-600 mb-2">What you said:</h3>
                <p className="text-lg text-gray-800">{spokenText}</p>
              </div>
            )}

            {practiceWords.length > 0 && (
              <div className="bg-yellow-50 rounded-2xl p-6 border-2 border-yellow-200">
                <div className="flex items-center gap-2 mb-4">
                  <Lightbulb className="w-6 h-6 text-yellow-600" />
                  <h3 className="text-lg font-bold text-yellow-900">Practice These Similar Words</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {practiceWords.map((word, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-xl text-center">
                      <p className="text-2xl font-bold text-gray-800">{word}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-lg mt-6">
              <p className="text-sm text-blue-800">
                <span className="font-bold">💡 Tip:</span> Read the text slowly. Words will turn green when you pronounce them correctly!
              </p>
            </div>
          </div>
        )}

        {/* Recording Section */}
        {(mode === "practice" || mode === "analyze") && (
          <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 mb-6">
            <div className="text-center space-y-6">
            
            {/* Recording Button */}
            <div className="relative inline-block">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isRecording
                    ? "bg-gradient-to-r from-red-500 to-pink-500 animate-pulse shadow-2xl"
                    : "bg-gradient-to-r from-indigo-500 to-purple-500 hover:shadow-2xl hover:scale-110"
                }`}
              >
                {isRecording ? (
                  <MicOff className="w-16 h-16 text-white" />
                ) : (
                  <Mic className="w-16 h-16 text-white" />
                )}
              </button>
              {isRecording && (
                <div className="absolute -inset-2 border-4 border-red-500 rounded-full animate-ping"></div>
              )}
            </div>

            <div>
              <p className="text-xl font-bold text-gray-800 mb-1">
                {isRecording ? "Recording... Click to Stop" : "Click to Start Recording"}
              </p>
              <p className="text-sm text-gray-500">
                {isRecording ? "Speak clearly into your microphone" : "Record yourself speaking for analysis"}
              </p>
            </div>

            {/* Live Transcript */}
            {transcript && (
              <div className="bg-gray-50 rounded-2xl p-6 border-2 border-gray-200">
                <h3 className="text-sm font-semibold text-gray-600 mb-2">Live Transcript:</h3>
                <p className="text-lg text-gray-800 leading-relaxed">{transcript}</p>
              </div>
            )}

            {/* Recorded Audio Playback */}
            {recordedAudio && !isRecording && (
              <div className="space-y-4">
                <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-4">
                  <div className="flex items-center gap-3 justify-center mb-3">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <p className="text-green-800 font-semibold">Recording Complete!</p>
                  </div>
                  <audio src={recordedAudio} controls className="w-full" />
                </div>

                <button
                  onClick={analyzeWithAI}
                  disabled={loading}
                  className="w-full py-4 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white rounded-2xl font-bold text-lg hover:shadow-2xl hover:scale-105 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                      Analyzing Your Speech...
                    </>
                  ) : (
                    <>
                      <TrendingUp className="w-6 h-6" />
                      Analyze My Speech
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 mb-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="text-red-600 font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Analysis Results */}
        {analysis && (
          <div className="space-y-4">
            
            {/* Fluency Score */}
            <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Your Fluency Score</h3>
                <div className="relative inline-block">
                  <div className="text-6xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    {analysis.fluencyScore}
                  </div>
                  <div className="text-xl text-gray-500">/100</div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4 mt-4">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-purple-500 h-4 rounded-full transition-all duration-1000"
                    style={{ width: `${analysis.fluencyScore}%` }}
                  ></div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
                  <p className="text-sm text-blue-600 font-semibold mb-1">Word Count</p>
                  <p className="text-3xl font-bold text-blue-800">{analysis.wordCount}</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-4 border-2 border-purple-200">
                  <p className="text-sm text-purple-600 font-semibold mb-1">Speaking Rate</p>
                  <p className="text-3xl font-bold text-purple-800">{analysis.speakingRate} <span className="text-sm">wpm</span></p>
                </div>
              </div>
            </div>

            {/* Strengths */}
            {analysis.strengths.length > 0 && (
              <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-teal-500 rounded-xl flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800">Your Strengths! 🌟</h3>
                </div>
                <div className="space-y-3">
                  {analysis.strengths.map((strength, idx) => (
                    <div key={idx} className="flex items-start gap-3 bg-green-50 p-4 rounded-xl border-2 border-green-200">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <p className="text-gray-800">{strength}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggestions */}
            {analysis.suggestions.length > 0 && (
              <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center">
                    <Lightbulb className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800">Tips to Improve 💡</h3>
                </div>
                <div className="space-y-3">
                  {analysis.suggestions.map((suggestion, idx) => (
                    <div key={idx} className="flex items-start gap-3 bg-yellow-50 p-4 rounded-xl border-2 border-yellow-200">
                      <Lightbulb className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <p className="text-gray-800">{suggestion}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Issues (if any) */}
            {analysis.issues.length > 0 && (
              <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800">Areas to Practice 📝</h3>
                </div>
                <div className="space-y-3">
                  {analysis.issues.map((issue, idx) => (
                    <div key={idx} className="flex items-start gap-3 bg-blue-50 p-4 rounded-xl border-2 border-blue-200">
                      <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <p className="text-gray-800">{issue}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Try Again Button */}
            <button
              onClick={() => {
                setRecordedAudio(null);
                setTranscript("");
                setAnalysis(null);
                setError("");
              }}
              className="w-full py-4 bg-gray-100 text-gray-700 rounded-2xl font-semibold hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
            >
              <RotateCw className="w-5 h-5" />
              Practice Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}