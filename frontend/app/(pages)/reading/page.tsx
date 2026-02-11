"use client";
import { useState, useEffect, ChangeEvent, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Upload, X, Keyboard, Volume2, VolumeX, Download, Award, Brain } from 'lucide-react';
import { useEmotion, EmotionTracker } from '@/app/components/Emotion';

interface DyslexiaOptions {
  boldFirstLetter: boolean;
  bionicMode: boolean;
}

interface ReadingMetrics {
  wordsRead: number;
  rereadCount: number;
  pauseCount: number;
  totalTime: number;
  avgSpeed: number;
  comprehensionScore: number;
}

const ADHDReadingMode: React.FC = () => {
  const [text, setText] = useState<string>('');
  const [words, setWords] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [displayWords, setDisplayWords] = useState<string[]>([]);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(2000);
  const [wordsPerGroup, setWordsPerGroup] = useState<number>(3);
  const [boldFirstLetter, setBoldFirstLetter] = useState<boolean>(false);
  const [bionicMode, setBionicMode] = useState<boolean>(true);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(false);
  const [backgroundMode, setBackgroundMode] = useState<'solid' | 'gradient' | 'calm'>('calm');
  const [showKeyboardHelp, setShowKeyboardHelp] = useState<boolean>(false);
  
  // Metrics tracking
  const [metrics, setMetrics] = useState<ReadingMetrics>({
    wordsRead: 0,
    rereadCount: 0,
    pauseCount: 0,
    totalTime: 0,
    avgSpeed: 2000,
    comprehensionScore: 0
  });
  const startTimeRef = useRef<number>(0);
  
  // Emotion integration
  const { emotionHistory, averageStress, isTracking } = useEmotion();
  const stressAdaptCooldown = useRef(false);
  const [adaptationMessage, setAdaptationMessage] = useState<string | null>(null);
  
  // Voice synthesis
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  
  // Bionic Reading: bold first half of word
  const processDyslexiaText = (word: string, options: DyslexiaOptions): string => {
    if (!word) return '';
    
    let processed = word;
    
    if (options.bionicMode && word.length > 2) {
      const boldCount = Math.ceil(word.length / 2);
      const boldPart = word.slice(0, boldCount);
      const regularPart = word.slice(boldCount);
      processed = `<strong>${boldPart}</strong>${regularPart}`;
    } else if (options.boldFirstLetter && word.length > 0) {
      processed = `<strong>${word[0]}</strong>${word.slice(1)}`;
    }
    
    return processed;
  };
  
  // Stress-based adaptation
  useEffect(() => {
    if (!isActive || !isTracking || stressAdaptCooldown.current) return;
    
    const latestEmotion = emotionHistory[emotionHistory.length - 1];
    if (!latestEmotion) return;
    
    // High stress: slow down DRAMATICALLY
    if (latestEmotion.stress > 0.7) {
      stressAdaptCooldown.current = true;
      const oldSpeed = speed;
      const newSpeed = Math.min(5000, speed + 1000); // +1 second instead of 0.5
      setSpeed(newSpeed);
      
      // Show adaptation message
      setAdaptationMessage(`⚠️ High stress detected! Slowing down: ${oldSpeed/1000}s → ${newSpeed/1000}s`);
      setTimeout(() => setAdaptationMessage(null), 5000);
      
      setTimeout(() => {
        stressAdaptCooldown.current = false;
      }, 8000); // Longer cooldown
    }
    
    // Low stress + high engagement: speed up
    if (latestEmotion.stress < 0.3 && latestEmotion.engagement > 0.7) {
      const oldSpeed = speed;
      const newSpeed = Math.max(1000, speed - 300);
      setSpeed(newSpeed);
      
      // Show adaptation message
      setAdaptationMessage(`✨ Great focus! Speeding up: ${oldSpeed/1000}s → ${newSpeed/1000}s`);
      setTimeout(() => setAdaptationMessage(null), 4000);
    }
  }, [emotionHistory, isActive, isTracking, speed]);
  
  useEffect(() => {
    if (text) {
      const wordArray = text.split(/\s+/).filter(w => w.length > 0);
      setWords(wordArray);
    }
  }, [text]);
  
  useEffect(() => {
    if (!isActive || words.length === 0) {
      setDisplayWords([]);
      return;
    }
    
    const startIndex = currentIndex;
    const endIndex = Math.min(startIndex + wordsPerGroup, words.length);
    const currentWords = words.slice(startIndex, endIndex).map(word => 
      processDyslexiaText(word, { boldFirstLetter, bionicMode })
    );
    
    setDisplayWords(currentWords);
    
    // Voice output
    if (voiceEnabled && currentWords.length > 0) {
      const plainText = currentWords.map(w => w.replace(/<[^>]*>/g, '')).join(' ');
      utteranceRef.current = new SpeechSynthesisUtterance(plainText);
      utteranceRef.current.rate = 0.85;
      utteranceRef.current.pitch = 1;
      window.speechSynthesis.speak(utteranceRef.current);
    }
    
    if (!isPaused) {
      const timer = setTimeout(() => {
        if (currentIndex + wordsPerGroup < words.length) {
          setCurrentIndex(prevIndex => prevIndex + wordsPerGroup);
          setMetrics(prev => ({ ...prev, wordsRead: prev.wordsRead + wordsPerGroup }));
        } else {
          setCurrentIndex(0);
        }
      }, speed);
      
      return () => clearTimeout(timer);
    }
  }, [currentIndex, words, isActive, wordsPerGroup, isPaused, speed, boldFirstLetter, bionicMode, voiceEnabled]);
  
  // Keyboard shortcuts
  useEffect(() => {
    if (!isActive) return;
    
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        togglePause();
      }
      if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handlePrevGroup();
      }
      if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleNextGroup();
      }
      if (e.code === 'ArrowUp') {
        e.preventDefault();
        setSpeed(prev => Math.max(1000, prev - 500));
      }
      if (e.code === 'ArrowDown') {
        e.preventDefault();
        setSpeed(prev => Math.min(5000, prev + 500));
      }
      if (e.code === 'KeyV') {
        e.preventDefault();
        setVoiceEnabled(prev => !prev);
      }
      if (e.code === 'Escape') {
        e.preventDefault();
        stopReading();
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isActive, speed]);
  
  const handlePrevGroup = (): void => {
    setCurrentIndex(prevIndex => Math.max(0, prevIndex - wordsPerGroup));
    setMetrics(prev => ({ ...prev, rereadCount: prev.rereadCount + 1 }));
    
    // Auto-slow if struggling
    if (metrics.rereadCount > 3) {
      setSpeed(prev => Math.min(4000, prev + 500));
    }
  };
  
  const handleNextGroup = (): void => {
    setCurrentIndex(prevIndex => Math.min(words.length - 1, prevIndex + wordsPerGroup));
  };
  
  const togglePause = (): void => {
    setIsPaused(!isPaused);
    setMetrics(prev => ({ ...prev, pauseCount: prev.pauseCount + 1 }));
    
    if (voiceEnabled) {
      window.speechSynthesis.cancel();
    }
  };
  
  const startReading = (): void => {
    if (words.length > 0) {
      setIsActive(true);
      setCurrentIndex(0);
      setIsPaused(false);
      startTimeRef.current = Date.now();
      setMetrics({
        wordsRead: 0,
        rereadCount: 0,
        pauseCount: 0,
        totalTime: 0,
        avgSpeed: speed,
        comprehensionScore: 0
      });
    }
  };
  
  const stopReading = (): void => {
    setIsActive(false);
    setCurrentIndex(0);
    setIsPaused(false);
    
    const totalTime = Date.now() - startTimeRef.current;
    setMetrics(prev => ({ ...prev, totalTime }));
    
    if (voiceEnabled) {
      window.speechSynthesis.cancel();
    }
  };
  
  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file && file.type === 'text/plain') {
      const reader = new FileReader();
      reader.onload = (event: ProgressEvent<FileReader>) => {
        const result = event.target?.result;
        if (typeof result === 'string') {
          setText(result);
        }
      };
      reader.readAsText(file);
    }
  };
  
  const exportReport = () => {
    const report = {
      ...metrics,
      wordsPerMinute: metrics.totalTime > 0 ? Math.round((metrics.wordsRead / metrics.totalTime) * 60000) : 0,
      rereadRate: metrics.wordsRead > 0 ? ((metrics.rereadCount / metrics.wordsRead) * 100).toFixed(1) : 0,
      timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reading-report-${Date.now()}.json`;
    a.click();
  };
  
  const progress = words.length <= wordsPerGroup 
    ? 100 
    : Math.min(100, (currentIndex / (words.length - wordsPerGroup)) * 100);
  
  const getWordColor = (index: number): string => {
    const colors = [
      "text-purple-600", "text-purple-700", "text-purple-800",
      "text-indigo-600", "text-indigo-700", "text-violet-600"
    ];
    return colors[index % colors.length];
  };
  
  const backgrounds = {
    solid: 'bg-purple-200',
    gradient: 'bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100',
    calm: 'bg-gradient-to-b from-slate-50 to-slate-100'
  };
  
  return (
    <div className={`min-h-screen ${backgrounds[backgroundMode]} p-8 transition-colors duration-500 `}>
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - 2 columns */}
        <div className="lg:col-span-2">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-purple-900 mb-2">🧠 ADHD Reading Mode</h1>
          <p className="text-purple-700">AI-Powered adaptive reading with emotion tracking</p>
          {isTracking && (
            <div className="mt-2 inline-flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm animate-pulse">
              <Brain className="w-4 h-4" />
              Emotion tracking active - Speed auto-adjusting
            </div>
          )}
        </div>
        
        {!isActive ? (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="mb-6">
              <label className="block text-sm font-medium text-purple-900 mb-2">
                Paste or upload your text
              </label>
              <textarea
                value={text}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setText(e.target.value)}
                placeholder="Paste your text here or upload a .txt file..."
                className="w-full h-64 p-4 border-2 border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              />
            </div>
            
            <div className="mb-6">
              <label className="flex items-center gap-2 text-sm text-purple-900 mb-4 cursor-pointer hover:text-purple-700">
                <input
                  type="file"
                  accept=".txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Upload className="w-5 h-5" />
                Upload .txt file
              </label>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-purple-900 mb-2">
                  Words per group: {wordsPerGroup}
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={wordsPerGroup}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setWordsPerGroup(Number(e.target.value))}
                  className="w-full accent-purple-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-purple-900 mb-2">
                  Speed: {speed / 1000}s
                </label>
                <input
                  type="range"
                  min="1000"
                  max="5000"
                  step="500"
                  value={speed}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setSpeed(Number(e.target.value))}
                  className="w-full accent-purple-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-purple-900 mb-2">
                  Background mode
                </label>
                <select
                  value={backgroundMode}
                  onChange={(e) => setBackgroundMode(e.target.value as any)}
                  className="w-full p-2 border-2 border-purple-300 rounded-lg"
                >
                  <option value="calm">Calm (Minimal)</option>
                  <option value="solid">Solid Purple</option>
                  <option value="gradient">Vibrant Gradient</option>
                </select>
              </div>
              
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bionicMode}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setBionicMode(e.target.checked)}
                    className="w-4 h-4 accent-purple-500"
                  />
                  <span className="text-sm text-purple-900">Bionic Reading Mode</span>
                </label>
                
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={boldFirstLetter}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setBoldFirstLetter(e.target.checked)}
                    className="w-4 h-4 accent-purple-500"
                  />
                  <span className="text-sm text-purple-900">Bold first letter only</span>
                </label>
              </div>
            </div>
            
            <button
              onClick={startReading}
              disabled={words.length === 0}
              className="w-full bg-purple-500 hover:bg-purple-600 disabled:bg-purple-300 text-white font-semibold py-4 rounded-lg transition-colors duration-200"
            >
              Start Reading
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl p-8 relative overflow-visible">
            <button
              onClick={stopReading}
              className="absolute -top-6 right-4 p-2 hover:bg-purple-100 rounded-full transition-colors z-10"
            >
              <X className="w-6 h-6 text-purple-700 " />
            </button>
            
            {/* Adaptation Message - RIGHT SIDE */}
            {adaptationMessage && (
              <div className="fixed top-32 right-8 z-[9999] animate-slideRight w-auto max-w-md">
                <div className={`px-10 py-6 rounded-2xl shadow-2xl text-center font-black text-2xl border-4 ${
                  adaptationMessage.includes('stress') 
                    ? 'bg-red-500  text-white border-red-700 ring-8 ring-red-300/50' 
                    : 'bg-green-500 text-white border-green-700 ring-8 ring-green-300/50'
                }`}>
                  <div className="flex items-center justify-center gap-3">
                    {adaptationMessage.includes('stress') ? (
                      <span className="text-4xl animate-pulse">😰</span>
                    ) : (
                      <span className="text-4xl animate-bounce">✨</span>
                    )}
                    <span>{adaptationMessage}</span>
                  </div>
                </div>
              </div>
            )}
            
            <div className="relative w-full h-2 bg-purple-200 mb-12 rounded-full overflow-hidden">
              <div 
                className="absolute h-full bg-purple-500 transition-all duration-300" 
                style={{ width: `${progress}%` }}
              />
            </div>
            
            <div className="min-h-[300px] flex flex-col items-center justify-center mb-8">
              {displayWords.map((word, index) => (
                <div 
                  key={index} 
                  className={`text-6xl font-bold mb-4 animate-fadeIn ${getWordColor(index + currentIndex)}`}
                  style={{
                    animationDelay: `${index * 0.1}s`,
                  }}
                  dangerouslySetInnerHTML={{ __html: word }}
                />
              ))}
            </div>
            
            {/* Context view */}
            <div className="mt-4 p-4 bg-purple-50 rounded-lg max-h-32 overflow-y-auto text-sm">
              {words.map((word, idx) => (
                <span 
                  key={idx}
                  className={idx >= currentIndex && idx < currentIndex + wordsPerGroup 
                    ? "bg-yellow-200 font-bold px-1" 
                    : "text-gray-600"}
                >
                  {word}{' '}
                </span>
              ))}
            </div>
            
            <div className="flex gap-4 justify-center mt-6">
              <button 
                onClick={handlePrevGroup}
                disabled={currentIndex === 0}
                className="bg-purple-500 hover:bg-purple-600 disabled:bg-purple-300 text-white p-4 rounded-full transition-colors"
              >
                <SkipBack className="h-6 w-6" />
              </button>
              
              <button 
                onClick={togglePause}
                className="bg-purple-500 hover:bg-purple-600 text-white p-4 rounded-full transition-colors"
              >
                {isPaused ? <Play className="h-6 w-6" /> : <Pause className="h-6 w-6" />}
              </button>
              
              <button 
                onClick={handleNextGroup}
                disabled={currentIndex + wordsPerGroup >= words.length}
                className="bg-purple-500 hover:bg-purple-600 disabled:bg-purple-300 text-white p-4 rounded-full transition-colors"
              >
                <SkipForward className="h-6 w-6" />
              </button>
              
              <button 
                onClick={() => setVoiceEnabled(!voiceEnabled)}
                className={`${voiceEnabled ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-400 hover:bg-gray-500'} text-white p-4 rounded-full transition-colors`}
              >
                {voiceEnabled ? <Volume2 className="h-6 w-6" /> : <VolumeX className="h-6 w-6" />}
              </button>
            </div>
            
            {/* Metrics */}
            <div className="mt-6 grid grid-cols-4 gap-3">
              <div className="bg-blue-50 p-3 rounded-lg text-center">
                <p className="text-xs text-blue-600">Words Read</p>
                <p className="text-2xl font-bold text-blue-700">{metrics.wordsRead}</p>
              </div>
              <div className="bg-orange-50 p-3 rounded-lg text-center">
                <p className="text-xs text-orange-600">Rereads</p>
                <p className="text-2xl font-bold text-orange-700">{metrics.rereadCount}</p>
              </div>
              <div className="bg-green-50 p-3 rounded-lg text-center">
                <p className="text-xs text-green-600">Pauses</p>
                <p className="text-2xl font-bold text-green-700">{metrics.pauseCount}</p>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg text-center">
                <p className="text-xs text-purple-600">Speed</p>
                <p className="text-2xl font-bold text-purple-700">{speed/1000}s</p>
              </div>
            </div>
            
            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setShowKeyboardHelp(!showKeyboardHelp)}
                className="flex-1 text-purple-700 hover:bg-purple-50 py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-2"
              >
                <Keyboard className="w-4 h-4" />
                Shortcuts
              </button>
              
              <button
                onClick={exportReport}
                className="flex-1 text-purple-700 hover:bg-purple-50 py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export Report
              </button>
            </div>
            
            {showKeyboardHelp && (
              <div className="mt-4 p-4 bg-purple-50 rounded-lg text-sm">
                <h4 className="font-bold mb-2">Keyboard Shortcuts:</h4>
                <ul className="space-y-1 text-gray-700">
                  <li><kbd className="bg-white px-2 py-1 rounded">Space</kbd> - Pause/Play</li>
                  <li><kbd className="bg-white px-2 py-1 rounded">←</kbd> - Previous group</li>
                  <li><kbd className="bg-white px-2 py-1 rounded">→</kbd> - Next group</li>
                  <li><kbd className="bg-white px-2 py-1 rounded">↑</kbd> - Speed up</li>
                  <li><kbd className="bg-white px-2 py-1 rounded">↓</kbd> - Slow down</li>
                  <li><kbd className="bg-white px-2 py-1 rounded">V</kbd> - Toggle voice</li>
                  <li><kbd className="bg-white px-2 py-1 rounded">Esc</kbd> - Exit</li>
                </ul>
              </div>
            )}
          </div>
        )}
        
        <style jsx>{`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          @keyframes slideDown {
            from {
              opacity: 0;
              transform: translate(-50%, -30px) scale(0.9);
            }
            to {
              opacity: 1;
              transform: translate(-50%, 0) scale(1);
            }
          }
          
          @keyframes slideRight {
            from {
              opacity: 0;
              transform: translateX(100px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
          
          .animate-fadeIn {
            animation: fadeIn 0.3s ease-out forwards;
          }
          
          .animate-slideDown {
            animation: slideDown 0.5s ease-out forwards;
          }
        `}</style>
      </div>

      
      {/* Emotion Tracker Sidebar - 1 column */}
      <div className="lg:col-span-1 mt-35">
        <div className=" bg-white rounded-2xl shadow-xl p-1">          
          <EmotionTracker />
          
          {isActive && averageStress > 0.6 && (
            <div className="mt-4 mx-4 mb-4 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
              <p className="text-sm font-medium text-yellow-800">
                ⚠️ High stress detected! Speed reduced automatically.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
  );
};

export default ADHDReadingMode;