// components/Emotion.tsx
"use client";

import { useState, useEffect, useRef, useCallback, createContext, useContext, ReactNode } from "react";
import Webcam from "react-webcam";
import { Brain, Camera, Activity, Eye, EyeOff } from "lucide-react";
import * as faceapi from "face-api.js";
import { toast } from "@/lib/toast";

export type EmotionType =
  | "happy"
  | "sad"
  | "stress"
  | "fearful"
  | "surprised"
  | "neutral"
  | "disgusted"
  | "confused"; // Added confusion

export interface EmotionData {
  emotion: EmotionType;
  timestamp: number;
  engagement: number;
  stress: number;
  confidence: number;
}

const EMOTION_MAPPING: Record<EmotionType, { engagement: number; stress: number }> = {
  happy: { engagement: 0.9, stress: 0.1 },
  neutral: { engagement: 0.6, stress: 0.3 },
  surprised: { engagement: 0.7, stress: 0.4 },
  sad: { engagement: 0.4, stress: 0.6 },
  stress: { engagement: 0.3, stress: 0.8 },
  fearful: { engagement: 0.2, stress: 0.9 },
  disgusted: { engagement: 0.35, stress: 0.75 },
  confused: { engagement: 0.5, stress: 0.6 }, // Added confusion mapping
};

// ----------------------- CONTEXT -----------------------

interface EmotionContextType {
  isTracking: boolean;
  currentEmotion: EmotionType;
  emotionHistory: EmotionData[];
  averageEngagement: number;
  averageStress: number;
}

const EmotionContext = createContext<EmotionContextType>({
  isTracking: false,
  currentEmotion: "neutral",
  emotionHistory: [],
  averageEngagement: 0.6,
  averageStress: 0.3,
});

export const useEmotion = () => useContext(EmotionContext);

export const EmotionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isTracking, setIsTracking] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState<EmotionType>("neutral");
  const [emotionHistory, setEmotionHistory] = useState<EmotionData[]>([]);

  const getAverageEngagement = useCallback(() => {
    if (!emotionHistory.length) return 0.6;
    const recent = emotionHistory.slice(-6);
    return recent.reduce((sum, e) => sum + e.engagement, 0) / recent.length;
  }, [emotionHistory]);

  const getAverageStress = useCallback(() => {
    if (!emotionHistory.length) return 0.3;
    const recent = emotionHistory.slice(-6);
    return recent.reduce((sum, e) => sum + e.stress, 0) / recent.length;
  }, [emotionHistory]);

  useEffect(() => {
    (window as any).__emotionContext = {
      setTracking: setIsTracking,
      setEmotion: setCurrentEmotion,
      addToHistory: (data: EmotionData) => {
        setEmotionHistory(prev => [...prev.slice(-19), data]);
      },
    };
  }, []);

  const value: EmotionContextType = {
    isTracking,
    currentEmotion,
    emotionHistory,
    averageEngagement: getAverageEngagement(),
    averageStress: getAverageStress(),
  };

  return <EmotionContext.Provider value={value}>{children}</EmotionContext.Provider>;
};

// ----------------------- TRACKER -----------------------

export function EmotionTracker() {
  const webcamRef = useRef<Webcam>(null);
  const [emotion, setEmotion] = useState<EmotionType>("neutral");
  const [error, setError] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [isRealtimeMode, setIsRealtimeMode] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { emotionHistory, averageEngagement, averageStress } = useEmotion();

  // Load SSD MobileNet + Face Expression models
  useEffect(() => {
    const loadModels = async () => {
      try {
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri("/models"),
          faceapi.nets.faceExpressionNet.loadFromUri("/models"),
        ]);
        setModelsLoaded(true);
        console.log("Face-API SSD MobileNetV1 models loaded");
      } catch (err) {
        setError("Failed to load face-api models");
        console.error(err);
      }
    };

    loadModels();
    return () => stopRealtimeDetection();
  }, []);

  const detectEmotion = useCallback(async () => {
    if (!webcamRef.current?.video) return;
    const video = webcamRef.current.video;

    try {
      const detections = await faceapi.detectSingleFace(video).withFaceExpressions();

      if (!detections || !detections.expressions) {
        setEmotion("neutral");
        return;
      }

      const expressions = detections.expressions;

      // Sort expressions by confidence descending
      const sorted = Object.entries(expressions).sort((a, b) => b[1] - a[1]);
    // Map angry to stress first
let topEmotion = sorted[0][0];
const topConfidence = sorted[0][1];

if (topEmotion === "angry") {
  topEmotion = "stress";
}

// Confusion detection: top 2 emotions close in confidence (<0.15 diff)
const secondConfidence = sorted[1]?.[1] || 0;
// Only mark confused if top emotion is NOT stress
if (topEmotion !== "stress" && topConfidence - secondConfidence < 0.15) {
  topEmotion = "confused";
}

const typedEmotion = topEmotion as EmotionType;


      setEmotion(typedEmotion);

      const ctx = (window as any).__emotionContext;
      if (ctx) {
        ctx.setEmotion(typedEmotion);
        ctx.addToHistory({
          emotion: typedEmotion,
          timestamp: Date.now(),
          engagement: EMOTION_MAPPING[typedEmotion]?.engagement || 0.6,
          stress: EMOTION_MAPPING[typedEmotion]?.stress || 0.3,
          confidence: topConfidence,
        });
      }
    } catch (err) {
      console.error("Detection error:", err);
      setError("Detection failed");
    }
  }, []);

  const toggleCamera = () => {
    setShowCamera(!showCamera);
    if (!showCamera) setTimeout(() => detectEmotion(), 1000);
    else stopRealtimeDetection();
  };

  const toggleRealtimeMode = () => {
    if (isRealtimeMode) stopRealtimeDetection();
    else startRealtimeDetection();
  };

  const startRealtimeDetection = () => {
    if (!modelsLoaded) return toast.error("Models not loaded yet");
    setIsRealtimeMode(true);
    const ctx = (window as any).__emotionContext;
    if (ctx) ctx.setTracking(true);

    detectionIntervalRef.current = setInterval(() => detectEmotion(), 600);
    toast.success("Real-time emotion tracking started");
  };

  const stopRealtimeDetection = () => {
    setIsRealtimeMode(false);
    const ctx = (window as any).__emotionContext;
    if (ctx) ctx.setTracking(false);
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    toast.info("Real-time emotion tracking stopped");
  };

  const getEmoji = (e: string) => {
    const map: Record<string, string> = {
      happy: "😊",
      sad: "😢",
      stress: "😰",
      fearful: "😨",
      surprised: "😮",
      neutral: "😐",
      disgusted: "🤢",
      confused: "🧠", // Confusion emoji
    };
    return map[e] || "😐";
  };

  return (
    <div className="flex flex-col gap-4 p-4 glass rounded-lg animate-fade-in">
      <h3 className="text-sm font-medium mb-1 flex items-center gap-2">
        <Brain className="h-4 w-4 text-primary" /> Emotion Detection
        {isRealtimeMode && (
          <span className="ml-auto flex items-center gap-1 text-xs text-green-600">
            <Activity className="w-3 h-3 animate-pulse" /> Live
          </span>
        )}
      </h3>

      <button
        onClick={toggleCamera}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-secondary/50 transition-colors"
      >
        <Camera className="h-4 w-4" /> {showCamera ? "Hide Camera" : "Start Detection"}
      </button>

      {showCamera && (
        <div className="space-y-3">
          <Webcam
            ref={webcamRef}
            audio={false}
            mirrored
            screenshotFormat="image/jpeg"
            videoConstraints={{ facingMode: "user" }}
            className="rounded-lg w-full border border-border"
            onUserMediaError={() => setError("Webcam access denied")}
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{getEmoji(emotion)}</span>
              <div>
                <p className="font-bold text-gray-900 capitalize">{emotion}</p>
                <p className="text-xs text-gray-600">Current Emotion</p>
              </div>
            </div>

            {isRealtimeMode && (
              <div className="grid grid-cols-2 gap-2">
                <div className="px-3 py-2 rounded-lg bg-green-100 text-green-700">
                  <p className="text-xs font-medium">Engagement</p>
                  <p className="text-lg font-bold">{(averageEngagement * 100).toFixed(0)}%</p>
                </div>
                <div className="px-3 py-2 rounded-lg bg-red-100 text-red-700">
                  <p className="text-xs font-medium">Stress</p>
                  <p className="text-lg font-bold">{(averageStress * 100).toFixed(0)}%</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={toggleRealtimeMode}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                isRealtimeMode
                  ? "bg-red-500 hover:bg-red-600 text-white"
                  : "bg-purple-500 hover:bg-purple-600 text-white"
              }`}
            >
              {isRealtimeMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {isRealtimeMode ? "Stop" : "Start"} Real-time
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
