"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

export default function CameraPage() {
  const [cameraOn, setCameraOn] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [topic, setTopic] = useState("Water Cycle");
  const [lessonStatus, setLessonStatus] = useState("");
  const imgRef = useRef<HTMLImageElement>(null);

  // Reload stream when camera starts
  useEffect(() => {
    if (cameraOn && imgRef.current) {
      imgRef.current.src = `http://localhost:8000/video?t=${Date.now()}`;
    }
  }, [cameraOn]);

  // ---------------- START LESSON ----------------
  const startLesson = async () => {
    setLessonStatus("Generating lesson...");
    setError("");

    try {
      const res = await fetch("http://localhost:8000/lesson/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lesson failed");

      setLessonStatus(`Lesson ready: ${data.steps} steps`);
    } catch (err: any) {
      console.error(err);
      setError("Failed to start lesson");
      setLessonStatus("");
    }
  };

  // ---------------- CAMERA ----------------
  const startCamera = async () => {
    setStarting(true);
    setError("");
    try {
      const res = await fetch("http://localhost:8000/camera/start", {
        method: "POST",
      });
      if (!res.ok) throw new Error();
      setCameraOn(true);
    } catch {
      setError("Camera backend not reachable");
    } finally {
      setStarting(false);
    }
  };

  const stopCamera = async () => {
    try {
      await fetch("http://localhost:8000/camera/stop", { method: "POST" });
    } catch {}
    setCameraOn(false);
    setStarting(false);
  };

  // ---------------- UI ----------------
  return (
    <div className="min-h-screen p-4 md:p-6 bg-gradient-to-br from-purple-50 to-white">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold text-purple-600 mb-4 text-center">
          AI Interactive Teacher
        </h1>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm md:text-base">
            {error}
          </div>
        )}

        {/* Topic Input */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Enter topic (e.g., Water Cycle)"
            className="flex-1 px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
          <button
            onClick={startLesson}
            className="px-5 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 font-medium shadow"
          >
            Start Lesson
          </button>
        </div>

        {lessonStatus && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg text-sm md:text-base">
            {lessonStatus}
          </div>
        )}

        {/* Main Layout */}
        <div className="flex flex-col lg:flex-row gap-5">
          {/* Video */}
          <div className="w-full lg:w-3/4">
            <div className="relative w-full aspect-[16/9] rounded-lg border-2 border-purple-300 overflow-hidden bg-black shadow-lg">
              {cameraOn ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  ref={imgRef}
                  src={`http://localhost:8000/video?t=${Date.now()}`}
                  alt="Camera feed"
                  className="w-full h-full object-cover"
                  crossOrigin="anonymous"
                  onError={() =>
                    setError("Failed to load camera stream. Is backend running?")
                  }
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white">
                  <div className="w-24 h-24 relative">
                    <Image
                      src="/camera.png"
                      alt="Camera icon"
                      fill
                      className="object-contain"
                      priority
                      unoptimized
                    />
                  </div>
                  <span className="text-gray-700 text-sm md:text-lg font-medium mt-4">
                    {starting ? "Starting camera..." : "Camera is off"}
                  </span>
                </div>
              )}
            </div>

            {/* Camera Buttons */}
            <div className="flex gap-3 mt-4">
              <button
                onClick={cameraOn ? stopCamera : startCamera}
                className="flex-1 px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 font-medium shadow"
                disabled={starting}
              >
                {cameraOn ? "Stop Camera" : starting ? "Starting..." : "Start Camera"}
              </button>
            </div>
          </div>

          {/* Instructions Panel */}
          <div className="w-full lg:w-1/2">
            <div className="w-full h-64 lg:h-full p-4 bg-purple-100 text-gray-800 rounded-lg overflow-y-auto shadow border-2 border-purple-200">
              <h2 className="text-lg font-semibold text-purple-600 mb-2">
                How to interact
              </h2>
              <ul className="list-disc list-inside space-y-2 text-sm md:text-base">
  <li>🌡️ Increase temperature above 25°C → Water starts to evaporate into vapor</li>
  <li>🌬️ Reduce temperature slightly → Vapor begins to condense</li>
  <li>🤲 Shake the cloud with your hand → Vapor collides → Rain / precipitation occurs</li>
  <li>🎧 Listen → AI narration explains each step as you interact</li>
</ul>


              <div className="mt-4 text-gray-700 text-sm md:text-base">
                <p className="font-medium">Topic:</p>
                <p>{topic}</p>
              </div>

              <div className="mt-4 text-xs text-gray-500">
                Tip: Try topics like <b>Water Cycle</b>, <b>Solar System</b>,
                <b>Photosynthesis</b>, <b>Fractions</b>, <b>Human Heart</b>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
