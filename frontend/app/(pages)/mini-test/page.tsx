"use client";

import React, { useState, useEffect } from "react";
import { Loader2, Download, ArrowLeft, AlertCircle, FileText, Clock, Award } from "lucide-react";
import Link from "next/link";
import jsPDF from "jspdf";

interface MiniTestQuestion {
  question: string;
  answer?: string;
  explanation?: string;
}

export default function MiniTestPage() {
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<MiniTestQuestion[]>([]);
  const [theory, setTheory] = useState("");
  const [topic, setTopic] = useState("");
  const [cognitiveProfile, setCognitiveProfile] = useState<any>(null);
  const [error, setError] = useState("");
  const [backendUrl, setBackendUrl] = useState("http://localhost:8000");

  useEffect(() => {
    initializeMiniTest();
  }, []);

  /* ================= BACKEND HEALTH ================= */

  const checkBackendHealth = async (): Promise<boolean> => {
    const urls = ["http://localhost:8000", "http://127.0.0.1:8000"];

    for (const url of urls) {
      try {
        const res = await fetch(`${url}/api/health`, {
          method: "GET",
          signal: AbortSignal.timeout(3000),
        });
        if (res.ok) {
          setBackendUrl(url);
          return true;
        }
      } catch {}
    }
    return false;
  };

  /* ================= INIT ================= */

  const initializeMiniTest = async () => {
    const backendAvailable = await checkBackendHealth();

    if (!backendAvailable) {
      setError("Backend server is not running. Please start it with: uvicorn main:app --reload");
      setLoading(false);
      return;
    }

    const cachedTheory = localStorage.getItem("lastTheory");
    const cachedTopic = localStorage.getItem("lastTheoryTopic");

    if (!cachedTheory || cachedTheory.length < 50) {
      setError("No theory content available. Please complete the theory page first.");
      setLoading(false);
      return;
    }

    setTheory(cachedTheory);
    setTopic(cachedTopic || "General Assessment");

    const coursePlan = localStorage.getItem("coursePlan");
    if (coursePlan) {
      try {
        const plan = JSON.parse(coursePlan);
        if (plan.selectedReport) {
          const res = await fetch(`${backendUrl}/api/get-report`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reportName: plan.selectedReport }),
          });
          if (res.ok) {
            const data = await res.json();
            setCognitiveProfile(data.profile);
          }
        }
      } catch {}
    }

    await generateMiniTest(cachedTheory, cachedTopic || "General Assessment", cognitiveProfile);
  };

  /* ================= FETCH MINI TEST ================= */

  const generateMiniTest = async (theoryContent: string, topicName: string, profile: any) => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${backendUrl}/api/mini-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theory: theoryContent,
          topic: topicName,
          cognitiveProfile: profile,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Backend returned ${response.status}: ${text}`);
      }

      const data = await response.json();

      if (!Array.isArray(data.questions)) {
        throw new Error("Invalid response format from backend");
      }

      // 🔥 Normalize: NO OPTIONS, ONLY QUESTIONS
      const safeQuestions: MiniTestQuestion[] = data.questions.map((q: any, i: number) => ({
        question: q.question || `Question ${i + 1}`,
        answer: q.answer || q.correctAnswer || "",
        explanation: q.explanation || "",
      }));

      setQuestions(safeQuestions);
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(
        msg.includes("Failed to fetch")
          ? `Cannot connect to backend at ${backendUrl}. Make sure it's running.`
          : `Failed to generate mini test: ${msg}`
      );
    } finally {
      setLoading(false);
    }
  };

  /* ================= PDF: QUESTION PAPER ================= */

  const generateQuestionPaperPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const maxWidth = pageWidth - 2 * margin;
    let y = margin;

    doc.setDrawColor(0);
    doc.setLineWidth(1);
    doc.rect(margin, y, maxWidth, 35);

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("EDUNEXT ASSESSMENT CENTER", pageWidth / 2, y + 10, { align: "center" });

    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.text("MIRCRO-ASSESSMENT", pageWidth / 2, y + 18, { align: "center" });

    doc.setFontSize(10);
    const yr = new Date().getFullYear();
    doc.text(`Academic Session: ${yr}-${yr + 1}`, pageWidth / 2, y + 25, { align: "center" });

    y += 40;
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Subject/Topic:", margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(topic || "General Knowledge", margin + 35, y);

    doc.setFont("helvetica", "bold");
    doc.text("Class/Grade:", pageWidth / 2 + 10, y);
    doc.setFont("helvetica", "normal");
    doc.text(cognitiveProfile?.grade || "General", pageWidth / 2 + 45, y);

    y += 7;

    doc.setFont("helvetica", "bold");
    doc.text("Date:", margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(new Date().toLocaleDateString("en-GB"), margin + 35, y);

    doc.setFont("helvetica", "bold");
    doc.text("Duration:", pageWidth / 2 + 10, y);
    doc.setFont("helvetica", "normal");
    doc.text(questions.length <= 5 ? "15 minutes" : "30 minutes", pageWidth / 2 + 45, y);

    y += 7;

    doc.setFont("helvetica", "bold");
    doc.text("Maximum Marks:", margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(String(questions.length * 2), margin + 35, y);

    doc.setFont("helvetica", "bold");
    doc.text("Name:", pageWidth / 2 + 10, y);
    doc.setFont("helvetica", "normal");
    doc.line(pageWidth / 2 + 30, y, pageWidth - margin, y);

    y += 10;
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("INSTRUCTIONS:", margin, y);
    y += 6;

    doc.setFont("helvetica", "normal");
    [
      "1. Attempt all questions.",
      "2. All questions carry equal marks (2 marks each).",
      "3. Answer in your own words.",
      "4. Write clearly and legibly.",
    ].forEach((t) => {
      doc.text(t, margin + 5, y);
      y += 5;
    });

    y += 5;
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("SECTION A - SHORT ANSWER QUESTIONS", margin, y);
    y += 8;

    doc.setFontSize(10);
    questions.forEach((q, i) => {
      if (y > pageHeight - 60) {
        doc.addPage();
        y = margin;
      }

      doc.setFont("helvetica", "bold");
      doc.text(`Q${i + 1}.`, margin, y);
      doc.text("[2 marks]", pageWidth - margin - 20, y);
      y += 6;

      doc.setFont("helvetica", "normal");
      const qLines = doc.splitTextToSize(q.question, maxWidth - 10);
      doc.text(qLines, margin + 5, y);
      y += qLines.length * 5 + 12;

      // Space for student answer
      doc.line(margin + 5, y, pageWidth - margin, y);
      y += 10;
      doc.line(margin + 5, y, pageWidth - margin, y);
      y += 10;
    });

    y = pageHeight - 20;
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.text("*** End of Question Paper ***", pageWidth / 2, y, { align: "center" });
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.text("Best of Luck!", pageWidth / 2, y, { align: "center" });

    doc.save(`${topic.replace(/[^a-z0-9]/gi, "_")}_Question_Paper.pdf`);
  };

  /* ================= PDF: ANSWER KEY ================= */

  const generateAnswerKeyPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const maxWidth = pageWidth - 2 * margin;
    let y = margin;

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("ANSWER KEY & MARKING SCHEME", pageWidth / 2, y, { align: "center" });
    y += 10;

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(topic || "General Knowledge", pageWidth / 2, y, { align: "center" });
    y += 15;

    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    doc.setFontSize(10);
    questions.forEach((q, i) => {
      if (y > pageHeight - 40) {
        doc.addPage();
        y = margin;
      }

      doc.setFont("helvetica", "bold");
      doc.text(`Q${i + 1}.`, margin, y);
      doc.text("[2 marks]", pageWidth - margin - 20, y);
      y += 6;

      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 128, 0);
      doc.text(`Model Answer: ${q.answer || "—"}`, margin + 5, y);
      doc.setTextColor(0, 0, 0);
      y += 6;

      if (q.explanation) {
        doc.setFont("helvetica", "italic");
        doc.setTextColor(100, 100, 100);
        const explLines = doc.splitTextToSize(`Explanation: ${q.explanation}`, maxWidth - 10);
        doc.text(explLines, margin + 5, y);
        y += explLines.length * 4 + 8;
        doc.setTextColor(0, 0, 0);
      } else {
        y += 8;
      }
    });

    doc.save(`${topic.replace(/[^a-z0-9]/gi, "_")}_Answer_Key.pdf`);
  };

  /* ================= UI ================= */

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-800">Assessment Question Paper</h1>
          <Link
            href="/course"
            className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-800 transition font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Course
          </Link>
        </div>

        {/* Error */}
        {error && !loading && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-bold text-red-900 mb-2">⚠️ Error</h3>
                <p className="text-red-700 text-sm mb-3">{error}</p>

                {error.includes("Backend server") && (
                  <div className="bg-red-100 border border-red-300 rounded-lg p-3 mb-3">
                    <p className="text-xs font-mono text-red-900 mb-2">
                      To start the backend server:
                    </p>
                    <code className="block bg-red-900 text-white px-3 py-2 rounded text-xs">
                      cd edunext<br />
                      uvicorn main:app --reload
                    </code>
                  </div>
                )}

                <div className="flex gap-3 mt-4">
                  <Link
                    href="/theory"
                    className="inline-block px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium text-sm"
                  >
                    Go to Theory
                  </Link>
                  <Link
                    href="/course"
                    className="inline-block px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-medium text-sm"
                  >
                    Back to Course
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12 bg-white rounded-xl shadow-lg">
            <Loader2 className="w-12 h-12 animate-spin text-purple-600 mb-4" />
            <p className="text-gray-600 font-medium">Generating question paper...</p>
            <p className="text-gray-400 text-sm mt-2">Creating assessment questions</p>
          </div>
        )}

        {/* Main */}
        {!loading && !error && questions.length > 0 && (
          <div>
            {/* Info */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6 ">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">📄 Question Paper Details</h2>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="text-sm text-gray-500">Subject</p>
                    <p className="font-semibold text-gray-800">{topic}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="text-sm text-gray-500">Duration</p>
                    <p className="font-semibold text-gray-800">
                      {questions.length <= 5 ? "15 minutes" : "30 minutes"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Award className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="text-sm text-gray-500">Total Marks</p>
                    <p className="font-semibold text-gray-800">{questions.length * 2}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="text-sm text-gray-500">Total Questions</p>
                    <p className="font-semibold text-gray-800">{questions.length}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={generateQuestionPaperPDF}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-4 rounded-xl hover:from-purple-700 hover:to-pink-700 transition font-bold shadow-lg hover:shadow-xl"
                >
                  <Download className="w-5 h-5" />
                  Download Question Paper
                </button>

                <button
                  onClick={generateAnswerKeyPDF}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-teal-600 text-white px-6 py-4 rounded-xl hover:from-green-700 hover:to-teal-700 transition font-bold shadow-lg hover:shadow-xl"
                >
                  <Download className="w-5 h-5" />
                  Download Answer Key
                </button>
              </div>
            </div>

            {/* Preview */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h3 className="text-xl font-bold text-gray-800 mb-6 border-b-2 border-purple-200 pb-2">
                Question Preview
              </h3>

              <div className="space-y-8">
                {questions.map((q, i) => (
                  <div key={i} className="border-l-4 border-gray-300 pl-4">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-bold text-gray-800 text-lg">Q{i + 1}.</h4>
                      <span className="text-sm font-semibold text-purple-600">[2 marks]</span>
                    </div>

                    <p className="text-gray-700 mb-6 ml-6">{q.question}</p>

                    {/* No options — just blank answer lines */}
                    <div className="ml-6 space-y-4">
                      <div className="border-b border-gray-300 w-full h-6" />
                      <div className="border-b border-gray-300 w-full h-6" />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 pt-6 border-t-2 border-gray-200 text-center">
                <p className="text-gray-500 italic">*** End of Question Paper ***</p>
                <p className="text-gray-600 font-medium mt-2">Best of Luck!</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
