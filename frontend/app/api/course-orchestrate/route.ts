import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { readdir, readFile, stat } from "fs/promises";
import { join } from "path";

type LearningStep = {
  title: string;
  desc: string;
};

type LearningMode = "adhd" | "dyslexia" | "autism" | "general";

type OrchestratedPlan = {
  steps: LearningStep[];
  flashcardMode: LearningMode;
};

const ai = new GoogleGenAI({
  apiKey: process.env.GENAI_API_KEY!,
});

const DEFAULT_PLAN: OrchestratedPlan = {
  steps: [
    { title: "Theory", desc: "Learn concepts with examples" },
    { title: "Quiz", desc: "Practice with MCQs" },
    { title: "Flashcards", desc: "Revise important terms" },
    { title: "Mini Test", desc: "Check understanding" },
  ],
  flashcardMode: "general",
};

const isLearningMode = (value: string): value is LearningMode =>
  value === "adhd" || value === "dyslexia" || value === "autism" || value === "general";

const getLatestProfile = async () => {
  const reportsPath = join(process.cwd(), "..", "backend", "reports");
  const files = (await readdir(reportsPath)).filter((file) => file.endsWith(".json"));
  if (files.length === 0) return null;

  const stats = await Promise.all(
    files.map(async (file) => ({
      file,
      mtime: (await stat(join(reportsPath, file))).mtimeMs,
    }))
  );

  stats.sort((a, b) => b.mtime - a.mtime);
  const latestFile = stats[0]?.file;
  if (!latestFile) return null;

  const raw = await readFile(join(reportsPath, latestFile), "utf-8");
  return JSON.parse(raw);
};

const getProfileByName = async (reportName: string) => {
  const reportsPath = join(process.cwd(), "..", "backend", "reports");
  const filePath = join(reportsPath, `${reportName}.json`);
  try {
    const raw = await readFile(filePath, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Failed to read report ${reportName}:`, err);
    return null;
  }
};

const determineFlashcardMode = (profile: any): LearningMode => {
  if (!profile || !profile.cognitiveScores) return "general";

  const scores = profile.cognitiveScores;
  const { visualSpatial = 0, workingMemory = 0, attention = 0, auditoryProcessing = 0, reasoning = 0 } = scores;

  // ADHD indicators: Very low attention, low impulse control
  if (attention < 30) {
    return "adhd";
  }

  // Dyslexia indicators: Low visual-spatial but high auditory processing
  if (visualSpatial < 40 && auditoryProcessing > 60) {
    return "dyslexia";
  }

  // Autism spectrum indicators: Very high attention detail, uneven cognitive profile
  if (attention > 70 && Math.abs(visualSpatial - workingMemory) > 30) {
    return "autism";
  }

  // Default for balanced profiles
  return "general";
};

const coercePlan = (plan: Partial<OrchestratedPlan> | null): OrchestratedPlan => {
  if (!plan) return DEFAULT_PLAN;

  const steps = Array.isArray(plan.steps) && plan.steps.length > 0
    ? plan.steps.map((step) => ({
        title: String(step.title ?? "Step"),
        desc: String(step.desc ?? "").trim() || "Continue learning",
      }))
    : DEFAULT_PLAN.steps;

  const flashcardMode = typeof plan.flashcardMode === "string" && isLearningMode(plan.flashcardMode)
    ? plan.flashcardMode
    : DEFAULT_PLAN.flashcardMode;

  return { steps, flashcardMode };
};

export async function POST(req: NextRequest) {
  try {
    const { topic, pdfText, selectedReport } = await req.json();
    const inputText = String(pdfText || topic || "").trim();

    if (!inputText) {
      return NextResponse.json(DEFAULT_PLAN, { status: 200 });
    }

    // Get the selected profile if specified, otherwise get latest
    let profile = null;
    if (selectedReport) {
      profile = await getProfileByName(selectedReport);
    } else {
      profile = await getLatestProfile();
    }

    const prompt = `You are an educational planner. Using the student cognitive profile JSON and the learning content, create a personalized learning flow.

Return ONLY strict JSON in this exact schema:
{
  "steps": [{"title": "Theory", "desc": "..."}, {"title": "Quiz", "desc": "..."}, {"title": "Flashcards", "desc": "..."}, {"title": "Mini Test", "desc": "..."}],
  "flashcardMode": "adhd" | "dyslexia" | "autism" | "general"
}

CRITICAL Rules:
- EXACTLY 4 steps in this EXACT order: Theory, Quiz, Flashcards, Mini Test
- Do NOT add any other steps or change step names
- Only customize the "desc" field for each step based on the topic
- Keep descriptions short and actionable (5-10 words max)

Flashcard Mode Selection Rules (analyze cognitive scores):
1. If attention < 30: Choose "adhd" (needs shorter, focused flashcards)
2. If visualSpatial < 40 AND auditoryProcessing > 60: Choose "dyslexia" (prefer audio/verbal)
3. If attention > 70 AND large gap between visualSpatial/workingMemory: Choose "autism" (structured detail-oriented)
4. Otherwise: Choose "general"

Cognitive profile JSON:
${JSON.stringify(profile ?? {}, null, 2)}

Learning content:
${inputText}`;

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const raw = String(result.text || "");
    const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    
    // Override flashcardMode with intelligent selection based on profile
    const plan = coercePlan(parsed);
    if (profile && profile.cognitiveScores) {
      plan.flashcardMode = determineFlashcardMode(profile);
    }

    return NextResponse.json(plan, { status: 200 });
  } catch (error) {
    console.error("Course orchestration failed:", error);
    return NextResponse.json(DEFAULT_PLAN, { status: 200 });
  }
}
